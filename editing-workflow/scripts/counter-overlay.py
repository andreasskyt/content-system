#!/usr/bin/env python3
"""
counter-overlay.py — overlay a clean "points" counter (top-right) onto a video.

Renders a small RGBA frame-sequence with PIL and composites it onto the base. White
squircles, Poppins Bold. Three styles:
  counter : persistent squircle showing the current number big + "/N" small; pops on change.
  list    : a vertical column of N numbered squircles that fill one-by-one as points pass.
  fade    : a "k/N" squircle that fades IN at each point start, holds, fades OUT.

Usage:
  python3 scripts/counter-overlay.py <base.mp4> <out.mp4> --style counter|list|fade
      --points "3.0,5.5,10.0,14.6,24.0,30.6,35.8,42.2" [--total 8]
"""
import argparse, math, os, shutil, subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, "..", "assets", "fonts", "Poppins-Bold.ttf")
_V = os.path.join(HERE, "..", "bin", "ffmpeg-libass")
FF = _V if os.path.exists(_V) else "ffmpeg"
GREEN = (25, 40, 28, 255)
WHITE = (255, 255, 255, 255)
_FC = {}


def font(px):
    px = max(8, int(px))
    if px not in _FC:
        _FC[px] = ImageFont.truetype(FONT, px)
    return _FC[px]


def ease(p):
    p = max(0.0, min(1.0, p)); return 1 - (1 - p) ** 3


def pop(dt, dur=0.22):
    if dt < 0 or dt > dur: return 1.0
    p = dt / dur
    return 1.15 - 0.15 * ease(p) if p < 1 else 1.0


def squircle(d, box, r, fill=None, outline=None, width=0):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def badge(num, total, S, scale=1.0, alpha=255):
    """A white squircle with `num` big + /total small. Returns RGBA tile sized for S+pad."""
    pad = int(S * 0.22)
    C = S + pad
    t = Image.new("RGBA", (C, C), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    s = S * scale
    x0 = (C - s) / 2; y0 = (C - s) / 2
    r = s * 0.30
    d.rounded_rectangle([x0 + s * .05, y0 + s * .07, x0 + s, y0 + s + s * .02],
                        radius=r, fill=(0, 0, 0, 55))                 # shadow
    d.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=r, fill=(255, 255, 255, alpha))
    cx = x0 + s / 2
    d.text((cx, y0 + s * 0.42), str(num), font=font(s * 0.44),
           fill=(25, 40, 28, alpha), anchor="mm")
    d.text((cx, y0 + s * 0.74), f"/{total}", font=font(s * 0.19),
           fill=(25, 40, 28, int(alpha * 0.7)), anchor="mm")
    return t


def list_tile(cur, total, sq, gap, scale_new=1.0):
    W = int(sq * 1.34)
    H = total * sq + (total - 1) * gap
    t = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    for i in range(total):
        y = i * (sq + gap)
        done = (i + 1) <= cur
        s = sq * (scale_new if (i + 1) == cur else 1.0)
        off = (sq - s) / 2
        x0 = (W - s) / 2
        box = [x0, y + off, x0 + s, y + off + s]
        if done:
            d.rounded_rectangle([box[0] + 3, box[1] + 4, box[2] + 3, box[3] + 4],
                                radius=s * 0.32, fill=(0, 0, 0, 50))
            d.rounded_rectangle(box, radius=s * 0.32, fill=WHITE)
            d.text((x0 + s / 2, y + off + s / 2), str(i + 1), font=font(s * 0.46),
                   fill=GREEN, anchor="mm")
        else:
            d.rounded_rectangle(box, radius=s * 0.32, outline=(255, 255, 255, 150), width=3)
            d.text((x0 + s / 2, y + off + s / 2), str(i + 1), font=font(s * 0.46),
                   fill=(255, 255, 255, 150), anchor="mm")
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("base"); ap.add_argument("output")
    ap.add_argument("--style", default="counter", choices=["counter", "list", "fade"])
    ap.add_argument("--points", required=True)
    ap.add_argument("--total", type=int, default=0)
    ap.add_argument("--fps", type=int, default=24)
    a = ap.parse_args()
    pts = [float(x) for x in a.points.split(",")]
    total = a.total or len(pts)

    info = subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=width,height", "-of",
        "default=noprint_wrappers=1:nokey=1", a.base]).decode().split()
    W, H = int(info[0]), int(info[1])
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", a.base]).strip())

    S = round(H * 0.135)                     # squircle size for counter/fade
    sq, gap = round(H * 0.052), round(H * 0.018)
    ovx_right = W - round(W * 0.045)         # right margin anchor
    topy = round(H * 0.12)

    tmp = "/tmp/counter_frames"
    if os.path.isdir(tmp):
        for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
    os.makedirs(tmp, exist_ok=True)

    n = int(dur * a.fps)
    for fi in range(n):
        t = fi / a.fps
        cur = sum(1 for p in pts if t >= p)
        frame = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        if cur >= 1:
            if a.style == "list":
                dt = t - pts[cur - 1]
                tile = list_tile(cur, total, sq, gap, scale_new=pop(dt, 0.25))
                frame.paste(tile, (ovx_right - tile.width, topy), tile)
            else:
                dt = t - pts[cur - 1]
                if a.style == "fade":
                    win = (pts[cur] - pts[cur - 1]) if cur < len(pts) else (dur - pts[cur - 1])
                    hold = min(2.0, win - 0.1)
                    al = ease(dt / 0.3) if dt < 0.3 else (
                         ease((hold + 0.3 - dt) / 0.3) if dt > hold else 1.0)
                    al = max(0.0, min(1.0, al))
                    if al <= 0.01:
                        pass
                    else:
                        tile = badge(cur, total, S, scale=1.0, alpha=int(al * 255))
                        frame.paste(tile, (ovx_right - tile.width, topy), tile)
                else:  # counter
                    tile = badge(cur, total, S, scale=pop(dt))
                    frame.paste(tile, (ovx_right - tile.width, topy), tile)
        frame.save(os.path.join(tmp, f"f_{fi+1:05d}.png"))

    fc = "[0:v][1:v]overlay=0:0,format=yuv420p[v]"
    cmd = [FF, "-y", "-i", a.base, "-framerate", str(a.fps), "-i", f"{tmp}/f_%05d.png",
           "-filter_complex", fc, "-map", "[v]", "-map", "0:a:0",
           "-c:v", "libx264", "-preset", "fast", "-crf", "18",
           "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", a.output]
    print(f"[counter-overlay] {a.style} · {total} points · {n} frames -> {a.output}")
    subprocess.run(cmd, check=True)
    print(f"[counter-overlay] wrote {a.output}")


if __name__ == "__main__":
    main()
