#!/usr/bin/env python3
"""Tile images into one PNG so a whole set can be judged in a single look.

Two jobs:
  1. Tagging the photo library    — many small tiles, filename captions.
  2. The feed test on 5 concepts  — tiles rendered at real YouTube feed width
                                    (~320px), which is the only size that matters.

    python3 contact_sheet.py --out sheet.png --cols 7 --tile 260 img1.png img2.png ...
    python3 contact_sheet.py --out sheet.png --cols 3 --tile 320 --label a.png b.png
"""

import argparse
import asyncio
from pathlib import Path


CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{background:#eceff3;font-family:-apple-system,Helvetica,sans-serif;padding:14px}
.grid{display:grid;gap:12px}
.cell{background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.13)}
.cell img{display:block;width:100%;height:auto;background:
  repeating-conic-gradient(#e9edf2 0% 25%, #fff 0% 50%) 50%/16px 16px}
.cap{font-size:11px;font-weight:700;color:#33404f;padding:5px 7px;
     white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
"""


async def build(images, out: Path, cols: int, tile: int, label: bool) -> None:
    from playwright.async_api import async_playwright

    cells = []
    for p in images:
        cap = f'<div class="cap">{Path(p).stem}</div>' if label else ""
        cells.append(f'<div class="cell"><img src="{Path(p).resolve().as_uri()}">{cap}</div>')

    html = (
        f"<!doctype html><meta charset='utf-8'><style>{CSS}"
        f".grid{{grid-template-columns:repeat({cols},{tile}px)}}</style>"
        f"<div class='grid'>{''.join(cells)}</div>"
    )
    out = out.resolve()
    tmp = out.parent / "_sheet.html"
    tmp.write_text(html)

    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        pg = await b.new_page(viewport={"width": cols * (tile + 12) + 40, "height": 900})
        await pg.goto(tmp.as_uri(), wait_until="networkidle")
        await pg.screenshot(path=str(out), full_page=True)
        await b.close()
    tmp.unlink(missing_ok=True)
    print(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("images", nargs="+")
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--cols", type=int, default=5)
    ap.add_argument("--tile", type=int, default=300)
    ap.add_argument("--label", action="store_true")
    a = ap.parse_args()
    asyncio.run(build(a.images, a.out, a.cols, a.tile, a.label))
