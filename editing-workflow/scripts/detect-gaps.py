#!/usr/bin/env python3
"""
detect-gaps.py — find "black square" overlay markers (the remotion-reel filming trick).

While filming, you frame a solid black square into the UPPER HALF of the frame for the
length of a beat. This scans the upper half of every frame for darkness (average luma
below --thresh) sustained for >= --min-ms, and prints the gap windows [start_ms, end_ms]
— that's where motion-graphic overlays get mounted. Optionally maps the spoken words in
each gap from a Whisper JSON so you can see what each overlay should illustrate.

Usage:
  python3 scripts/detect-gaps.py <video> [--thresh 20] [--min-ms 250]
      [--whisper words.json] [--json out.json]
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
_VF = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FFMPEG = _VF if os.path.exists(_VF) else "ffmpeg"
META = "/tmp/detect_gaps_meta.txt"


def load_words(path):
    d = json.load(open(path))
    out = []
    for seg in d.get("segments", []):
        for w in seg.get("words", []):
            t = (w.get("word") or "").strip()
            if t:
                out.append((t, float(w["start"]) * 1000, float(w["end"]) * 1000))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--thresh", type=float, default=20.0, help="upper-half avg luma below this = dark")
    ap.add_argument("--min-ms", type=int, default=250, help="min sustained darkness to count as a gap")
    ap.add_argument("--whisper", default=None)
    ap.add_argument("--json", default=None)
    a = ap.parse_args()

    # Average luma of the UPPER-HALF crop, per frame, printed to a metadata file.
    subprocess.run(
        [FFMPEG, "-i", a.video, "-vf",
         f"crop=in_w:in_h/2:0:0,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file={META}",
         "-an", "-f", "null", "-"],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Parse: pairs of `pts_time:<t>` then `lavfi.signalstats.YAVG=<v>`
    samples = []  # (ms, yavg)
    cur_t = None
    for line in open(META):
        m = re.search(r"pts_time:([0-9.]+)", line)
        if m:
            cur_t = float(m.group(1)) * 1000
            continue
        m = re.search(r"YAVG=([0-9.]+)", line)
        if m and cur_t is not None:
            samples.append((cur_t, float(m.group(1))))
            cur_t = None

    if not samples:
        sys.exit("detect-gaps: no luma samples parsed (is the file valid?)")

    # Group contiguous dark frames into windows; keep those >= min-ms.
    gaps = []
    run_start = None
    last_t = samples[0][0]
    for t, y in samples:
        dark = y < a.thresh
        if dark and run_start is None:
            run_start = t
        elif not dark and run_start is not None:
            if last_t - run_start >= a.min_ms:
                gaps.append([round(run_start), round(last_t)])
            run_start = None
        last_t = t
    if run_start is not None and last_t - run_start >= a.min_ms:
        gaps.append([round(run_start), round(last_t)])

    words = load_words(a.whisper) if a.whisper else None
    print(f"[detect-gaps] {len(gaps)} gap(s) (thresh<{a.thresh}, >= {a.min_ms}ms):")
    out = []
    for i, (s, e) in enumerate(gaps):
        entry = {"index": i, "start_ms": s, "end_ms": e, "dur_ms": e - s}
        line = f"  [{i}] {s/1000:.2f}s -> {e/1000:.2f}s ({e-s}ms)"
        if words is not None:
            spoken = " ".join(t for (t, ws, we) in words if we > s and ws < e)
            entry["spoken"] = spoken
            line += f'  :: "{spoken}"'
        out.append(entry)
        print(line)

    if a.json:
        json.dump({"gaps": out}, open(a.json, "w"), indent=2)
        print(f"[detect-gaps] wrote {a.json}")


if __name__ == "__main__":
    main()
