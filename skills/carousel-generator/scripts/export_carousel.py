#!/usr/bin/env python3
"""Export an IG carousel HTML into 1080x1350 PNG slides using Playwright.

Usage:
    python3 export_carousel.py --html /path/to/carousel.html --out /path/to/output-dir --slides 7

The HTML must contain an `.ig-frame` wrapping a `.carousel-viewport` that
wraps a `.carousel-track` with N slides (each 420px wide). See
references/components.md for the expected structure.
"""

import argparse
import asyncio
import sys
from pathlib import Path


async def export_slides(html_path: Path, out_dir: Path, total_slides: int) -> None:
    try:
        from playwright.async_api import async_playwright  # type: ignore
    except ImportError:
        print(
            "playwright is not installed. Run:\n"
            "  pip install playwright && python3 -m playwright install chromium",
            file=sys.stderr,
        )
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)

    VIEW_W = 420
    VIEW_H = 525
    SCALE = 1080 / VIEW_W  # 2.5714...

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": VIEW_W, "height": VIEW_H},
            device_scale_factor=SCALE,
        )

        # Load via file:// so relative image paths (e.g. profile.png) resolve.
        await page.goto(html_path.as_uri(), wait_until="networkidle")

        # Give Google Fonts time to load before screenshotting
        await page.wait_for_timeout(3000)

        # Hide IG preview chrome — we only want the slide viewport
        await page.evaluate(
            """() => {
            document.querySelectorAll('.ig-header,.ig-dots,.ig-actions,.ig-caption')
                .forEach(el => el.style.display = 'none');

            const frame = document.querySelector('.ig-frame');
            if (frame) {
                frame.style.cssText = 'width:420px;height:525px;max-width:none;border-radius:0;box-shadow:none;overflow:hidden;margin:0;';
            }

            const viewport = document.querySelector('.carousel-viewport');
            if (viewport) {
                viewport.style.cssText = 'width:420px;height:525px;aspect-ratio:unset;overflow:hidden;cursor:default;position:relative;';
            }

            document.body.style.cssText = 'padding:0;margin:0;display:block;overflow:hidden;';
        }"""
        )
        await page.wait_for_timeout(500)

        for i in range(total_slides):
            await page.evaluate(
                """(idx) => {
                const track = document.querySelector('.carousel-track');
                if (!track) return;
                track.style.transition = 'none';
                track.style.transform = 'translateX(' + (-idx * 420) + 'px)';
            }""",
                i,
            )
            await page.wait_for_timeout(400)

            out_path = out_dir / f"slide_{i + 1}.png"
            await page.screenshot(
                path=str(out_path),
                clip={"x": 0, "y": 0, "width": VIEW_W, "height": VIEW_H},
            )
            print(f"Exported {out_path}")

        await browser.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Export IG carousel HTML to 1080x1350 PNG slides.")
    parser.add_argument("--html", required=True, help="Path to the carousel HTML file")
    parser.add_argument("--out", required=True, help="Output directory for slide PNGs")
    parser.add_argument("--slides", type=int, required=True, help="Total number of slides")
    args = parser.parse_args()

    html_path = Path(args.html).expanduser().resolve()
    out_dir = Path(args.out).expanduser().resolve()

    if not html_path.exists():
        print(f"HTML file not found: {html_path}", file=sys.stderr)
        sys.exit(1)

    if args.slides < 1:
        print("--slides must be >= 1", file=sys.stderr)
        sys.exit(1)

    asyncio.run(export_slides(html_path, out_dir, args.slides))


if __name__ == "__main__":
    main()
