---
name: motion-reel-carousel
description: Generate an Instagram Reel (1080x1920 MP4) that looks like a carousel being flipped through — same 15 [BRAND] archetypes as /motion-carousel, rendered as a single swipe-animated video for Reels algorithm reach. Use this skill when [YOUR_NAME] wants to publish carousel-style content to the Reels tab, asks for a "reel carousel", "swipe reel", "carousel as a reel", or says "make a reel out of this carousel" / "turn my carousel into a reel". Reels get pushed to broader audiences than carousels, so this skill is the right call for top-of-funnel content, virality plays, or any time algorithmic reach matters more than swipe depth. Shares the same SlideSpec schema, brand, archetypes, effects, and Remotion project as /motion-carousel. Output: reel.mp4 + preview.html + specs.json at the top level, per-slide PNGs tucked in slides/ subfolder. All in /[BRAND]/Marketing/Carousels/Reels/{slug}/.
---

# Motion Reel Carousel ([BRAND] brand)

Publish carousel-style content to the **Reels** tab. Same 15 archetypes as
`/motion-carousel` (hero, code-reveal, quote, comparison, timeline, chart-bars,
etc.), same brand tokens, same archetypes.md — but the render target is a
single 1080×1920 MP4 with auto-swipe transitions every ~3 seconds.

**Why this skill exists:** Reels get algorithmic reach that carousels don't.
If the goal is top-of-funnel audience growth, render as a reel. If the goal is
depth (viewer deliberately swipes), render as a carousel. Same content, two
distribution formats.

This skill shares the Remotion project with `/motion-carousel` — one codebase,
two compositions (`CarouselSlide` + `CarouselReel`). All new archetypes added
to motion-carousel automatically work here.

---

## Relationship to sibling skills

| Skill | Output | Aspect | Distribution |
|---|---|---|---|
| `carousel-generator` | static PNGs | 1080×1350 (4:5) | IG carousel post |
| `yt-carousel` | static PNGs (from YouTube) | 1080×1350 | IG carousel post |
| `motion-carousel` | per-slide MP4 + PNG | 1080×1350 | IG carousel post (animated) |
| **`motion-reel-carousel`** | single MP4 | **1080×1920 (9:16)** | **IG Reel** |

The spec schema is identical across `motion-carousel` and `motion-reel-carousel`. You can generate both from the same copy in a single session — same phases, same approval gate.

---

## Output location (non-negotiable)

```
[CONTENT_ROOT]/Carousels/Reels/{slug}/
├── reel.mp4         ← the single 1080x1920 reel (Instagram-ready)
├── preview.html     ← autoplay browser preview of reel.mp4
├── specs.json       ← archived slide specs (reproducible future runs)
└── slides/
    ├── slide_1.png  ← per-slide midpoint stills (1080x1350)
    ├── slide_2.png  ← stored in subfolder to keep the top level clean
    └── ...
```

**Top-level files stay minimal — just the reel, the preview, and the specs. Per-slide PNGs go in `slides/` so the folder isn't cluttered.**

Where `{slug}` is kebab-case from the hook/topic.

Folder setup before rendering:

```bash
SLUG="your-slug-here"
REEL_DIR="[CONTENT_ROOT]/Carousels/Reels/$SLUG"
mkdir -p "$REEL_DIR"
```

No profile.png copy needed — reel uses `remotion/public/profile.png` which is already in place.

---

## First-run bootstrap

Shares the Remotion project with `/motion-carousel`. If `motion-carousel/remotion/node_modules` exists, this skill works out of the box:

```bash
if [ ! -d "~/.claude/skills/motion-carousel/remotion/node_modules" ]; then
  bash ~/.claude/skills/motion-carousel/scripts/install_remotion.sh
fi
```

---

## Workflow (5 phases)

Same as `motion-carousel` — with one key difference in phase 4.

### Phase 1 — Classify input

Topic / transcript / YouTube URL / photo path / reference screenshot. Use `carousel-generator`'s YT fetcher scripts if input is a URL.

### Phase 2 — Write copy first (approval gate)

Plain text for every slide. Include `slideType` per slide. Get approval before rendering. Reels take longer to render than a single slide; wrong copy wastes more time.

### Phase 3 — Map to archetype gallery

Same rules as `/motion-carousel` (see `references/archetypes.md`):

