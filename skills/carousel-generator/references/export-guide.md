# Export guide

The carousel HTML is designed at **420px wide**. Playwright uses `device_scale_factor` to render at 1080px without changing the layout — fonts, spacing, and positions stay exactly as in the preview.

Target output: **1080×1350px PNG per slide** (Instagram 4:5 carousel spec).
Scale factor: `1080 / 420 = 2.5714`.

---

## Critical rules

1. **Keep the 420px layout width.** Never set the Playwright viewport to 1080px wide — that would reflow the layout and break every carousel.
2. **Generate HTML with Python.** Shell heredocs with variable interpolation corrupt `$` signs, backticks, and numeric tokens. Always use Python's `Path.write_text()`.
3. **Embed images as base64.** Any user-uploaded screenshots or photos must be base64-encoded data URIs (`data:image/jpeg;base64,...`) so Playwright's headless browser can load them without a web server. Check the real file type with the `file` command before choosing MIME — Instagram screenshots with a `.png` extension are often JPEGs.
4. **Wait for fonts.** Add `await page.wait_for_timeout(3000)` after `set_content` so Google Fonts load before the first screenshot. Otherwise headlines render in fallback sans.
5. **Hide the IG preview chrome before screenshotting.** Hide `.ig-header`, `.ig-dots`, `.ig-actions`, `.ig-caption` — only the 420×525 viewport gets captured.

---

## Running the export

```bash
python3 scripts/export_carousel.py \
  --html /path/to/carousel.html \
  --out /path/to/output-dir \
  --slides 7
```

The script (`scripts/export_carousel.py`) handles everything — just pass the HTML path, output directory, and slide count.

It will:
1. Launch Chromium headless at 420×525 viewport, `device_scale_factor=2.5714`
2. Load the HTML, wait 3s for fonts
3. Hide IG frame chrome
4. For each slide: translate the carousel track to the correct offset, screenshot the 420×525 viewport clip
5. Save to `{out}/slide_1.png`, `slide_2.png`, ... ready to upload

---

## Mistakes to avoid

| Mistake | Symptom | Fix |
|---|---|---|
| Viewport set to 1080×1350 | Layout reflows, fonts tiny, spacing broken | Keep viewport at 420×525, use device_scale_factor |
| No wait_for_timeout after set_content | Headlines in fallback system font | `await page.wait_for_timeout(3000)` |
| IG frame chrome not hidden | Export includes header/dots/caption | JS-hide `.ig-header,.ig-dots,.ig-actions,.ig-caption` before screenshot |
| Changed .ig-frame width | Everything misaligned vs preview | Always keep 420px |
| Shell script generating HTML | `$`, backticks, numbers corrupted | Use Python for file writes |
| Relative image paths | 404s in headless browser | Base64-encode images as data URIs |
| Wrong image MIME | Image doesn't render | `file actual_image.png` to check real format |

---

## Under the hood

- `device_scale_factor=2.5714` tells the browser to render at high DPI. A 420px-wide element produces a 1080px-wide output image. The CSS layout stays at 420px — nothing reflows.
- `clip={"x":0,"y":0,"width":420,"height":525}` restricts the screenshot to the carousel viewport only.
- Before each slide screenshot, we translate `.carousel-track` by `-index * 420` pixels and disable the CSS transition so the slide snaps instantly into position.
