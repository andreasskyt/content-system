// Batch background removal using the macOS Vision foreground-instance mask.
// Same model as "Copy Subject" in Photos. Local, free, no network.
//
//   swiftc -O cutout.swift -o cutout
//   ./cutout <input-dir-or-file> <output-dir> [maxHeight]
//
// Writes <name>.png with a transparent background. Skips files that already
// exist in the output dir, so re-runs are cheap.

import Foundation
import Vision
import CoreImage
import AppKit

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: cutout <in> <out-dir> [maxHeight]\n".data(using: .utf8)!)
    exit(64)
}

let inPath = args[1]
let outDir = URL(fileURLWithPath: args[2], isDirectory: true)
let maxHeight = args.count > 3 ? CGFloat(Double(args[3]) ?? 1800) : 1800

try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

let fm = FileManager.default
var inputs: [URL] = []
var isDir: ObjCBool = false
fm.fileExists(atPath: inPath, isDirectory: &isDir)
if isDir.boolValue {
    let all = (try? fm.contentsOfDirectory(atPath: inPath)) ?? []
    inputs = all.sorted()
        .filter { ["jpg", "jpeg", "png", "heic"].contains(($0 as NSString).pathExtension.lowercased()) }
        .map { URL(fileURLWithPath: inPath).appendingPathComponent($0) }
} else {
    inputs = [URL(fileURLWithPath: inPath)]
}

let ctx = CIContext()
let cs = CGColorSpace(name: CGColorSpace.sRGB)!
var done = 0, failed = 0, skipped = 0

for url in inputs {
    let outURL = outDir.appendingPathComponent(url.deletingPathExtension().lastPathComponent + ".png")
    if fm.fileExists(atPath: outURL.path) { skipped += 1; continue }

    guard var img = CIImage(contentsOf: url) else { failed += 1; continue }

    // Downscale first — the mask is generated at the scaled size, which is both
    // faster and produces files small enough to composite in a browser.
    if img.extent.height > maxHeight {
        let s = maxHeight / img.extent.height
        img = img.transformed(by: CGAffineTransform(scaleX: s, y: s))
    }

    do {
        let req = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(ciImage: img, options: [:])
        try handler.perform([req])
        guard let obs = req.results?.first else {
            FileHandle.standardError.write("no subject: \(url.lastPathComponent)\n".data(using: .utf8)!)
            failed += 1; continue
        }
        let maskBuf = try obs.generateScaledMaskForImage(forInstances: obs.allInstances, from: handler)
        let mask = CIImage(cvPixelBuffer: maskBuf)

        let blend = CIFilter(name: "CIBlendWithMask")!
        blend.setValue(img, forKey: kCIInputImageKey)
        blend.setValue(CIImage(color: .clear).cropped(to: img.extent), forKey: kCIInputBackgroundImageKey)
        blend.setValue(mask, forKey: kCIInputMaskImageKey)
        guard let out = blend.outputImage else { failed += 1; continue }

        try ctx.writePNGRepresentation(of: out, to: outURL, format: .RGBA8, colorSpace: cs)
        done += 1
        print("\(url.lastPathComponent) -> \(outURL.lastPathComponent)")
    } catch {
        FileHandle.standardError.write("fail \(url.lastPathComponent): \(error)\n".data(using: .utf8)!)
        failed += 1
    }
}

print("done=\(done) skipped=\(skipped) failed=\(failed)")
