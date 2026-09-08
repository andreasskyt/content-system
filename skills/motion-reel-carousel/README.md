# Motion Reel Carousel

Sibling skill of `/motion-carousel`. Same 15 animated slide archetypes, same brand system, same JSON spec schema — but renders as a **single 1080×1920 MP4** with auto-swipe transitions for the Instagram Reels tab instead of per-slide files for the feed.

**This skill requires `/motion-carousel` to be installed** — it reuses the Remotion project located at `~/.claude/skills/motion-carousel/remotion/`.

## Install

1. Install `/motion-carousel` first — follow **[`../motion-carousel/README.md`](../motion-carousel/README.md)** for the full setup (Node + Remotion + brand customization).
2. Place this folder at `~/.claude/skills/motion-reel-carousel/`. Claude Code will auto-discover it.
3. Paths use `~` (your home directory). If a script needs an absolute path, replace `~` with `$HOME` in:
   - `SKILL.md`
   - `evals/evals.json`
   - `scripts/render_reel.py` (line 35: `SHARED_SKILL = Path(...)`)

The one-liner from the main README handles this for both skills at once.

## Usage

```
/motion-reel-carousel Make a reel about [topic]
```

Or natural language: *"turn this carousel into a reel"*, *"make a swipe reel"*.

### Output

`[CONTENT_ROOT]/Carousels/Reels/{slug}/`
- `reel.mp4` — the reel (drag-drop to Instagram)
- `preview.html` — autoplay browser preview
- `specs.json` — archived specs
- `slides/slide_*.png` — per-slide reference stills

### Render script

```bash
python3 ~/.claude/skills/motion-reel-carousel/scripts/render_reel.py \
  --spec-file /tmp/my_specs.json \
  --out-dir   ~/Desktop/[BRAND]\ SYSTEMS/Marketing/Carousels/Reels/my-slug \
  --slug      my-slug \
  --mode      draft \
  --title     "Fat persistent title"
```

Options: `--hold N` (frames per slide, default 75), `--transition N` (swipe frames, default 18), `--no-stills` (skip per-slide PNGs), `--handle "@yourhandle"`.

## See also

For full schema, archetype decision tree, motion principles, brand customization, and troubleshooting — see `../motion-carousel/README.md` and the shared `references/` docs (which are symlinks into `motion-carousel/references/`).
