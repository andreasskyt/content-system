// PersonMatte — per-frame person alpha matte using Apple's Vision framework.
//
// Reads a video, runs VNGeneratePersonSegmentationRequest over every frame and
// streams the mask to stdout as raw gray8 at the source resolution, one frame
// after another. scripts/matte.ts pipes that straight into ffmpeg's alphamerge,
// so no intermediate image files are ever written.
//
// Vision runs on the Neural Engine and ships with macOS — no model download and
// no Python/ONNX toolchain. Its weakness is that it segments each frame
// independently with no temporal state, so edges shimmer slightly between
// frames; --smooth in matte.ts blends consecutive masks to damp that.
//
// Usage: PersonMatte <input-video> [--quality fast|balanced|accurate]

import AVFoundation
import CoreImage
import Foundation
import Vision

func fail(_ message: String) -> Never {
    FileHandle.standardError.write("PersonMatte: \(message)\n".data(using: .utf8)!)
    exit(1)
}

let args = CommandLine.arguments
guard args.count >= 2 else { fail("usage: PersonMatte <input-video> [--quality fast|balanced|accurate]") }

let inputPath = args[1]
var quality: VNGeneratePersonSegmentationRequest.QualityLevel = .accurate
if let qIdx = args.firstIndex(of: "--quality"), qIdx + 1 < args.count {
    switch args[qIdx + 1] {
    case "fast": quality = .fast
    case "balanced": quality = .balanced
    case "accurate": quality = .accurate
    default: fail("unknown quality: \(args[qIdx + 1])")
    }
}

let url = URL(fileURLWithPath: inputPath)
guard FileManager.default.fileExists(atPath: inputPath) else { fail("file not found: \(inputPath)") }

let asset = AVURLAsset(url: url)

let semaphore = DispatchSemaphore(value: 0)
var videoTrack: AVAssetTrack?
var loadError: Error?

Task {
    do {
        videoTrack = try await asset.loadTracks(withMediaType: .video).first
    } catch {
        loadError = error
    }
    semaphore.signal()
}
semaphore.wait()

if let loadError { fail("could not load track: \(loadError.localizedDescription)") }
guard let track = videoTrack else { fail("no video track in \(inputPath)") }

let sizeSemaphore = DispatchSemaphore(value: 0)
var naturalSize: CGSize = .zero
var preferredTransform: CGAffineTransform = .identity
Task {
    naturalSize = (try? await track.load(.naturalSize)) ?? .zero
    preferredTransform = (try? await track.load(.preferredTransform)) ?? .identity
    sizeSemaphore.signal()
}
sizeSemaphore.wait()

// A rotated track reports its pre-rotation size; the decoded frames come out
// already rotated, so the mask has to match the displayed orientation.
let displaySize = naturalSize.applying(preferredTransform)
let width = Int(abs(displaySize.width).rounded())
let height = Int(abs(displaySize.height).rounded())
guard width > 0, height > 0 else { fail("could not determine video dimensions") }

FileHandle.standardError.write("PersonMatte: \(width)x\(height), quality=\(quality.rawValue)\n".data(using: .utf8)!)

guard let reader = try? AVAssetReader(asset: asset) else { fail("could not open reader") }
let output = AVAssetReaderTrackOutput(
    track: track,
    outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
)
output.alwaysCopiesSampleData = false
reader.add(output)
guard reader.startReading() else { fail("could not start reading: \(reader.error?.localizedDescription ?? "unknown")") }

let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = quality
request.outputPixelFormat = kCVPixelFormatType_OneComponent8

let ciContext = CIContext(options: [.useSoftwareRenderer: false])
let stdout = FileHandle.standardOutput

// Reused across frames so the mask isn't reallocated 900 times.
var rowBuffer = [UInt8](repeating: 0, count: width * height)
var frameCount = 0

while let sampleBuffer = output.copyNextSampleBuffer() {
    guard let imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer) else { continue }

    let handler = VNImageRequestHandler(cvPixelBuffer: imageBuffer, options: [:])
    var maskImage: CIImage?
    do {
        try handler.perform([request])
        if let observation = request.results?.first {
            maskImage = CIImage(cvPixelBuffer: observation.pixelBuffer)
        }
    } catch {
        FileHandle.standardError.write("PersonMatte: frame \(frameCount) failed: \(error.localizedDescription)\n".data(using: .utf8)!)
    }

    if let mask = maskImage {
        // Vision returns the mask at its own working resolution; stretch it to
        // the source frame so ffmpeg can alphamerge without a rescale pass.
        let sx = CGFloat(width) / mask.extent.width
        let sy = CGFloat(height) / mask.extent.height
        let scaled = mask.transformed(by: CGAffineTransform(scaleX: sx, y: sy))

        rowBuffer.withUnsafeMutableBytes { raw in
            ciContext.render(
                scaled,
                toBitmap: raw.baseAddress!,
                rowBytes: width,
                bounds: CGRect(x: 0, y: 0, width: width, height: height),
                format: .L8,
                colorSpace: nil
            )
        }
    } else {
        // No person found: a fully transparent mask means the composite falls
        // back to plain text-over-video for this frame rather than flashing.
        for i in rowBuffer.indices { rowBuffer[i] = 0 }
    }

    stdout.write(Data(rowBuffer))
    frameCount += 1
    if frameCount % 60 == 0 {
        FileHandle.standardError.write("PersonMatte: \(frameCount) frames\n".data(using: .utf8)!)
    }
}

FileHandle.standardError.write("PersonMatte: done, \(frameCount) frames\n".data(using: .utf8)!)
