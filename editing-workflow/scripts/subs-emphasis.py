#!/usr/bin/env python3
"""
subs-emphasis.py — signature scale-pop captions with SELECTIVE emphasis rendered
BIGGER + X-RAY-INVERT (difference blend), the rest plain white.

Fixes the prior failures (see memory feedback-caption-highlighting): emphasis is
selective (not karaoke), and emphasis words are made BIGGER and composited with
`blend=difference` (the BRAND x-ray look) instead of a same-color highlight. Two libass
layers: normal white words drawn on top, emphasis words white-on-black difference-blended
(planar gbrp). Per-word positions from PIL metrics; tight spacing.

Usage:
  python3 scripts/subs-emphasis.py <src> <whisper_json> <out.mp4>
      --emphasis "2,7,16,27,..."   (word indices into the flattened word list)
      [--skip-windows "46.6-49"] [--size-pct 5.2] [--emph-scale 1.45]
"""
import argparse, json, os, shutil, subprocess
from PIL import ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "assets", "fonts", "Poppins-Bold.ttf")
FONTNAME = "Poppins"
_V = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FF = _V if os.path.exists(_V) else "ffmpeg"
SENT = ".?!"; STRIP = ".,!?;:\"'"


def at(t):
    if t < 0: t = 0
    return f"{int(t//3600)}:{int((t%3600)//60):02d}:{t%60:05.2f}"


def load_words(p):
    d = json.load(open(p)); out = []
    for s in d.get("segments", []):
        for w in s.get("words", []):
            t = (w.get("word") or "").strip()
            if t:
                out.append({"raw": t, "t": t.strip(STRIP).lower() or t.lower(),
                            "s": float(w["start"]), "e": float(w["end"])})
    return out


