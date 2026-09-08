#!/usr/bin/env python3
"""
subs.py — BRAND caption engine. Two locked styles, word-by-word BUILD-ON, tight spacing.

Key idea: each caption line is rendered as ONE libass event (libass kerns it → tight, no
hand-placed gaps). Emphasis words are split onto a difference-blend "x-ray" layer using a
transparent-alpha trick: both layers render the IDENTICAL line (same words, same \\fs sizes,
so identical libass layout); on the normal layer the emphasis words are alpha=transparent,
on the x-ray layer the normal words are alpha=transparent. They overlay in perfect register.

Styles (default = creator-a):
  creator-a : white Poppins Bold; words BUILD ON one at a time (i / i have / i have a / i have
           a CAT); emphasis words bigger + x-ray-invert. Multi-word lines, centered, lower-third.
  xray   : whole caption x-ray-inverted; ONE WORD per line, big & fat, centered (h+v center),
           hold-until-next.

Landscape gets bigger text and wider lines automatically.

Usage:
  python3 scripts/subs.py <src> <whisper_json> <out.mp4>
      [--style creator-a|xray] [--emphasis "2,7,16,..."] [--skip-windows "a-b,c-d"]
      [--size-pct N] [--emph-scale 1.7] [--y N] [--maxw N]
"""
import argparse, json, os, shutil, subprocess
from PIL import ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "assets", "fonts", "Poppins-Bold.ttf")
FONTNAME = "Poppins"
_V = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FF = _V if os.path.exists(_V) else "ffmpeg"
SENT = ".?!"; STRIP = ".,!?;:\"'"
ACRONYMS = {"ai": "AI", "api": "API", "ui": "UI", "seo": "SEO", "crm": "CRM", "dm": "DM",
            "kpi": "KPI", "kpis": "KPIs", "icp": "ICP", "va": "VA"}  # always uppercase


def at(t):
    if t < 0: t = 0
    return f"{int(t//3600)}:{int((t%3600)//60):02d}:{t%60:05.2f}"


def load_words(p):
    d = json.load(open(p)); out = []
    for s in d.get("segments", []):
        for w in s.get("words", []):
            t = (w.get("word") or "").strip()
            if t:
                low = t.strip(STRIP).lower() or t.lower()
                disp = ACRONYMS.get(low, low)   # AI/API/etc. always uppercase
                out.append({"raw": t, "t": disp,
                            "s": float(w["start"]), "e": float(w["end"])})
    return out


