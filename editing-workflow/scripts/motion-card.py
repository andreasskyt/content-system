#!/usr/bin/env python3
"""
motion-card.py — render a BRAND brand motion-graphic card to a full-frame silent mp4.

Per-frame PIL rendering piped to ffmpeg. Brand: white bg #FFFFFF, dark green #19281C,
mint #E8F2EC, dark panels #121212. Elements SCALE-POP in (0.6->1.12->1.0, ~120ms,
ease-out overshoot) to match the caption motion. Two card types today:

  label     : centered icon + sequenced text labels that pop in (e.g. support -> e-commerce)
  dashboard : 2-3 dark-mode UI panels that slide up in a stepped cascade, each with an
              ALL-CAPS dark-green header (the signature "stacking dashboards" beat)

Spec JSON:
  {"type":"label","duration":3.3,"icon":"chat","labels":[{"text":"support","appear":0.2},
     {"text":"e-commerce","appear":1.4}]}
  {"type":"dashboard","duration":6.2,"panels":[{"header":"CLIENT ONBOARDING","appear":0.5},
     {"header":"AI SALES SYSTEM","appear":2.5},{"header":"DATA TRACKING","appear":3.7}]}

Usage: python3 scripts/motion-card.py <spec.json> <out.mp4> [--w 1080] [--h 1920] [--fps 24]
"""
import argparse, json, os, subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "assets", "fonts", "Jost-Bold.ttf")
_V = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FFMPEG = _V if os.path.exists(_V) else "ffmpeg"
WHITE, GREEN, MINT, PANEL = (255, 255, 255), (25, 40, 28), (232, 242, 236), (18, 18, 18)
_FCACHE = {}


def font(px):
    px = max(8, int(px))
    if px not in _FCACHE:
        _FCACHE[px] = ImageFont.truetype(FONT, px)
    return _FCACHE[px]


def pop_scale(t, appear, dur=0.12):
    """0 before appear; 0.6->1.12->1.0 overshoot across `dur`; 1.0 after."""
    if t < appear:
        return 0.0
    p = (t - appear) / dur
    if p >= 1:
        return 1.0
    if p < 0.5:
        return 0.6 + (1.12 - 0.6) * (p / 0.5)
    return 1.12 - (1.12 - 1.0) * ((p - 0.5) / 0.5)


def ease_out(p):
    p = max(0.0, min(1.0, p))
    return 1 - (1 - p) ** 3


def text_center(draw, text, px, cx, cy, fill, scale=1.0):
    if scale <= 0:
        return
    f = font(px * scale)
    draw.text((cx, cy), text, font=f, fill=fill, anchor="mm")


def rounded(draw, box, radius, fill, outline=None, width=0):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_chat_icon(img, cx, cy, size, scale):
    """A rounded chat bubble with a simple robot face, dark green on white."""
    if scale <= 0:
        return
    s = size * scale
    d = ImageDraw.Draw(img)
    box = [cx - s / 2, cy - s / 2, cx + s / 2, cy + s / 2]
    rounded(d, box, radius=s * 0.28, fill=GREEN)
    # tail
    d.polygon([(cx - s * 0.10, cy + s / 2 - 2), (cx + s * 0.10, cy + s / 2 - 2),
               (cx - s * 0.02, cy + s / 2 + s * 0.22)], fill=GREEN)
    # robot eyes + mouth in mint
    eye_r = s * 0.06
    for ex in (cx - s * 0.16, cx + s * 0.16):
        d.ellipse([ex - eye_r, cy - s * 0.12 - eye_r, ex + eye_r, cy - s * 0.12 + eye_r], fill=MINT)
    d.rounded_rectangle([cx - s * 0.18, cy + s * 0.06, cx + s * 0.18, cy + s * 0.14],
                        radius=s * 0.04, fill=MINT)


def render_label(spec, t, W, H):
    img = Image.new("RGB", (W, H), WHITE)
    d = ImageDraw.Draw(img)
    draw_chat_icon(img, W // 2, int(H * 0.40), int(W * 0.26),
                   pop_scale(t, spec.get("icon_appear", 0.0), 0.14))
    base = W * 0.085
    for i, lab in enumerate(spec["labels"]):
        y = int(H * (0.56 + i * 0.085))
        text_center(d, lab["text"], base, W // 2, y, GREEN, pop_scale(t, lab["appear"]))
    return img


def draw_panel(img, t, header, appear, y_target_pct, W, H):
    if t < appear:
        return
    d = ImageDraw.Draw(img, "RGBA")
    pw, ph = int(W * 0.80), int(H * 0.235)
    x = (W - pw) // 2
    y_target = int(H * y_target_pct)
    p = ease_out((t - appear) / 0.25)
    y = int(H + (y_target - H) * p)  # slide up from bottom
    # soft shadow
    d.rounded_rectangle([x - 6, y + 10, x + pw + 6, y + ph + 16], radius=34,
                        fill=(0, 0, 0, 60))
    rounded(d, [x, y, x + pw, y + ph], radius=30, fill=PANEL)
    # fake automation node chart: nodes + connectors in mint/green
    ny = y + int(ph * 0.58)
    xs = [x + int(pw * f) for f in (0.16, 0.40, 0.64, 0.86)]
    for j in range(len(xs) - 1):
        d.line([xs[j], ny, xs[j + 1], ny], fill=MINT, width=4)
    for j, nx in enumerate(xs):
        r = 16
        d.ellipse([nx - r, ny - r, nx + r, ny + r],
                  fill=(GREEN if j % 2 else MINT), outline=MINT, width=3)
    # header (all-caps, dark green) inside top of panel
    f = font(int(W * 0.045))
    d.text((x + int(pw * 0.07), y + int(ph * 0.18)), header.upper(), font=f, fill=MINT)


def render_dashboard(spec, t, W, H):
    img = Image.new("RGB", (W, H), WHITE)
    ys = [0.20, 0.43, 0.66]
    for i, pan in enumerate(spec["panels"]):
        draw_panel(img, t, pan["header"], pan["appear"], ys[i % len(ys)], W, H)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec"); ap.add_argument("output")
    ap.add_argument("--w", type=int, default=1080)
    ap.add_argument("--h", type=int, default=1920)
    ap.add_argument("--fps", type=int, default=24)
    a = ap.parse_args()
    spec = json.load(open(a.spec))
    dur = float(spec["duration"])
    n = int(dur * a.fps)
    render = {"label": render_label, "dashboard": render_dashboard}[spec["type"]]

    proc = subprocess.Popen(
        [FFMPEG, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{a.w}x{a.h}", "-r", str(a.fps), "-i", "-",
         "-c:v", "libx264", "-preset", "fast", "-crf", "18",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.output],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for i in range(n):
        t = i / a.fps
        proc.stdin.write(render(spec, t, a.w, a.h).tobytes())
    proc.stdin.close()
    proc.wait()
    print(f"[motion-card] {spec['type']} · {dur:.1f}s · {n} frames -> {a.output}")


if __name__ == "__main__":
    main()
