#!/usr/bin/env python3
"""
subs-pop.py — BRAND signature "scale-pop" caption burner (ffmpeg/libass, fast).

Reproduces the reference look (see memory: project-brand-signature-style):
  - lowercase geometric heavy sans (Jost*, Futura revival)
  - white fill #FFFFFF, currently-spoken word snaps to dark green #19281C + micro punch
  - each word SCALE-POPS in: 0.6 -> 1.12 -> 1.0 over ~100ms (ease-out overshoot)
  - dynamic phrasing: 1-3 word groups on a single line (y=70%), or a 2-line stack
    (y=65% / y=71%), centered, tight bounding box, grows top-down
  - hard-cut between phrases
Per-word x positions are computed from PIL-measured glyph widths so multi-word lines
stay centered. Single streaming ffmpeg pass.

Usage:
  python3 scripts/subs-pop.py <source> <whisper_json> <out.mp4>
      [--size-pct 4.8] [--fill FFFFFF] [--active 19281C] [--max-words 4]
      [--preview] [--preset fast] [--crf 18]
"""
import argparse, json, os, shutil, subprocess
from PIL import ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_FONT = os.path.join(HERE, "..", "assets", "fonts", "Jost-Bold.ttf")
_V = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
DEFAULT_FFMPEG = _V if os.path.exists(_V) else "ffmpeg"
SENT_END = ".?!"
STRIP = ".,!?;:\"'"  # leading/trailing punctuation stripped from display


