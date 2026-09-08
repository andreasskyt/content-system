#!/usr/bin/env python3
"""
Render an animated BRAND carousel as a single 1080x1920 Reel MP4.

Output layout:
  {out-dir}/
    reel.mp4          — the single-video reel (the thing you upload)
    preview.html      — autoplay browser wrapper for quick preview
    specs.json        — archived slide specs (reproducible future runs)
    slides/
      slide_1.png     — per-slide midpoint stills (reference / reuse)
      slide_2.png
      ...

Inputs:
  --spec-file  PATH        JSON array of slide specs (identical to motion-carousel)
  --out-dir    PATH        Output folder (must already exist)
  --slug       STRING      Used for props temp filename
  --mode       draft|final Quality tier (default: final)
  --hold       INT         Frames per slide hold (default 75 = 2.5s at 30fps)
  --transition INT         Swipe transition frames (default 18 = 0.6s)
  --stills / --no-stills   Emit per-slide PNGs in slides/ (default: on)
  --title      STRING      Fat title shown above the card (default: "The motion carousel system")
  --handle     STRING      Footer handle (default: "@[IG_HANDLE]")
"""

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

SHARED_SKILL = Path("~/.claude/skills/motion-carousel")
REMOTION_DIR = SHARED_SKILL / "remotion"
ENTRY = "src/index.ts"
REEL_COMPOSITION = "CarouselReel"
SLIDE_COMPOSITION = "CarouselSlide"


