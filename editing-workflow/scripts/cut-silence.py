#!/usr/bin/env python3
"""
cut-silence.py — FAST dead-air remover (ffmpeg silencedetect, single re-encode).

Detects silences longer than --min-sil at --noise dB, keeps the speech regions
(padded by --pad so word edges aren't clipped), merges keep-regions separated by
a gap shorter than --min-sil, and concatenates them in ONE filter_complex pass.
Streams — no multi-GB frame scratch. Original geometry/fps preserved.

Usage:
  python3 scripts/cut-silence.py <input> <output>
      [--noise -30dB] [--min-sil 0.6] [--pad 0.12] [--crf 18] [--preset medium]

Tuning: louder room -> raise --noise toward -24dB; choppy cuts -> raise --pad or
--min-sil; still draggy -> lower --min-sil toward 0.35.
"""
import argparse, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
_VF = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FFMPEG = _VF if os.path.exists(_VF) else "ffmpeg"


def probe_duration(path):
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path])
    return float(out.strip())


def detect_silences(path, noise, min_sil):
    """Return list of (start, end) silence windows via ffmpeg silencedetect."""
    p = subprocess.run(
        [FFMPEG, "-i", path, "-af",
         f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
        stderr=subprocess.PIPE, stdout=subprocess.DEVNULL)
    log = p.stderr.decode("utf-8", "ignore")
    sils, cur = [], None
    for line in log.splitlines():
        m = re.search(r"silence_start:\s*(-?[0-9.]+)", line)
        if m:
            cur = max(0.0, float(m.group(1)))
            continue
        m = re.search(r"silence_end:\s*(-?[0-9.]+)", line)
        if m and cur is not None:
            sils.append((cur, float(m.group(1))))
            cur = None
    return sils


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--noise", default="-30dB")
    ap.add_argument("--min-sil", type=float, default=0.6)
    ap.add_argument("--pad", type=float, default=0.12)
    ap.add_argument("--crf", default="18")
    ap.add_argument("--preset", default="medium")
    a = ap.parse_args()

    dur = probe_duration(a.input)
    sils = detect_silences(a.input, a.noise, a.min_sil)

    # Invert silences -> keep (speech) regions, padding each silence edge inward.
    keep = []
    cursor = 0.0
    for s, e in sils:
        s_pad = s + a.pad   # let speech run a touch into the silence
        e_pad = e - a.pad
        if s_pad > cursor:
            keep.append([cursor, min(s_pad, dur)])
        cursor = max(cursor, e_pad)
    if cursor < dur:
        keep.append([cursor, dur])

    # Drop slivers and merge adjacent keeps with a tiny gap between them.
    keep = [k for k in keep if k[1] - k[0] > 0.05]
    merged = []
    for k in keep:
        if merged and k[0] - merged[-1][1] < 0.05:
            merged[-1][1] = k[1]
        else:
            merged.append(k)
    keep = merged

    removed = dur - sum(e - s for s, e in keep)
    print(f"[cut-silence] {len(sils)} silence(s) · keeping {len(keep)} segment(s) · "
          f"{dur:.1f}s -> {dur - removed:.1f}s (cut {removed:.1f}s)")
    if not keep:
        sys.exit("cut-silence: nothing left after cutting — loosen --noise/--min-sil")
    if len(keep) == 1 and abs(keep[0][0]) < 0.05 and abs(keep[0][1] - dur) < 0.05:
        print("[cut-silence] no silences worth cutting — copying through")
        subprocess.run([FFMPEG, "-y", "-i", a.input, "-c", "copy", a.output], check=True)
        return

    # One filter_complex: trim each keep on v+a, reset PTS, concat.
    parts, labels = [], []
    for i, (s, e) in enumerate(keep):
        parts.append(
            f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}];"
            f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")
    fc = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(keep)}:v=1:a=1[v][a]"

    cmd = [FFMPEG, "-y", "-i", a.input, "-filter_complex", fc,
           "-map", "[v]", "-map", "[a]",
           "-c:v", "libx264", "-preset", a.preset, "-crf", a.crf,
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", a.output]
    subprocess.run(cmd, check=True)
    print(f"[cut-silence] wrote {a.output}")


if __name__ == "__main__":
    main()
