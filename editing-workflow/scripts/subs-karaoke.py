#!/usr/bin/env python3
"""
subs-karaoke.py — FAST phrase-karaoke caption burner (ffmpeg/libass, no Remotion).

Groups words into short phrases (break on a long gap, sentence punctuation, or
max-words), shows one phrase at a time lower-third, and lights the currently-spoken
word in an accent colour while the rest stays white — bold, heavy outline + shadow so
it reads over any footage. Single streaming ffmpeg pass (no multi-GB frame scratch).

Usage:
  python3 scripts/subs-karaoke.py <source> <whisper_json> <output.mp4>
      [--fontsize-pct 5.0] [--vpos-pct 84] [--accent BCAC8B] [--max-words 5]
      [--preview] [--scale-width 960] [--preset fast] [--crf 18]

<vpos-pct> = baseline of the line, % from TOP (84 = lower third). Colours hex RRGGBB.
"""
import argparse, json, os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FONT = os.path.join(HERE, "..", "assets", "fonts", "Montserrat-Black.ttf")
_VENDORED = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
DEFAULT_FFMPEG = _VENDORED if os.path.exists(_VENDORED) else "ffmpeg"
SENT_END = (".", "?", "!", ":")


def ass_time(t):
    if t < 0:
        t = 0
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def hex_to_ass(rgb):
    rgb = rgb.lstrip("#")
    r, g, b = rgb[0:2], rgb[2:4], rgb[4:6]
    return f"&H00{b}{g}{r}".upper()


def load_words(path):
    d = json.load(open(path))
    out = []
    for seg in d.get("segments", []):
        for w in seg.get("words", []):
            t = (w.get("word") or "").strip()
            if t:
                out.append({"t": t, "s": float(w["start"]), "e": float(w["end"])})
    return out


def group_phrases(words, max_words, gap):
    """Split the word stream into display phrases."""
    phrases, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        last = w["t"][-1] in SENT_END
        nxt_gap = (words[i + 1]["s"] - w["e"]) if i + 1 < len(words) else 0
        if last or len(cur) >= max_words or nxt_gap >= gap:
            phrases.append(cur); cur = []
    if cur:
        phrases.append(cur)
    return phrases


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("whisper_json"); ap.add_argument("output")
    ap.add_argument("--font", default=DEFAULT_FONT)
    ap.add_argument("--fontname", default="Montserrat Black")
    ap.add_argument("--fontsize-pct", type=float, default=5.0)
    ap.add_argument("--vpos-pct", type=float, default=84.0)
    ap.add_argument("--accent", default="BCAC8B")        # BRAND gold
    ap.add_argument("--inactive", default="FFFFFF")
    ap.add_argument("--max-words", type=int, default=5)
    ap.add_argument("--gap", type=float, default=0.7)
    ap.add_argument("--preset", default="fast"); ap.add_argument("--crf", default="18")
    ap.add_argument("--ffmpeg", default=DEFAULT_FFMPEG)
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--scale-width", type=int, default=960)
    a = ap.parse_args()

    info = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate", "-of",
         "default=noprint_wrappers=1:nokey=1", a.source]).decode().split()
    width, height = int(info[0]), int(info[1])

    scale_filter = ""
    if a.preview:
        width = a.scale_width - a.scale_width % 2
        height = round(int(info[1]) * width / int(info[0])); height -= height % 2
        scale_filter = f"scale={width}:{height},"
        a.preset = "ultrafast"
        if a.crf == "18":
            a.crf = "26"

    fontsize = round(a.fontsize_pct / 100.0 * height)
    posx, posy = width // 2, round(a.vpos_pct / 100.0 * height)
    accent, inactive = hex_to_ass(a.accent), hex_to_ass(a.inactive)
    outline = max(2, round(fontsize * 0.10))
    shadow = max(1, round(fontsize * 0.04))

    words = load_words(a.whisper_json)
    phrases = group_phrases(words, a.max_words, a.gap)

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {width}
PlayResY: {height}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: K,{a.fontname},{fontsize},{inactive},{inactive},&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,{outline},{shadow},5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    rows = []
    for ph in phrases:
        p_start, p_end = ph[0]["s"], ph[-1]["e"]
        for i, w in enumerate(ph):
            seg_start = p_start if i == 0 else w["s"]
            seg_end = ph[i + 1]["s"] if i + 1 < len(ph) else p_end + 0.25
            if seg_end <= seg_start:
                seg_end = seg_start + 0.05
            chunks = []
            for j, ww in enumerate(ph):
                col = accent if j == i else inactive
                txt = ww["t"].upper().replace("{", "").replace("}", "")
                chunks.append(f"{{\\c{col}}}{txt}")
            line = " ".join(chunks)
            rows.append(
                f"Dialogue: 0,{ass_time(seg_start)},{ass_time(seg_end)},K,,0,0,0,,"
                f"{{\\an5\\pos({posx},{posy})}}{line}")
    ass = header + "\n".join(rows) + "\n"

    tmp_ass, tmp_fonts = "/tmp/karaoke.ass", "/tmp/karaoke_fonts"
    os.makedirs(tmp_fonts, exist_ok=True)
    shutil.copy(a.font, os.path.join(tmp_fonts, os.path.basename(a.font)))
    open(tmp_ass, "w").write(ass)

    fc = (f"[0:v]{scale_filter}subtitles=filename={tmp_ass}:fontsdir={tmp_fonts},"
          f"format=yuv420p[v]")
    cmd = [a.ffmpeg, "-y", "-i", a.source, "-filter_complex", fc,
           "-map", "[v]", "-map", "0:a:0",
           "-c:v", "libx264", "-preset", a.preset, "-crf", str(a.crf),
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
           a.output]
    print(f"[subs-karaoke] {len(words)} words · {len(phrases)} phrases · "
          f"{width}x{height} · font {fontsize}px @ y={posy}")
    subprocess.run(cmd, check=True)
    print(f"[subs-karaoke] wrote {a.output}")


if __name__ == "__main__":
    main()