def fail(msg: str, code: int = 1) -> None:
    print(f"[motion-reel-carousel] ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def ensure_remotion_installed() -> None:
    if not (REMOTION_DIR / "node_modules").exists():
        fail(
            "Shared Remotion project not installed. Run:\n"
            f"  bash {SHARED_SKILL}/scripts/install_remotion.sh"
        )


def prepare_photo_assets(specs: list[dict]) -> None:
    public_dir = REMOTION_DIR / "public"
    public_dir.mkdir(exist_ok=True)
    src_profile = SHARED_SKILL / "assets" / "profile.png"
    dst_profile = public_dir / "profile.png"
    if src_profile.exists() and not dst_profile.exists():
        shutil.copy2(src_profile, dst_profile)

    for i, spec in enumerate(specs):
        photo = spec.get("photo")
        if not photo or not isinstance(photo, dict):
            continue
        src = photo.get("src")
        if not src or src.startswith(("http://", "https://")):
            continue
        p = Path(src).expanduser()
        if not p.is_absolute():
            p = (SHARED_SKILL / p).resolve()
        if not p.exists():
            print(f"[motion-reel-carousel] WARN: photo not found: {p} (slide {i+1})")
            continue
        rel = f"photo_slide_{i+1:02d}{p.suffix.lower()}"
        shutil.copy2(p, public_dir / rel)
        photo["src"] = rel


def render_reel_mp4(out_dir: Path, props_file: Path, mode: str) -> None:
    reel_path = out_dir / "reel.mp4"
    cmd = [
        "npx", "remotion", "render",
        ENTRY, REEL_COMPOSITION,
        str(reel_path),
        f"--props={props_file}",
    ]
    if mode == "draft":
        cmd += ["--scale=0.5", "--every-nth-frame=2"]
    print(f"[motion-reel-carousel] rendering reel.mp4 ({mode})...")
    subprocess.run(cmd, cwd=REMOTION_DIR, check=True)


def render_slide_stills(out_dir: Path, specs: list[dict], slug: str) -> None:
    slides_dir = out_dir / "slides"
    slides_dir.mkdir(exist_ok=True)
    for i, spec in enumerate(specs):
        props_file = Path(f"/tmp/motion_reel_{slug}_still_{i+1:02d}.json")
        still_spec = dict(spec)
        still_spec["slideIndex"] = i
        still_spec["totalSlides"] = len(specs)
        # Slide stills show slide-level lockup + progress bar so they're useful
        # standalone (unlike reel mode which hides them in favor of reel chrome).
        still_spec["showLockup"] = still_spec.get("showLockup", True)
        still_spec["showProgress"] = still_spec.get("showProgress", True)
        props = {
            "spec": still_spec,
            "durationFrames": 90,
            "widthOverride": 1080,
            "heightOverride": 1350,
        }
        props_file.write_text(json.dumps(props))
        out_path = slides_dir / f"slide_{i+1}.png"
        cmd = [
            "npx", "remotion", "still",
            ENTRY, SLIDE_COMPOSITION,
            f"--frame=45",
            f"--output={out_path}",
            f"--props={props_file}",
        ]
        print(f"[motion-reel-carousel] still slides/slide_{i+1}.png")
        try:
            subprocess.run(cmd, cwd=REMOTION_DIR, check=True)
        finally:
            try:
                props_file.unlink()
            except OSError:
                pass


def write_preview_html(
    out_dir: Path, title: str, slide_count: int, duration_sec: float
) -> None:
    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>{escape(title)} — motion reel</title>
  <style>
    * {{ box-sizing: border-box; }}
    html, body {{ margin: 0; height: 100%; }}
    body {{
      background: #0a0a0a;
      color: rgba(255,255,255,0.75);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    .wrap {{
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }}
    h1 {{
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.9);
    }}
    video {{
      width: auto;
      height: min(90vh, 1000px);
      aspect-ratio: 9 / 16;
      border-radius: 20px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
      background: #000;
    }}
    .meta {{
      font-size: 13px;
      color: rgba(255,255,255,0.45);
      letter-spacing: 0.3px;
    }}
    .hint {{
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      margin-top: 4px;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>{escape(title)}</h1>
    <video src="reel.mp4" autoplay muted loop playsinline controls></video>
    <div class="meta">{duration_sec:.1f}s · {slide_count} slides</div>
    <div class="hint">click to unmute · space to pause</div>
  </div>
</body>
</html>
"""
    (out_dir / "preview.html").write_text(html)
    print("[motion-reel-carousel] wrote preview.html")


def escape(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec-file", required=True)
    parser.add_argument("--out-dir", required=True)
    parser.add_argument("--slug", required=True)
    parser.add_argument("--mode", choices=["draft", "final"], default="final")
    parser.add_argument("--hold", type=int, default=75)
    parser.add_argument("--transition", type=int, default=18)
    parser.add_argument("--stills", dest="stills", action="store_true", default=True)
    parser.add_argument("--no-stills", dest="stills", action="store_false")
    parser.add_argument("--title", default="The motion carousel system")
    parser.add_argument("--handle", default="@[IG_HANDLE]")
    args = parser.parse_args()

    ensure_remotion_installed()

    spec_file = Path(args.spec_file)
    if not spec_file.exists():
        fail(f"spec file not found: {spec_file}")

    specs = json.loads(spec_file.read_text())
    if not isinstance(specs, list) or not specs:
        fail("spec file must contain a non-empty JSON array")

    out_dir = Path(args.out_dir)
    if not out_dir.exists():
        fail(f"output dir does not exist: {out_dir}")

    for i, s in enumerate(specs):
        s.pop("durationFrames", None)
        s.setdefault("slideIndex", i)
        s.setdefault("totalSlides", len(specs))

    prepare_photo_assets(specs)

    per = args.hold + args.transition
    total_frames = len(specs) * per + 30
    duration_sec = total_frames / 30
    print(f"[motion-reel-carousel] {len(specs)} slides × {per/30:.2f}s "
          f"= {duration_sec:.1f}s reel ({total_frames} frames)")

    # Archive specs + write reel props.
    (out_dir / "specs.json").write_text(json.dumps(specs, indent=2))

    reel_props = {
        "specs": specs,
        "holdFrames": args.hold,
        "transitionFrames": args.transition,
        "tailFrames": 30,
        "title": args.title,
        "handle": args.handle,
    }
    reel_props_file = Path(f"/tmp/motion_reel_{args.slug}.json")
    reel_props_file.write_text(json.dumps(reel_props, indent=2))

    start = time.time()
    try:
        render_reel_mp4(out_dir, reel_props_file, args.mode)
        if args.stills:
            render_slide_stills(out_dir, specs, args.slug)
        write_preview_html(out_dir, args.title, len(specs), duration_sec)
    finally:
        try:
            reel_props_file.unlink()
        except OSError:
            pass

    elapsed = time.time() - start
    print(f"[motion-reel-carousel] done in {elapsed:.1f}s → {out_dir}/reel.mp4")
    return 0


if __name__ == "__main__":
    sys.exit(main())
