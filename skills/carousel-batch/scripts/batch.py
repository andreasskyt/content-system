#!/usr/bin/env python3
"""Scaffold and finish a BRAND carousel batch.

    batch.py scaffold --batch "/path/to/Aug Batch"
    batch.py finish   --batch "/path/to/Aug Batch"

scaffold reads plan.json, creates one folder per day, copies profile.png and any
referenced photos into it, and writes caption.txt.

finish exports every day folder that has a carousel.html into 1080x1350 PNGs and
renames them to Instagram upload order (1.png ... N.png).
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

GENERATOR = Path.home() / ".claude/skills/carousel-generator"
EXPORTER = GENERATOR / "scripts/export_carousel.py"
PROFILE = GENERATOR / "assets/profile.png"
LIBRARY = Path.home() / "Desktop/BRAND/Marketing/_photo-library"


def load_plan(batch: Path) -> dict:
    plan = batch / "plan.json"
    if not plan.exists():
        sys.exit(f"No plan.json in {batch}. Write it from plan.md first (see references/plan-format.md).")
    data = json.loads(plan.read_text())
    if not data.get("days"):
        sys.exit("plan.json has no days.")
    return data


def day_dir(batch: Path, day: dict) -> Path:
    date = str(day.get("date", "")).strip()
    if not date:
        sys.exit(f"Day entry {day.get('title', '?')!r} has no date.")
    # "Aug 8" -> "Aug 08" so the folders sort correctly on a phone.
    return batch / re.sub(r"^([A-Za-z]{3}) (\d)$", r"\1 0\2", date)


def scaffold(batch: Path) -> None:
    plan = load_plan(batch)
    seen: set[Path] = set()

    for day in plan["days"]:
        out = day_dir(batch, day)
        if out in seen:
            sys.exit(f"Two entries share the date {out.name!r}. Dates must be unique.")
        seen.add(out)

        out.mkdir(parents=True, exist_ok=True)
        shutil.copy(PROFILE, out / "profile.png")

        for i, photo in enumerate(day.get("photos") or [], start=1):
            src = LIBRARY / photo
            if not src.exists():
                sys.exit(f"{out.name}: photo not in library: {src}")
            shutil.copy(src, out / f"photo_{i}{src.suffix.lower()}")

        caption = (day.get("caption") or "").strip()
        if not caption:
            sys.exit(f"{out.name}: no caption. Every carousel ships with one.")
        (out / "caption.txt").write_text(caption + "\n")

        photos = len(day.get("photos") or [])
        print(f"scaffolded {out.name}  ({day.get('slides', '?')} slides, {photos} photo(s))")

    print(f"\n{len(plan['days'])} day folders ready in {batch}")
    print("Next: write carousel.html in each, then run `batch.py finish`.")


def finish(batch: Path) -> None:
    plan = load_plan(batch)
    built, skipped = 0, []

    for day in plan["days"]:
        out = day_dir(batch, day)
        html = out / "carousel.html"
        if not html.exists():
            skipped.append(f"{out.name}: no carousel.html")
            continue

        slides = int(day.get("slides") or 0)
        if slides < 2:
            skipped.append(f"{out.name}: slides missing or < 2 in plan.json")
            continue
        if slides > 10:
            skipped.append(f"{out.name}: {slides} slides — Instagram caps a carousel at 10")
            continue

        result = subprocess.run(
            [sys.executable, str(EXPORTER), "--html", str(html), "--out", str(out), "--slides", str(slides)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            skipped.append(f"{out.name}: export failed — {(result.stderr or result.stdout).strip()[:200]}")
            continue

        for n in range(1, slides + 1):
            src = out / f"slide_{n}.png"
            if not src.exists():
                skipped.append(f"{out.name}: exporter produced no slide_{n}.png")
                break
            src.replace(out / f"{n}.png")
        else:
            built += 1
            print(f"built {out.name}  -> 1.png .. {slides}.png")

    print(f"\n{built}/{len(plan['days'])} carousels built.")
    if skipped:
        print("\nSkipped:")
        for s in skipped:
            print(f"  - {s}")
        sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("command", choices=["scaffold", "finish"])
    parser.add_argument("--batch", required=True, help="Path to the batch folder containing plan.json")
    args = parser.parse_args()

    batch = Path(args.batch).expanduser().resolve()
    if not batch.is_dir():
        sys.exit(f"Batch folder not found: {batch}")
    if not EXPORTER.exists():
        sys.exit(f"carousel-generator exporter missing: {EXPORTER}")

    (scaffold if args.command == "scaffold" else finish)(batch)


if __name__ == "__main__":
    main()