def ass_time(t):
    if t < 0:
        t = 0
    h = int(t // 3600); m = int((t % 3600) // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


def hexa(rgb, alpha="00"):
    rgb = rgb.lstrip("#")
    return f"&H{alpha}{rgb[4:6]}{rgb[2:4]}{rgb[0:2]}".upper()


def load_words(path):
    d = json.load(open(path))
    out = []
    for seg in d.get("segments", []):
        for w in seg.get("words", []):
            t = (w.get("word") or "").strip()
            if t:
                out.append({"raw": t, "t": t.strip(STRIP).lower() or t.lower(),
                            "s": float(w["start"]), "e": float(w["end"])})
    return out


def group_phrases(words, max_words, gap):
    phrases, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        end_punct = w["raw"][-1] in SENT_END
        nxt_gap = (words[i + 1]["s"] - w["e"]) if i + 1 < len(words) else 99
        if end_punct or len(cur) >= max_words or nxt_gap >= gap:
            phrases.append(cur); cur = []
    if cur:
        phrases.append(cur)
    return phrases


def layout_line(words, font, space, cx, y):
    """Return [(word, center_x, y)] centering the line at cx."""
    widths = [font.getlength(w["t"]) for w in words]
    total = sum(widths) + space * (len(words) - 1)
    x = cx - total / 2
    placed = []
    for w, wd in zip(words, widths):
        placed.append((w, round(x + wd / 2), y))
        x += wd + space
    return placed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("whisper_json"); ap.add_argument("output")
    ap.add_argument("--font", default=DEFAULT_FONT)
    ap.add_argument("--fontname", default="Jost*")
    ap.add_argument("--size-pct", type=float, default=4.8)
    ap.add_argument("--fill", default="FFFFFF")
    ap.add_argument("--active", default="19281C")
    ap.add_argument("--y-single", type=float, default=70.0)
    ap.add_argument("--y-line1", type=float, default=65.0)
    ap.add_argument("--y-line2", type=float, default=71.0)
    ap.add_argument("--max-words", type=int, default=4)
    ap.add_argument("--gap", type=float, default=0.40)
    ap.add_argument("--skip-windows", default="",
                    help="comma list of start-end (s) where captions are suppressed, "
                         "e.g. full-screen graphic cards that carry their own text")
    ap.add_argument("--preset", default="fast"); ap.add_argument("--crf", default="18")
    ap.add_argument("--ffmpeg", default=DEFAULT_FFMPEG)
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--scale-width", type=int, default=540)
    a = ap.parse_args()

    info = subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=width,height,r_frame_rate", "-of",
         "default=noprint_wrappers=1:nokey=1", a.source]).decode().split()
    W, H = int(info[0]), int(info[1])
    scale_filter = ""
    if a.preview:
        W = a.scale_width - a.scale_width % 2
        H = round(int(info[1]) * W / int(info[0])); H -= H % 2
        scale_filter = f"scale={W}:{H},"
        a.preset = "ultrafast"
        if a.crf == "18":
            a.crf = "26"

    fs = round(a.size_pct / 100.0 * H)
    font = ImageFont.truetype(a.font, fs)
    space = font.getlength(" ") or font.getlength(" ") or fs * 0.3
    fill, active = hexa(a.fill), hexa(a.active)

    skip = []
    for chunk in a.skip_windows.split(","):
        chunk = chunk.strip()
        if "-" in chunk:
            s0, e0 = chunk.split("-")
            skip.append((float(s0), float(e0)))

    words = load_words(a.whisper_json)
    phrases = group_phrases(words, a.max_words, a.gap)
    # drop phrases whose center falls inside a suppressed window (graphic cards)
    phrases = [ph for ph in phrases
               if not any(s0 <= (ph[0]["s"] + ph[-1]["e"]) / 2 <= e0 for s0, e0 in skip)]

    # Build placements per phrase: single line, or 2-line stack split by width balance.
    base_rows, active_rows = [], []
    for ph in phrases:
        p_start, p_end = ph[0]["s"], ph[-1]["e"]
        single_w = sum(font.getlength(w["t"]) for w in ph) + space * (len(ph) - 1)
        if len(ph) <= 3 and single_w <= 0.84 * W:
            placed = layout_line(ph, font, space, W / 2, round(a.y_single / 100 * H))
        else:
            # balance into 2 lines by cumulative width
            ws = [font.getlength(w["t"]) for w in ph]
            tot, run, cut = sum(ws), 0, 1
            for i in range(1, len(ph)):
                run += ws[i - 1]
                if run >= tot / 2:
                    cut = i; break
            l1 = layout_line(ph[:cut], font, space, W / 2, round(a.y_line1 / 100 * H))
            l2 = layout_line(ph[cut:], font, space, W / 2, round(a.y_line2 / 100 * H))
            placed = l1 + l2

        for k, (w, wx, wy) in enumerate(placed):
            txt = w["t"].replace("{", "").replace("}", "").replace("\\", "")
            # base (white) for the whole phrase, with scale-pop entrance
            base_rows.append(
                f"Dialogue: 0,{ass_time(p_start)},{ass_time(p_end)},Pop,,0,0,0,,"
                f"{{\\an5\\pos({wx},{wy})\\fscx60\\fscy60"
                f"\\t(0,50,\\fscx112\\fscy112)\\t(50,100,\\fscx100\\fscy100)"
                f"\\1c{fill}}}{txt}")
            # active (green) overlay during this word's spoken window, with micro punch.
            # placed preserves phrase order, so k indexes ph directly.
            a_start = w["s"]
            a_end = ph[k + 1]["s"] if k + 1 < len(ph) else p_end
            if a_end <= a_start:
                a_end = a_start + 0.05
            active_rows.append(
                f"Dialogue: 1,{ass_time(a_start)},{ass_time(a_end)},Pop,,0,0,0,,"
                f"{{\\an5\\pos({wx},{wy})\\fscx100\\fscy100"
                f"\\t(0,40,\\fscx108\\fscy108)\\t(40,90,\\fscx100\\fscy100)"
                f"\\1c{active}}}{txt}")

    shadow = hexa("000000", "D9")  # ~15% opacity drop shadow
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Pop,{a.fontname},{fs},{fill},{fill},&H00000000,{shadow},1,0,0,0,100,100,0,0,1,0,3,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    ass = header + "\n".join(base_rows + active_rows) + "\n"

    tmp_ass, tmp_fonts = "/tmp/subs_pop.ass", "/tmp/subs_pop_fonts"
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
    print(f"[subs-pop] {len(words)} words · {len(phrases)} phrases · {W}x{H} · "
          f"font {fs}px Jost* · fill #{a.fill} active #{a.active}")
    subprocess.run(cmd, check=True)
    print(f"[subs-pop] wrote {a.output}")


if __name__ == "__main__":
    main()
