#!/usr/bin/env python3
"""
Build carousel.html — an offline swipe viewer with autoplay MP4s per slide.

The preview mirrors the IG frame (420x525 viewport, BRAND progress dots, click/
keyboard/touch navigation) but each slide hosts an autoplaying <video> tag
pointing at slide_N.mp4 (relative path).

Inputs:
  --out-dir  PATH     Carousel folder (must contain slide_*.mp4 files)
  --title    STRING   Optional header label (default: "BRAND")
"""

import argparse
import sys
from pathlib import Path

PREVIEW_WIDTH = 420
PREVIEW_HEIGHT = 525

TEMPLATE = r"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{title} — motion carousel</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --brand-primary: #303b2f;
      --brand-light-bg: #F5F1EA;
      --brand-text-dark: #1A1918;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #111;
      font-family: Poppins, sans-serif;
      color: #fff;
    }}
    .ig-frame {{
      width: {w}px;
      background: #fff;
      color: var(--brand-text-dark);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }}
    .ig-header {{
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid #eee;
      font-size: 13px;
      font-weight: 600;
    }}
    .ig-header img {{ width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }}
    .carousel-viewport {{
      width: {w}px;
      height: {h}px;
      overflow: hidden;
      position: relative;
      background: #000;
    }}
    .carousel-track {{
      display: flex;
      width: 100%;
      height: 100%;
      transition: transform 0.35s ease;
    }}
    .slide {{
      width: {w}px;
      height: {h}px;
      flex-shrink: 0;
      position: relative;
      background: #000;
    }}
    .slide video {{
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }}
    .ig-dots {{
      display: flex;
      justify-content: center;
      gap: 6px;
      padding: 14px 0 18px;
      background: #fff;
    }}
    .ig-dots span {{
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ccc;
      transition: background 0.2s ease;
    }}
    .hint {{
      position: fixed;
      bottom: 20px;
      left: 0; right: 0;
      text-align: center;
      font-size: 12px;
      color: rgba(255,255,255,0.55);
      letter-spacing: 1px;
    }}
  </style>
</head>
<body>
  <div class="ig-frame">
    <div class="ig-header">
      <span>{title}</span>
    </div>
    <div class="carousel-viewport">
      <div class="carousel-track">
{slides_html}
      </div>
    </div>
    <div class="ig-dots">
{dots_html}
    </div>
  </div>
  <div class="hint">← / → or click to navigate</div>

  <script>
  (function() {{
    const track = document.querySelector('.carousel-track');
    const viewport = document.querySelector('.carousel-viewport');
    const slides = document.querySelectorAll('.carousel-track .slide');
    const dots = document.querySelectorAll('.ig-dots span');
    const videos = Array.from(document.querySelectorAll('.carousel-track video'));
    const TOTAL = slides.length;
    const SLIDE_W = {w};
    let idx = 0;

    function go(n) {{
      idx = Math.max(0, Math.min(TOTAL - 1, n));
      track.style.transform = 'translateX(' + (-idx * SLIDE_W) + 'px)';
      dots.forEach((d, i) => d.style.background = i === idx ? '#303b2f' : '#ccc');
      videos.forEach((v, i) => {{
        if (i === idx) {{
          v.currentTime = 0;
          v.play().catch(() => {{}});
        }} else {{
          v.pause();
        }}
      }});
    }}

    viewport.addEventListener('click', (e) => {{
      const rect = viewport.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.3) go(idx - 1); else go(idx + 1);
    }});

    document.addEventListener('keydown', (e) => {{
      if (e.key === 'ArrowRight' || e.key === ' ') {{ e.preventDefault(); go(idx + 1); }}
      if (e.key === 'ArrowLeft') {{ e.preventDefault(); go(idx - 1); }}
    }});

    dots.forEach((d, i) => {{
      d.style.cursor = 'pointer';
      d.addEventListener('click', () => go(i));
    }});

    let touchX = null;
    viewport.addEventListener('touchstart', (e) => {{ touchX = e.touches[0].clientX; }});
    viewport.addEventListener('touchend', (e) => {{
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1);
      touchX = null;
    }});

    go(0);
  }})();
  </script>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--title", default="BRAND")
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    if not out_dir.exists():
        print(f"ERROR: out-dir missing: {out_dir}", file=sys.stderr)
        return 1

    mp4s = sorted(out_dir.glob("slide_*.mp4"), key=lambda p: int(p.stem.split("_")[1]))
    if not mp4s:
        print(f"ERROR: no slide_*.mp4 files in {out_dir}", file=sys.stderr)
        return 1

    slides_html = "\n".join(
        f'        <div class="slide"><video src="{p.name}" autoplay muted loop playsinline preload="auto"></video></div>'
        for p in mp4s
    )
    dots_html = "\n".join(
        f'      <span></span>' for _ in mp4s
    )

    html = TEMPLATE.format(
        title=args.title,
        w=PREVIEW_WIDTH,
        h=PREVIEW_HEIGHT,
        slides_html=slides_html,
        dots_html=dots_html,
    )

    out_path = out_dir / "carousel.html"
    out_path.write_text(html)
    print(f"[motion-carousel] wrote preview: {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
