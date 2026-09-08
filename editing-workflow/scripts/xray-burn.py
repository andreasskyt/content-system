#!/usr/bin/env python3
"""
xray-burn.py — FAST X-ray-invert subtitle burner (ffmpeg/libass, no Remotion).

Renders the BRAND `xray-invert` caption look — white Montserrat-Black caps, one
word at a time, HELD until the next word, 40% from the bottom, large — by drawing
the words as white-on-black with libass and compositing them over the footage with
`blend=difference` (|video-255| = inverted where the glyph is, video untouched
elsewhere). Identical math to CSS `mix-blend-mode: difference`, but it streams in a
single ffmpeg pass: ~1-3 min instead of ~20, and needs no multi-GB frame scratch.

Usage:
  python3 scripts/xray-burn.py <source_video> <whisper_json> <output_mp4>
      [--fontsize-pct 6.4] [--vpos-pct 60] [--last-hold 1.2] [--preset fast] [--crf 18]

<whisper_json> = OpenAI-Whisper JSON with word_timestamps (segments[].words[].word/start/end).
"""
import argparse, json, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FONT = os.path.join(HERE, "..", "assets", "fonts", "Montserrat-Black.ttf")
# The system ffmpeg is often built WITHOUT libass; this vendored static build has
# libass+freetype+fontconfig (needed for the `subtitles` filter). Falls back to PATH.
_VENDORED_FFMPEG = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
DEFAULT_FFMPEG = _VENDORED_FFMPEG if os.path.exists(_VENDORED_FFMPEG) else "ffmpeg"


def ass_time(t: float) -> str:
    if t < 0:
        t = 0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path]
    )
    return float(out.strip())


def load_words(whisper_json: str):
    d = json.load(open(whisper_json))
    words = []
    for seg in d.get("segments", []):
        for w in seg.get("words", []):
            t = (w.get("word") or "").strip()
            if t:
                words.append((t, float(w["start"]), float(w["end"])))
    return words


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source")
    ap.add_argument("whisper_json")
    ap.add_argument("output")
    ap.add_argument("--font", default=DEFAULT_FONT)
    ap.add_argument("--fontname", default="Montserrat Black")
    ap.add_argument("--fontsize-pct", type=float, default=6.4)   # of height
    ap.add_argument("--vpos-pct", type=float, default=60.0)      # word CENTER, from top (60 = 40% from bottom)
    ap.add_argument("--last-hold", type=float, default=1.2)      # hold last word this long after it's spoken
    ap.add_argument("--preset", default="fast")
    ap.add_argument("--crf", default="18")
    ap.add_argument("--ffmpeg", default=DEFAULT_FFMPEG)
    ap.add_argument("--preview", action="store_true",
                    help="fast low-res draft (downscaled, ultrafast) for placement/look checks")
    ap.add_argument("--scale-width", type=int, default=540, help="preview width in px")
    ap.add_argument("--edge-threshold", type=int, default=0,
                    help="(legacy difference path only) binarize the caption mask at this "
                         "luma. Unused by the default alpha-composite path.")
    ap.add_argument("--supersample", type=int, default=2,
                    help="render the caption mask at this multiple of the video resolution "
                         "and lanczos-downsample it, for smooth glyph edges on large screens. "
                         "2 is a good default; 1 disables.")
    a = ap.parse_args()

    # Probe geometry from the source so size/position track any resolution.
    info = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,r_frame_rate",
         "-of", "default=noprint_wrappers=1:nokey=1", a.source]
    ).decode().split()
    width, height = int(info[0]), int(info[1])
    num, den = (info[2].split("/") + ["1"])[:2]
    fps = max(1, round(float(num) / float(den)))
    dur = probe_duration(a.source)

    # Preview: downscale before the blend so decode/blend/encode all work on small
    # frames (the real speedup). Position/size are % of height, so the look holds.
    scale_filter = ""
    if a.preview:
        width = a.scale_width - (a.scale_width % 2)
        height = round(int(info[1]) * width / int(info[0]))
        height -= height % 2
        scale_filter = f"scale={width}:{height},"
        a.preset = "ultrafast"
        if a.crf == "18":
            a.crf = "28"

    fontsize = round(a.fontsize_pct / 100.0 * height)
    posx = width // 2
    posy = round(a.vpos_pct / 100.0 * height)

    words = load_words(a.whisper_json)
    n = len(words)

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: X,{a.fontname},{fontsize},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    rows = []
    for i, (t, ws, we) in enumerate(words):
        start = ws
        end = words[i + 1][1] if i + 1 < n else min(we + a.last_hold, dur)  # hold until next word
        if end <= start:
            end = start + 0.05
        txt = t.upper().replace("{", "").replace("}", "").replace("\n", " ")
        rows.append(
            f"Dialogue: 0,{ass_time(start)},{ass_time(end)},X,,0,0,0,,"
            f"{{\\an5\\pos({posx},{posy})}}{txt}"
        )
    ass = header + "\n".join(rows) + "\n"

    # Use space-free temp paths so the ffmpeg filtergraph needs no path escaping.
    tmp_ass = "/tmp/xray_burn.ass"
    tmp_fonts = "/tmp/xray_fonts"
    os.makedirs(tmp_fonts, exist_ok=True)
    shutil.copy(a.font, os.path.join(tmp_fonts, os.path.basename(a.font)))
    open(tmp_ass, "w").write(ass)

    # color(black)->white text via libass; blend difference with the footage in RGB
    # (matches CSS sRGB difference), then back to yuv420p for h264.
    # Blend must run on PLANAR rgb (gbrp); packed rgb24 corrupts across the
    # interleaved color bytes (whole-frame color cast). difference in gbrp ==
    # CSS sRGB mix-blend-mode: difference.
    # Supersampled, alpha-composited photographic-negative captions.
    #   • Render the white-on-black caption at `supersample`x the video resolution, then
    #     lanczos-downsample → smooth anti-aliased glyph edges that hold up on big screens.
    #   • Use that grayscale as an ALPHA mask over the negated footage and overlay it on the
    #     original. The interior is the exact same inverted look a difference-blend gives
    #     (255 - pixel), but the edges alpha-blend cleanly — no dark halo (the halo was the
    #     intrinsic |F - g| = 0 crossover that difference-blend hits on every gray edge pixel).
    S = max(1, a.supersample)
    sw, sh = width * S, height * S
    fc = (
        f"color=c=black:s={sw}x{sh}:r={fps}:d={dur + 1},"
        f"subtitles=filename={tmp_ass}:fontsdir={tmp_fonts},"
        f"format=gray,scale={width}:{height}:flags=lanczos,format=gray[mask];"
        f"[0:v]{scale_filter}format=gbrp,split=2[base][neg];"
        f"[neg]negate[inv];"
        f"[inv][mask]alphamerge[inva];"
        f"[base][inva]overlay=format=auto,format=yuv420p[v]"
    )
    cmd = [
        a.ffmpeg, "-y", "-i", a.source,
        "-filter_complex", fc,
        "-map", "[v]", "-map", "0:a:0",
        "-c:v", "libx264", "-preset", a.preset, "-crf", str(a.crf),
        "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", a.output,
    ]
    print(f"[xray-burn] {n} words · {width}x{height} {fps}fps · {dur:.1f}s · "
          f"font {fontsize}px @ y={posy}")
    subprocess.run(cmd, check=True)
    print(f"[xray-burn] wrote {a.output}")


if __name__ == "__main__":
    main()
