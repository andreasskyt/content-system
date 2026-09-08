#!/usr/bin/env python3
"""Render a BRAND reel thumbnail (1080x1920) in dark and light, from a headline.

    python3 thumbnail.py --headline 'the <em>real reason</em><br>your dashboards<br>never <em>work</em>' \
                        --out "Marketing/Short Form/my-reel"

Italics go on the words carrying the pressure — the promise and the verdict — not on
the topic or the buzzword. One or two <em> runs per headline, at the start or end of a
line. Use <br> to break lines by hand; the design never auto-wraps.

Writes thumb_dark.png, thumb_light.png and thumbnail.html into --out.
"""

import argparse
import asyncio
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / "assets" / "reel-thumbnail.html"


async def render(html_path: Path, out_dir: Path) -> None:
    try:
        from playwright.async_api import async_playwright  # type: ignore
    except ImportError:
        sys.exit("playwright missing. Run: pip install playwright && python3 -m playwright install chromium")

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1080, "height": 1920})
        await page.goto(html_path.as_uri(), wait_until="networkidle")
        await page.wait_for_timeout(3000)  # Google Fonts
        for variant in ("dark", "light"):
            out = out_dir / f"thumb_{variant}.png"
            await page.locator(f"#{variant}").screenshot(path=str(out))
            print(f"Exported {out}")
        await browser.close()


def main() -> None:
    ap = argparse.ArgumentParser(description="Render a BRAND reel thumbnail, dark + light.")
    ap.add_argument("--headline", required=True, help="Headline HTML. <em> for italics, <br> for line breaks.")
    ap.add_argument("--out", required=True, help="Content folder to write into")
    ap.add_argument("--kicker", default="BRAND")
    args = ap.parse_args()

    out_dir = Path(args.out).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    headline = args.headline.replace("<em>", '<span class="em">').replace("</em>", "</span>")
    html_path = out_dir / "thumbnail.html"
    html_path.write_text(
        TEMPLATE.read_text().replace("__HEADLINE__", headline).replace("__KICKER__", args.kicker)
    )

    asyncio.run(render(html_path, out_dir))


if __name__ == "__main__":
    main()