- Slide 1 = `hero` or `kinetic-photo`.
- Slide N = `cta`.
- At least ONE showpiece (`terminal-demo`, `code-reveal`, `kinetic-photo`, `data-flow`, `chart-bars`).
- Max 2 showpieces.
- Surface rhythm: never double `light` or double `white`.

**Reel-specific tuning:**
- Target 5-8 slides total — fewer than 5 feels thin, more than 8 and the reel exceeds the algorithmic sweet spot (15-30s).
- Because each slide gets a 2.5s hold + 0.6s swipe (= ~3.1s), duration ≈ slides × 3.1 + 1. Eight slides ≈ 26s — still inside the 30s sweet spot.
- The first two seconds are the only thing that stops a scroll. Your hero slide needs to land the hook before the first swipe.

### Phase 4 — Render the reel

```bash
SKILL_DIR="~/.claude/skills/motion-reel-carousel"
SPECS_FILE="/tmp/specs_${SLUG}.json"

# Write specs (same shape as motion-carousel, NO durationFrames — reel controls timing)
python3 -c "import json, pathlib; pathlib.Path('$SPECS_FILE').write_text(json.dumps(SPECS, indent=2))"

# Draft (quarter quality, verify before final)
python3 "$SKILL_DIR/scripts/render_reel.py" \
  --spec-file "$SPECS_FILE" \
  --out-dir "$REEL_DIR" \
  --slug "$SLUG" \
  --mode draft
```

Options:
- `--hold N` — frames per slide hold (default 75 = 2.5s)
- `--transition N` — swipe transition duration (default 18 = 0.6s)
- `--no-stills` — skip per-slide PNGs in `slides/` subfolder
- `--title "..."` — override the fat header title (default "The motion carousel system")
- `--handle "..."` — override the footer handle (default `@[IG_HANDLE]`)

**Do NOT include `durationFrames` in individual slide specs.** The reel composition controls timing globally via `--hold` and `--transition`.

### Phase 5 — Preview → iterate → final render

Open `preview.html` in Chrome (autoplays the reel, loops, unmute + scrub controls):

```bash
open "$REEL_DIR/preview.html"
```

Or open `reel.mp4` directly in QuickTime if you prefer.

When approved, re-render at full quality:

```bash
python3 "$SKILL_DIR/scripts/render_reel.py" \
  --spec-file "$SPECS_FILE" \
  --out-dir "$REEL_DIR" \
  --slug "$SLUG" \
  --mode final
```

Production render time: roughly 2-3× slower than `motion-carousel` (single composition, more frames). Expect ~90-150s for 7 slides at final quality.

---

## Slide spec schema

**Identical to `/motion-carousel`.** See its SKILL.md for the full schema. All
15 archetypes + effects + emphasis variants work here unchanged.

Key difference: leave `durationFrames` unset on individual slides. The reel
renders every slide with the same `--hold` duration.

---

## Reference files

Symlinked from motion-carousel — same brand, same archetypes, same principles:

- `references/brand.md`
- `references/copy-patterns.md`
- `references/archetypes.md`
- `references/motion-principles.md`

---

## Hard rules

1. **Slide count: 5-8**, targeting ~25s total duration.
2. **Never skip the copy approval gate** — reels take 2-3× longer to render than carousels.
3. **Don't set `durationFrames` per slide** — reel controls timing globally.
4. **Draft mode first, always.**
5. **Hero slide must hook in the first 2 seconds.** On Reels, scroll-away happens fast.
6. **Pair with `motion-carousel`** — render the same specs as both a reel (for reach) and a carousel (for depth). Double-posting the same content in two formats is SOP, not spam.

---

## Troubleshooting

- **"Shared Remotion project not installed"** → run `~/.claude/skills/motion-carousel/scripts/install_remotion.sh`.
- **Reel looks cut off at the edges** → the card is 1080 wide, same as frame width. If a slide's padding pushes content beyond 1080 it'll clip. Fix by tightening padding in the affected slide component (this is rare — all 15 archetypes are already sized for 1080×1350).
- **Swipe feels too slow / fast** → adjust `--hold` (time on each slide). 60 frames = 2s (snappier), 90 frames = 3s (slower, more readable). Transition itself should stay at 18 — that's tuned to feel like a real IG swipe.
- **Render time is too long** → drop to `--mode draft` for iteration; only run final on the approved version.
