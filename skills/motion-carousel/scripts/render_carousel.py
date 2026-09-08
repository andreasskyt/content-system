#!/usr/bin/env python3
"""
Render an animated BRAND carousel via the skill's self-contained Remotion project.

Inputs:
  --spec-file PATH    JSON array of slide specs (one object per slide)
  --out-dir  PATH     Output carousel folder (must already exist; profile.png copied)
  --slug     STRING   Carousel slug (used to name props temp files)
  --mode     draft|final  Quality tier (default: final)
  --skip-png          Skip PNG fallback renders (default: false)

For each slide, this script writes a props JSON to /tmp, invokes
`npx remotion render` to produce slide_N.mp4 in the output folder, then invokes
`npx remotion still` to produce slide_N.png. Props files are cleaned up at
the end.

Photo handling: if a slide spec includes spec.photo.src with an absolute path,
it's copied into remotion/public/ with a deterministic filename and spec.photo.src
is rewritten to the public-relative path so staticFile() resolves it.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
REMOTION_DIR = SKILL_DIR / "remotion"
ENTRY = "src/index.ts"
COMPOSITION_ID = "CarouselSlide"
FPS = 30
DEFAULT_DURATION_FRAMES = 90


def fail(msg: str, code: int = 1) -> None:
    print(f"[motion-carousel] ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def ensure_remotion_installed() -> None:
    node_modules = REMOTION_DIR / "node_modules"
    if not node_modules.exists():
        fail(
            "remotion/node_modules missing. Run:\n"
            f"  bash {SKILL_DIR}/scripts/install_remotion.sh"
        )


def prepare_photo_assets(specs: list[dict]) -> None:
    """Copy any absolute photo paths into remotion/public/ so staticFile resolves."""
    public_dir = REMOTION_DIR / "public"
    public_dir.mkdir(exist_ok=True)
    # Always ensure profile.png is available to the Lockup component.
    src_profile = SKILL_DIR / "assets" / "profile.png"
    dst_profile = public_dir / "profile.png"
    if src_profile.exists() and not dst_profile.exists():
        shutil.copy2(src_profile, dst_profile)

    for i, spec in enumerate(specs):
        photo = spec.get("photo")
        if not photo or not isinstance(photo, dict):
            continue
        src = photo.get("src")
        if not src:
            continue
        if src.startswith(("http://", "https://")):
            continue  # renderer will fetch directly
        src_path = Path(src).expanduser()
        if not src_path.is_absolute():
            src_path = (SKILL_DIR / src_path).resolve()
        if not src_path.exists():
            print(f"[motion-carousel] WARN: photo not found: {src_path} (slide {i+1})")
            continue
        rel_name = f"photo_slide_{i+1:02d}{src_path.suffix.lower()}"
        dst_path = public_dir / rel_name
        shutil.copy2(src_path, dst_path)
        photo["src"] = rel_name  # rewrite so staticFile(rel_name) works


def write_props_file(slug: str, index: int, spec: dict, duration_frames: int) -> Path:
    props = {
        "spec": spec,
        "durationFrames": duration_frames,
        "widthOverride": 1080,
        "heightOverride": 1350,
    }
    tmp = Path(f"/tmp/motion_carousel_{slug}_slide_{index+1:02d}.json")
    tmp.write_text(json.dumps(props, indent=2))
    return tmp


def render_slide_mp4(
    out_dir: Path, index: int, props_file: Path, mode: str
) -> None:
    out_path = out_dir / f"slide_{index+1}.mp4"
    cmd = [
        "npx",
        "remotion",
        "render",
        ENTRY,
        COMPOSITION_ID,
        str(out_path),
        f"--props={props_file}",
    ]
    if mode == "draft":
        cmd += ["--scale=0.5", "--every-nth-frame=2"]
    print(f"[motion-carousel] rendering {out_path.name} ({mode})...")
    subprocess.run(cmd, cwd=REMOTION_DIR, check=True)


def render_slide_png(
    out_dir: Path, index: int, props_file: Path, duration_frames: int
) -> None:
    out_path = out_dir / f"slide_{index+1}.png"
    midpoint = max(0, duration_frames // 2)
    cmd = [
        "npx",
        "remotion",
        "still",
        ENTRY,
        COMPOSITION_ID,
        f"--frame={midpoint}",
        f"--output={out_path}",
        f"--props={props_file}",
    ]
    print(f"[motion-carousel] rendering {out_path.name} still...")
    subprocess.run(cmd, cwd=REMOTION_DIR, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spec-file", required=True, help="Path to JSON array of slide specs")
    parser.add_argument("--out-dir", required=True, help="Carousel output folder")
    parser.add_argument("--slug", required=True, help="Carousel slug for temp filenames")
    parser.add_argument("--mode", choices=["draft", "final"], default="final")
    parser.add_argument("--skip-png", action="store_true", help="Skip PNG fallback renders")
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
        fail(f"output dir does not exist: {out_dir} (mkdir + cp profile.png first)")

    total = len(specs)
    print(f"[motion-carousel] rendering {total} slides to {out_dir}")

    # Ensure totalSlides + slideIndex are set; fill defaults.
    for i, spec in enumerate(specs):
        spec.setdefault("slideIndex", i)
        spec.setdefault("totalSlides", total)

    prepare_photo_assets(specs)

    props_files: list[Path] = []
    start = time.time()
    try:
        for i, spec in enumerate(specs):
            duration_frames = int(spec.pop("durationFrames", DEFAULT_DURATION_FRAMES))
            props_file = write_props_file(args.slug, i, spec, duration_frames)
            props_files.append(props_file)
            render_slide_mp4(out_dir, i, props_file, args.mode)
            if not args.skip_png:
                render_slide_png(out_dir, i, props_file, duration_frames)
    finally:
        for p in props_files:
            try:
                p.unlink()
            except OSError:
                pass

    elapsed = time.time() - start
    print(
        f"[motion-carousel] done — {total} slides in {elapsed:.1f}s "
        f"({elapsed/total:.1f}s per slide)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
