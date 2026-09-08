#!/usr/bin/env python3
"""
join-clips.py — concatenate 2+ video clips into ONE clean file.

Normalizes every clip to a common resolution/fps/SAR, resets PTS on both video
and audio (the classic ffmpeg concat gotcha — without setpts/asetpts you get
dropped frames + audio pops at the seams), then concatenates with the concat
filter (re-encode once). Clips of different sizes are scaled + letterboxed to fit.

Usage:
  python3 scripts/join-clips.py <out.mp4> <clipA> <clipB> [clipC ...]
      [--fps N] [--width W] [--height H] [--crf 18] [--preset medium]

Geometry defaults to the FIRST clip's. Each clip needs an audio track.
"""
import argparse, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
_VF = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FFMPEG = _VF if os.path.exists(_VF) else "ffmpeg"


def probe(path, *entries, stream="v:0"):
    return subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", stream,
         "-show_entries", "stream=" + ",".join(entries),
         "-of", "default=noprint_wrappers=1:nokey=1", path]
    ).decode().split()


def has_audio(path):
    try:
        return bool(probe(path, "codec_type", stream="a:0"))
    except subprocess.CalledProcessError:
        return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("output")
    ap.add_argument("clips", nargs="+")
    ap.add_argument("--fps", type=int, default=0)
    ap.add_argument("--width", type=int, default=0)
    ap.add_argument("--height", type=int, default=0)
    ap.add_argument("--crf", default="18")
    ap.add_argument("--preset", default="medium")
    a = ap.parse_args()
    if len(a.clips) < 2:
        sys.exit("join-clips: need 2+ clips")

    w, h = probe(a.clips[0], "width", "height")
    W = a.width or int(w)
    H = a.height or int(h)
    rfr = probe(a.clips[0], "r_frame_rate")[0]
    nn, dd = (rfr.split("/") + ["1"])[:2]
    FPS = a.fps or max(1, round(float(nn) / float(dd)))

    n = len(a.clips)
    # If any clip lacks audio, synthesize silence so concat stays a/v aligned.
    audio_ok = all(has_audio(c) for c in a.clips)

    vparts, aparts, labels = [], [], []
    for i in range(n):
        vparts.append(
            f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
            f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={FPS},"
            f"format=yuv420p,setpts=PTS-STARTPTS[v{i}]"
        )
        if audio_ok:
            aparts.append(f"[{i}:a]aresample=48000,asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")

    fc = ";".join(vparts + aparts) + ";" + "".join(labels) + \
        f"concat=n={n}:v=1:a=1[v][a]"

    cmd = [FFMPEG, "-y"]
    for c in a.clips:
        cmd += ["-i", c]
    if not audio_ok:
        # one silent source reused via filtergraph is fiddly; require audio for now
        sys.exit("join-clips: every clip needs an audio track (got one without).")
    cmd += ["-filter_complex", fc, "-map", "[v]", "-map", "[a]",
            "-r", str(FPS), "-c:v", "libx264", "-preset", a.preset, "-crf", a.crf,
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", a.output]
    print(f"[join-clips] {n} clips -> {W}x{H}@{FPS}fps -> {a.output}")
    subprocess.run(cmd, check=True)
    print(f"[join-clips] wrote {a.output}")


if __name__ == "__main__":
    main()