def units_creator-a(words, maxw, gap, maxpx, long_dur=0.7):
    """Build-units that accumulate word-by-word; break on sentence end / gap / maxw / a
    pause-extended word (Whisper bakes a pause into a word's duration, e.g. a trailing
    'and' before a 1s gap — break there so the prior clause clears instead of riding on).
    ALSO break on pixel width (maxpx): a phrase NEVER wraps to a second line — when the next
    word wouldn't fit on the current line, start a fresh line and keep building word-by-word."""
    us, cur, curpx = [], [], 0.0
    for i, w in enumerate(words):
        wpx = w.get("px", 0.0)
        if cur and (curpx + wpx) > maxpx:        # width overflow -> new single line before this word
            us.append(cur); cur = []; curpx = 0.0
        cur.append(w); curpx += wpx
        endp = w["raw"][-1] in SENT
        ng = (words[i+1]["s"] - w["e"]) if i+1 < len(words) else 99
        longw = (w["e"] - w["s"]) >= long_dur
        if endp or len(cur) >= maxw or ng >= gap or longw:
            us.append(cur); cur = []; curpx = 0.0
    if cur: us.append(cur)
    return us


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source"); ap.add_argument("whisper_json"); ap.add_argument("output")
    ap.add_argument("--style", default="creator-a", choices=["creator-a", "xray"])
    ap.add_argument("--emphasis", default="")
    ap.add_argument("--red", default="")  # word indices rendered CAPS + big + red (no x-ray invert)
    ap.add_argument("--red-hex", default="#FF1A1A")  # red colour for --red words
    ap.add_argument("--skip-windows", default="")
    ap.add_argument("--size-pct", type=float, default=0.0)   # 0 = auto by style+orientation
    ap.add_argument("--emph-scale", type=float, default=1.6)  # emphasis bigger too
    ap.add_argument("--y", type=float, default=0.0)          # 0 = auto
    ap.add_argument("--maxw", type=int, default=0)           # 0 = auto
    ap.add_argument("--gap", type=float, default=0.45)       # build-unit break on pause >= this
    ap.add_argument("--hold", type=float, default=0.12)
    ap.add_argument("--preset", default="fast"); ap.add_argument("--crf", default="18")
    a = ap.parse_args()

    info = subprocess.check_output(["ffprobe","-v","error","-select_streams","v:0",
        "-show_entries","stream=width,height,r_frame_rate","-of",
        "default=noprint_wrappers=1:nokey=1", a.source]).decode().split()
    W, H = int(info[0]), int(info[1])
    num, den = (info[2].split("/")+["1"])[:2]; fps = max(1, round(float(num)/float(den)))
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries",
        "format=duration","-of","default=noprint_wrappers=1:nokey=1", a.source]).strip())
    land = W >= H

    # auto defaults per style + orientation
    if a.style == "xray":
        size = a.size_pct or (10.0 if land else 9.0)
        y = a.y or 50.0; maxw = 1
    else:
        size = a.size_pct or (9.6 if land else 7.2)   # slightly bigger again ([YOUR_NAME], batch)
        y = a.y or 76.0; maxw = a.maxw or 4
    fs = round(size/100.0*H); fs_big = round(fs*a.emph_scale)
    posx, posy = W//2, round(y/100.0*H)

    emph = set(int(x) for x in a.emphasis.split(",") if x.strip().isdigit())
    red = set(int(x) for x in a.red.split(",") if x.strip().isdigit())
    emph -= red  # red takes precedence over x-ray emphasis
    # ASS \c colour is &HBBGGRR&; convert #RRGGBB
    _h = a.red_hex.lstrip("#")
    RED_C = f"&H00{_h[4:6]}{_h[2:4]}{_h[0:2]}&".upper()
    skip = []
    for c in a.skip_windows.split(","):
        if "-" in c:
            s0, e0 = c.split("-"); skip.append((float(s0), float(e0)))

    words = load_words(a.whisper_json)
    for gi, w in enumerate(words):
        if gi in red:
            w["cat"] = "red"; w["emph"] = False; w["big"] = True   # CAPS + big + red, on normal layer
        elif (gi in emph) or (a.style == "xray"):
            w["cat"] = "xray"; w["emph"] = True; w["big"] = True   # x-ray difference invert
        else:
            w["cat"] = "norm"; w["emph"] = False; w["big"] = False

    # measure rendered advance width per word (emphasis words use the bigger size) so a
    # phrase NEVER wraps to a second line — units break on pixel width (see units_creator-a).
    font_n = ImageFont.truetype(FONT, fs)
    font_b = ImageFont.truetype(FONT, fs_big)
    for w in words:
        f = font_b if w["big"] else font_n
        mt = w["t"].upper() if w["cat"] == "red" else w["t"]
        w["px"] = f.getlength(mt + " ")
    maxpx = 0.90 * W

    FADE = 150  # ms — each word fades in smoothly (no choppy hard-cut, no jumpy re-center)

    def unit_text(unit, u_start, layer):
        # ONE event for the whole phrase, laid out once (fixed positions = no re-center jump).
        # Each shown word fades alpha FF->00 at its spoken time; off-layer words stay invisible
        # but keep their space so both layers register perfectly.
        prefix = f"{{\\an5\\pos({posx},{posy})}}"
        toks = []
        for w in unit:
            sz = fs_big if w["big"] else fs
            show = ((w["cat"] == "xray") if layer == "xray" else (w["cat"] != "xray"))
            txt = w["t"].replace("{", "").replace("}", "").replace("\\", "")
            if w["cat"] == "red":
                txt = txt.upper()
            # On the normal layer set colour explicitly per word so a preceding red
            # word never bleeds its colour onto the words that follow it.
            color = ""
            if layer != "xray":
                color = RED_C if w["cat"] == "red" else "&H00FFFFFF&"
                color = f"\\c{color}"
            if show:
                ap = max(0, round((w["s"] - u_start) * 1000))
                tag = f"\\fs{sz}{color}\\alpha&HFF&\\t({ap},{ap+FADE},\\alpha&H00&)"
            else:
                tag = f"\\fs{sz}{color}\\alpha&HFF&"
            toks.append(f"{{{tag}}}{txt}")
        return prefix + " ".join(toks)

    # creator-a = phrase fills in word-by-word (fade); xray = one word per event, hold to next
    if a.style == "xray":
        unit_list = [([w], w["s"],
                      (words[i+1]["s"] if i+1 < len(words) else min(w["e"]+0.4, dur)))
                     for i, w in enumerate(words)]
    else:
        us = units_creator-a(words, maxw, a.gap, maxpx)
        unit_list = []
        for j, u in enumerate(us):
            end = u[-1]["e"] + a.hold
            if j + 1 < len(us):                       # a phrase must CLEAR before the next starts
                end = min(end, us[j+1][0]["s"])        # (fixes emphasis word lingering into next line)
            unit_list.append((u, u[0]["s"], end))

    norm_rows, xray_rows = [], []
    for unit, s0, e0 in unit_list:
        if e0 <= s0: e0 = s0 + 0.05
        if any(a0 <= (s0+e0)/2 <= b0 for a0, b0 in skip):
            continue
        norm_rows.append(f"Dialogue: 0,{at(s0)},{at(e0)},N,,0,0,0,,{unit_text(unit,s0,'norm')}")
        if any(w["cat"] == "xray" for w in unit):
            xray_rows.append(f"Dialogue: 0,{at(s0)},{at(e0)},X,,0,0,0,,{unit_text(unit,s0,'xray')}")

    def ass(rows, style_line):
        return ("[Script Info]\nScriptType: v4.00+\n"
                f"PlayResX: {W}\nPlayResY: {H}\nWrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
                "[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
                "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, "
                "Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, "
                f"Encoding\n{style_line}\n\n[Events]\nFormat: Layer, Start, End, Style, Name, "
                "MarginL, MarginR, MarginV, Effect, Text\n" + "\n".join(rows) + "\n")

    # normal layer: white + VERY subtle shadow (Shadow=1, ~22% opacity — not a hard black drop).
    # xray layer: white, no shadow (clean difference)
    norm_style = (f"Style: N,{FONTNAME},{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&HC8000000,"
                  "0,0,0,0,100,100,0,0,1,0,1,5,0,0,0,1")
    xray_style = (f"Style: X,{FONTNAME},{fs},&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,"
                  "0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1")
    fonts = "/tmp/subs_fonts"; os.makedirs(fonts, exist_ok=True)
    shutil.copy(FONT, os.path.join(fonts, os.path.basename(FONT)))
    open("/tmp/subs_norm.ass","w").write(ass(norm_rows, norm_style))
    open("/tmp/subs_xray.ass","w").write(ass(xray_rows, xray_style))

    fc = (f"[0:v]subtitles=filename=/tmp/subs_norm.ass:fontsdir={fonts}[base];"
          f"color=c=black:s={W}x{H}:r={fps}:d={dur+1},"
          f"subtitles=filename=/tmp/subs_xray.ass:fontsdir={fonts},format=gbrp[txt];"
          f"[base]format=gbrp[b];[b][txt]blend=all_mode=difference,format=yuv420p[v]")
    cmd = [FF,"-y","-i",a.source,"-filter_complex",fc,"-map","[v]","-map","0:a:0",
           "-c:v","libx264","-preset",a.preset,"-crf",a.crf,"-c:a","aac","-b:a","192k",
           "-shortest","-movflags","+faststart", a.output]
    print(f"[subs] style={a.style} · {len(words)} words · {len(emph)} emphasis · "
          f"{'landscape' if land else 'vertical'} · fs {fs}/{fs_big} · build-on")
    subprocess.run(cmd, check=True)
    print(f"[subs] wrote {a.output}")


if __name__ == "__main__":
    main()
