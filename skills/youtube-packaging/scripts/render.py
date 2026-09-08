#!/usr/bin/env python3
"""Render thumbnail concepts from a spec into 2560x1440 PNGs + a feed-size sheet.

    python3 render.py spec.json

Spec:
{
  "slug": "why-dashboards-fail",
  "out_dir": "/abs/path/to/video-folder",
  "concepts": [{
    "id": "a",
    "name": "broken dashboard",              // shown on the contact sheet only
    "bg": "bg-dots",                          // bg-dots|bg-grid|bg-paper|bg-dark|bg-brand|bg-accent-wash
    "accent": "#e5484d",
    "subject": {"file":"DSC00490","side":"left","height":640,"x":-42,"y":-26},
    "artifact": {"html":"<div class='win'>...</div>","pos":"right","width":706,
                 "height":706,"top":52,"inset":34,"rotate":-1.6,"over_subject":true},
    "headline": {"text":"NEVER|DO THIS","style":"h-stamp","pos":"br",
                 "x":74,"y":66,"rotate":-9,"size":62,"sub":"optional kicker"},
    "decor": "<div class='badge' style='left:436px;bottom:186px'>...</div>",
    "extra_css": ""
  }]
}

Every geometry field is optional. "text" splits on "|" into lines.
Artifact/decor HTML is authored per concept — compose it from templates/partials/.
"""

import asyncio
import json
import sys
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL / "templates" / "thumb.html"
PHOTOS = SKILL / "assets" / "cutouts"

W, H, SCALE = 1280, 720, 2


def build_subject(s):
    if not s:
        return ""
    side = s.get("side", "left")
    photo = PHOTOS / f"{s['file']}.png"
    if not photo.exists():
        sys.exit(f"missing photo: {photo}")
    style = [f"height:{s.get('height', 640)}px"]
    style.append(f"{side}:{s.get('x', -40)}px")
    style.append(f"bottom:{s.get('y', -26)}px")
    if s.get("flip"):
        style.append("transform:scaleX(-1)")
    return f'<img class="subject {side}" style="{";".join(style)}" src="{photo}">'


def build_artifact(a):
    if not a:
        return ""
    pos = a.get("pos", "right")
    style = []
    if a.get("width"):
        style.append(f"width:{a['width']}px")
    if a.get("height"):
        style.append(f"height:{a['height']}px")
    if pos in ("left", "right"):
        style.append(f"{pos}:{a.get('inset', 34)}px")
        style.append(f"top:{a.get('top', 52)}px")
    if a.get("rotate"):
        t = f"rotate({a['rotate']}deg)"
        style.append(f"transform:{'translate(-50%,-50%) ' + t if pos == 'center' else t}")
    over = " over-subject" if a.get("over_subject") else ""
    return f'<div class="artifact {pos}{over}" style="{";".join(style)}">{a["html"]}</div>'


def build_headline(h):
    if not h:
        return ""
    pos = h.get("pos", "bl")
    lines = "<br>".join(h["text"].split("|"))
    inner_style = []
    if h.get("size"):
        inner_style.append(f"font-size:{h['size']}px")
    # explicit offsets override the corner defaults
    outer_style = []
    if "x" in h:
        outer_style.append(f"{'right' if pos in ('tr', 'br') else 'left'}:{h['x']}px")
    if "y" in h:
        outer_style.append(f"{'bottom' if pos in ('bl', 'br') else 'top'}:{h['y']}px")
    if h.get("rotate"):
        outer_style.append(f"transform:rotate({h['rotate']}deg)")
    sub = f'<span class="sub">{h["sub"]}</span>' if h.get("sub") else ""
    return (
        f'<div class="headline {pos}" style="{";".join(outer_style)}">'
        f'<div class="{h.get("style", "h-solid")}" style="{";".join(inner_style)}">{lines}</div>'
        f"{sub}</div>"
    )


def compose(c):
    html = TEMPLATE.read_text()
    return (
        html.replace("{{SKILL}}", str(SKILL))
        .replace("{{ACCENT}}", c.get("accent", "#e5484d"))
        .replace("{{BG_CLASS}}", c.get("bg", "bg-dots"))
        .replace("{{ARTIFACT}}", build_artifact(c.get("artifact")))
        .replace("{{SUBJECT}}", build_subject(c.get("subject")))
        .replace("{{HEADLINE}}", build_headline(c.get("headline")))
        .replace("{{DECOR}}", c.get("decor", ""))
        .replace("{{EXTRA_CSS}}", c.get("extra_css", ""))
    )


async def run(spec_path: Path):
    spec = json.loads(spec_path.read_text())
    out = Path(spec["out_dir"]).expanduser().resolve()
    src = out / "_src"
    out.mkdir(parents=True, exist_ok=True)
    src.mkdir(exist_ok=True)

    from playwright.async_api import async_playwright

    made = []
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(
            viewport={"width": W, "height": H}, device_scale_factor=SCALE
        )
        for c in spec["concepts"]:
            f = src / f"{c['id']}.html"
            f.write_text(compose(c))
            await page.goto(f.as_uri(), wait_until="networkidle")
            await page.wait_for_timeout(400)          # let webfonts + filters settle
            png = out / f"{spec['slug']}_{c['id']}.png"
            await page.screenshot(path=str(png))
            made.append((png, c.get("name", c["id"])))
            print(png)
        await browser.close()

    # Feed test: every concept at the width YouTube actually shows on mobile.
    from contact_sheet import build as sheet

    await sheet([str(p) for p, _ in made], out / "_feed-test.png", cols=3, tile=320, label=True)


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    asyncio.run(run(Path(sys.argv[1])))
