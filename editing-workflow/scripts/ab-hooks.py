#!/usr/bin/env python3
"""
ab-hooks.py — splice alternate openers onto a body, sub them, optionally bed music.

For each --hook clip: splice hook + body into one reel (PTS-reset concat via
join-clips, afade on the hook audio so the seam doesn't pop), transcribe the
spliced file fresh (Whisper jitter — never reuse a transcript across splices),
burn X-ray subs, and optionally mix a music bed under the audio. Each variant is
written to <out-dir>/<hook-stem>.mp4. Optionally also renders the body alone.

Usage:
  python3 scripts/ab-hooks.py --body body.mov --out-dir out/ \
      --hook IMG_1.MOV --hook IMG_2.MOV \
      --width 1080 --height 1920 --fps 30 --vpos-pct 47 \
      --music "/path/Echo_Sax_End.mp3" --music-volume 0.13 [--preview]

--body-start trims the body's own opener (default 0 = keep whole body).
--no-body skips the body-only version. --hook-dur trims each hook (0 = whole clip).
"""
import argparse, glob, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
WHISPER = "whisper"
if not os.path.exists(WHISPER):
    WHISPER = "whisper"
_VF = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FFMPEG = _VF if os.path.exists(_VF) else "ffmpeg"
QUIET = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}


def run(cmd, quiet=True):
    print("  $", os.path.basename(cmd[0]), *cmd[1:4], "...")
    subprocess.run(cmd, check=True, **(QUIET if quiet else {}))


def transcribe(video, tag):
    outdir = f"/tmp/abhooks_{tag}"
    os.makedirs(outdir, exist_ok=True)
    audio = os.path.join(outdir, "a.mp3")
    run([FFMPEG, "-y", "-i", video, "-vn", "-ac", "1", "-ar", "16000",
         "-c:a", "libmp3lame", "-q:a", "4", audio])
    run([WHISPER, audio, "--model", "small.en", "--language", "en",
         "--word_timestamps", "True", "--output_format", "json",
         "--output_dir", outdir, "--fp16", "False", "--verbose", "False"])
    js = glob.glob(os.path.join(outdir, "*.json"))
    if not js:
        sys.exit(f"ab-hooks: transcription failed for {video}")
    return js[0]


def xray(source, words_json, out, a):
    cmd = ["python3", os.path.join(HERE, "xray-burn.py"), source, words_json, out,
           "--vpos-pct", str(a.vpos_pct), "--fontsize-pct", str(a.fontsize_pct)]
    if a.preview:
        cmd.append("--preview")
    run(cmd, quiet=False)


def add_music(video, music, vol, out):
    # original speech at full level + music looped under it at `vol` (normalize=0
    # so the speech isn't attenuated). Video copied, audio re-encoded.
    run([FFMPEG, "-y", "-i", video, "-stream_loop", "-1", "-i", music,
         "-filter_complex",
         f"[1:a]volume={vol}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[a]",
         "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-shortest", "-movflags", "+faststart", out])


def finish(subbed, name, a):
    """Apply music bed if requested, write final to out-dir/<name>.mp4."""
    final = os.path.join(a.out_dir, f"{name}.mp4")
    if a.music:
        add_music(subbed, a.music, a.music_volume, final)
        os.remove(subbed)
    else:
        os.replace(subbed, final)
    print(f"[ab-hooks] -> {final}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--body", required=True)
    ap.add_argument("--body-start", type=float, default=0.0)
    ap.add_argument("--hook", action="append", default=[])
    ap.add_argument("--hook-dur", type=float, default=0.0)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--no-body", action="store_true", help="skip the body-only version")
    ap.add_argument("--vpos-pct", type=float, default=60.0)
    ap.add_argument("--fontsize-pct", type=float, default=6.4)
    ap.add_argument("--width", type=int, default=0)
    ap.add_argument("--height", type=int, default=0)
    ap.add_argument("--fps", type=int, default=0)
    ap.add_argument("--music", default=None)
    ap.add_argument("--music-volume", type=float, default=0.10)
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    tmp = "/tmp/abhooks"
    os.makedirs(tmp, exist_ok=True)

    geo = []
    if a.width:
        geo += ["--width", str(a.width)]
    if a.height:
        geo += ["--height", str(a.height)]
    if a.fps:
        geo += ["--fps", str(a.fps)]

    # body, opener trimmed if requested
    body = a.body
    if a.body_start > 0:
        body = os.path.join(tmp, "body.mp4")
        run([FFMPEG, "-y", "-i", a.body, "-ss", str(a.body_start),
             "-c:v", "libx264", "-preset", "medium", "-crf", "18",
             "-c:a", "aac", "-b:a", "192k", body])

    if not a.no_body:
        print("[ab-hooks] body-only version")
        j = transcribe(body, "body")
        sub = os.path.join(tmp, "body_sub.mp4")
        xray(body, j, sub, a)
        finish(sub, "body", a)

    for i, hook in enumerate(a.hook):
        stem = os.path.splitext(os.path.basename(hook))[0]
        print(f"[ab-hooks] hook: {stem}")
        hk = hook
        if a.hook_dur > 0:
            hk = os.path.join(tmp, f"hook{i}.mp4")
            run([FFMPEG, "-y", "-i", hook, "-t", str(a.hook_dur),
                 "-af", f"afade=t=out:st={max(0.0, a.hook_dur-0.3):.2f}:d=0.3",
                 "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                 "-c:a", "aac", "-b:a", "192k", hk])
        spliced = os.path.join(tmp, f"spliced{i}.mp4")
        run(["python3", os.path.join(HERE, "join-clips.py"), spliced, hk, body, *geo])
        j = transcribe(spliced, f"h{i}")
        sub = os.path.join(tmp, f"sub{i}.mp4")
        xray(spliced, j, sub, a)
        finish(sub, stem, a)

    print(f"[ab-hooks] done -> {a.out_dir}")


if __name__ == "__main__":
    main()