def group(words, maxw, gap):
    ph, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        endp = w["raw"][-1] in SENT
        ng = (words[i+1]["s"] - w["e"]) if i+1 < len(words) else 99
        if endp or len(cur) >= maxw or ng >= gap:
            ph.append(cur); cur = []
    if cur: ph.append(cur)
    return ph


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("whisper_json"); ap.add_argument("output")
    ap.add_argument("--emphasis", default="")
    ap.add_argument("--skip-windows", default="")
    ap.add_argument("--size-pct", type=float, default=6.6)      # bigger, reel-readable
    ap.add_argument("--emph-scale", type=float, default=1.7)    # emphasis pops harder
    ap.add_argument("--y-single", type=float, default=70.0)
    ap.add_argument("--y1", type=float, default=64.0)
    ap.add_argument("--y2", type=float, default=72.0)
    ap.add_argument("--maxw", type=int, default=4)
    ap.add_argument("--gap", type=float, default=0.40)
    ap.add_argument("--space-em", type=float, default=0.28)     # inter-word gap as fraction of font size (tight)
    ap.add_argument("--preset", default="fast"); ap.add_argument("--crf", default="18")
    a = ap.parse_args()

    info = subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=width,height,r_frame_rate","-of",
        "default=noprint_wrappers=1:nokey=1", a.source]).decode().split()
    W, H = int(info[0]), int(info[1])
    num, den = (info[2].split("/")+["1"])[:2]; fps = max(1, round(float(num)/float(den)))
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries",
        "format=duration","-of","default=noprint_wrappers=1:nokey=1", a.source]).strip())

    fs = round(a.size_pct/100.0*H); fs_big = round(fs*a.emph_scale)
    f_norm = ImageFont.truetype(FONT, fs); f_big = ImageFont.truetype(FONT, fs_big)
    sp = fs * a.space_em   # tight, font-proportional gap (not the over-wide space glyph)
    emph = set(int(x) for x in a.emphasis.split(",") if x.strip().isdigit())
    skip = []
    for c in a.skip_windows.split(","):
        if "-" in c:
            s0, e0 = c.split("-"); skip.append((float(s0), float(e0)))

    words = load_words(a.whisper_json)
    for gi, w in enumerate(words):
        w["emph"] = gi in emph
    phrases = group(words, a.maxw, a.gap)

    def wwidth(w): return (f_big if w["emph"] else f_norm).getlength(w["t"])

    def lay(ws, cx, cy):
        tot = sum(wwidth(w) for w in ws) + sp*(len(ws)-1)
        x = cx - tot/2; out = []
        for w in ws:
            wd = wwidth(w); out.append((w, round(x+wd/2), cy)); x += wd + sp
        return out

    norm_rows, xray_rows = [], []
    POP = "\\fscx60\\fscy60\\t(0,50,\\fscx112\\fscy112)\\t(50,100,\\fscx100\\fscy100)"
    for ph in phrases:
        ps, pe = ph[0]["s"], ph[-1]["e"]
        center = (ps+pe)/2
        if any(s0 <= center <= e0 for s0, e0 in skip):
            continue
        wide = sum(wwidth(w) for w in ph) + sp*(len(ph)-1)
        if len(ph) <= 3 and wide <= 0.86*W:
            placed = lay(ph, W/2, round(a.y_single/100*H))
        else:
            ws_ = [wwidth(w) for w in ph]; tot = sum(ws_); run = 0; cut = 1
            for i in range(1, len(ph)):
                run += ws_[i-1]
                if run >= tot/2: cut = i; break
            placed = lay(ph[:cut], W/2, round(a.y1/100*H)) + lay(ph[cut:], W/2, round(a.y2/100*H))
        for w, wx, wy in placed:
            txt = w["t"].replace("{","").replace("}","").replace("\\","")
            sz = fs_big if w["emph"] else fs
            row = (f"Dialogue: 0,{at(ps)},{at(pe)},S,,0,0,0,,"
                   f"{{\\an5\\pos({wx},{wy})\\fs{sz}{POP}}}{txt}")
            (xray_rows if w["emph"] else norm_rows).append(row)

    def ass(rows):
        return (f"[Script Info]\nScriptType: v4.00+\nPlayResX: {W}\nPlayResY: {H}\n"
                f"WrapStyle: 2\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\n"
                "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, "
                "BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, "
                "BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n"
                # plain white Poppins Bold, no hard outline — just a soft drop shadow for
                # legibility over footage (graphic-card windows are suppressed via --skip-windows)
                f"Style: S,{FONTNAME},{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H78000000,0,0,0,0,"
                "100,100,0,0,1,0,4,5,0,0,0,1\n\n[Events]\n"
                "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
                + "\n".join(rows) + "\n")

    fonts = "/tmp/emph_fonts"; os.makedirs(fonts, exist_ok=True)
    shutil.copy(FONT, os.path.join(fonts, os.path.basename(FONT)))
    open("/tmp/emph_norm.ass","w").write(ass(norm_rows))
    open("/tmp/emph_xray.ass","w").write(ass(xray_rows))

    # normal white words drawn on top; emphasis words white-on-black, difference-blended (gbrp)
    fc = (f"[0:v]subtitles=filename=/tmp/emph_norm.ass:fontsdir={fonts}[base];"
          f"color=c=black:s={W}x{H}:r={fps}:d={dur+1},"
          f"subtitles=filename=/tmp/emph_xray.ass:fontsdir={fonts},format=gbrp[txt];"
          f"[base]format=gbrp[b];[b][txt]blend=all_mode=difference,format=yuv420p[v]")
    cmd = [FF,"-y","-i",a.source,"-filter_complex",fc,"-map","[v]","-map","0:a:0",
           "-c:v","libx264","-preset",a.preset,"-crf",a.crf,"-c:a","aac","-b:a","192k",
           "-shortest","-movflags","+faststart", a.output]
    print(f"[subs-emphasis] {len(words)} words · {len(emph)} emphasis · {len(phrases)} phrases · "
          f"{W}x{H} · fs {fs}/{fs_big}")
    subprocess.run(cmd, check=True)
    print(f"[subs-emphasis] wrote {a.output}")


if __name__ == "__main__":
    main()
