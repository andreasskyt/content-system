#!/usr/bin/env python3
"""Render story HTML frames to 1080x1920 PNGs.

Usage:
    python3 render.py <html_dir> <out_dir>

Renders every *.html in <html_dir> (sorted) to <out_dir>/<stem>.png.
HTML is authored at 540x960 and captured at device_scale_factor=2.
Blur-reveal: one HTML per frame (reveal state baked in), same as any other frame.
"""

import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright


async def main(html_dir: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    files = sorted(html_dir.glob("*.html"))
    if not files:
        sys.exit(f"no .html files in {html_dir}")
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": 540, "height": 960}, device_scale_factor=2
        )
        for f in files:
            await page.goto(f.resolve().as_uri(), wait_until="networkidle")
            await page.wait_for_timeout(500)
            await page.screenshot(path=out_dir / f"{f.stem}.png")
            print(f"{f.name} -> {f.stem}.png")
        await browser.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    asyncio.run(main(Path(sys.argv[1]), Path(sys.argv[2])))
