---
name: motion-carousel
description: Generate engaging, lively motion-graphic Instagram carousels for [BRAND]. Produces 1080x1350 per-slide MP4s + PNG fallbacks via Remotion with [BRAND]'s locked brand — deep green #303b2f primary, gold #BCAC8B accent, Poppins typography, @[IG_HANDLE] handle. Use this skill when [YOUR_NAME] asks for an "animated carousel", "motion carousel", "kinetic carousel", "carousel with video slides", "terminal demo slide", "carousel that moves", or wants to upgrade a static carousel idea with motion. Specializes in three showpiece archetypes — live-typing terminal demos, kinetic typography over studio photos, and animated data-flow diagrams — layered into the standard [BRAND] 7-slide arc. Output goes to /[BRAND]/Marketing/Carousels/{slug}/ with slide_N.mp4, slide_N.png, carousel.html. Sibling to `carousel-generator` (static) and `yt-carousel` (YouTube input). If the user wants motion, animation, or video slides in an IG carousel, this is the skill to use.
---

# Motion Carousel ([BRAND] brand)

Generate animated Instagram carousels for [BRAND]. Each slide renders as a
3-second MP4 (1080×1350, h264, 30fps) via a self-contained Remotion project,
with a mid-point PNG fallback for Meta Business Suite and Notion previews.

This is the **third** [BRAND] carousel skill — sibling to:
- `carousel-generator` — static PNG carousels (topic/transcript input)
- `yt-carousel` — static carousels from YouTube URLs
- `motion-carousel` — **animated** carousels (this skill)

The brand is locked. Do not ask what colors or fonts to use. Read `references/brand.md`.

---

## Output location (non-negotiable)

ALL carousels go here:

```
[CONTENT_ROOT]/Carousels/{slug}/
├── carousel.html        ← autoplay-MP4 swipe preview
├── profile.png          ← copied from assets/ (lockup avatar)
├── slide_1.mp4          ← animated (Instagram-ready)
├── slide_1.png          ← midpoint still (fallback)
├── slide_2.mp4
├── slide_2.png
└── ...slide_N.(mp4|png)
```

Where `{slug}` is short kebab-case from the hook or topic (e.g. `stop-paying-editors`).

**Folder setup — always, first thing:**

```bash
SLUG="your-slug-here"
CAROUSEL_DIR="[CONTENT_ROOT]/Carousels/$SLUG"
mkdir -p "$CAROUSEL_DIR"
cp "~/.claude/skills/motion-carousel/assets/profile.png" "$CAROUSEL_DIR/profile.png"
# canonical source: "[CONTENT_ROOT]/_photo-library/profile.png" — the only approved
# photo of [YOUR_NAME]. assets/profile.png mirrors it; if they differ, re-copy from the Desktop file.
```

---

## First-run bootstrap (Remotion install)

Before the very first carousel renders, the Remotion project needs its deps.
Check for `node_modules` and bootstrap if missing:

```bash
if [ ! -d "~/.claude/skills/motion-carousel/remotion/node_modules" ]; then
  bash ~/.claude/skills/motion-carousel/scripts/install_remotion.sh
fi
```

Requires Node 18+. Takes ~90 seconds the first time; instant after that.

---

## Workflow (5 phases)

### Phase 1 — Classify input

Same classification as `carousel-generator`:
- **Topic prompt** → write [BRAND]-voiced copy from scratch
- **Transcript** → extract 5-10 strongest insights
- **Reference screenshot** → rebuild the structure in [BRAND] brand
- **YouTube URL** → prefer `/yt-carousel` unless the user explicitly wants motion; if motion, still fetch transcript via `~/.claude/skills/carousel-generator/scripts/fetch_youtube_transcript.py`
- **Photo path** → plan to use `kinetic-photo` for the hero

### Phase 2 — Write copy first (approval gate)

Draft plain-text copy for every slide before any rendering. Include the `slideType` you plan for each slide and note which showpiece archetype you'll use. Get [YOUR_NAME]'s approval before proceeding. Rendering is expensive; copy isn't.

Read `references/copy-patterns.md` for the Hormozi voice rules.

### Phase 3 — Map to architecture

Map each slide to a `slideType` from `references/archetypes.md`. Constraints:

1. Slide 1 MUST be `hero` or `kinetic-photo`.
2. Slide N (last) MUST be `cta`.
3. At least ONE showpiece (`terminal-demo`, `kinetic-photo`, `data-flow`) somewhere in the carousel — that's the reason this skill exists vs. `carousel-generator`.
4. Maximum 2 showpieces in a 7-slide carousel (motion fatigue).
5. Surface rhythm: never two `light` or two `white` in a row. Alternate against gradient.

Read `references/archetypes.md` for the full decision tree.

### Phase 4 — Render

Build a slide specs JSON array. Example shape (see `references/archetypes.md` for per-slideType fields):

```json
[
  {
    "slideType": "hero",
    "surface": "gradient",
    "headline": "Stop paying editors.",
    "underlineWord": "editors",
    "subhead": "You can replace the whole seat in one weekend.",
    "durationFrames": 90
  },
  {
    "slideType": "terminal-demo",
    "surface": "gradient",
    "headline": "30 seconds to install.",
    "terminal": {
      "command": "npm install @anthropic-ai/claude-code",
      "durationSec": 2,
      "output": ["added 47 packages in 1.8s"]
    },
    "durationFrames": 120
  }
]
```

Write the specs array to a JSON file, then invoke the renderer:

```bash
SKILL_DIR="~/.claude/skills/motion-carousel"

# Write specs to a temp file via Python (never heredoc — dollar signs corrupt)
python3 -c "import json, pathlib; pathlib.Path('/tmp/specs_${SLUG}.json').write_text(json.dumps(SPECS, indent=2))"

# Draft render first — quarter quality, ~20s for 7 slides
python3 "$SKILL_DIR/scripts/render_carousel.py" \
  --spec-file "/tmp/specs_${SLUG}.json" \
  --out-dir "$CAROUSEL_DIR" \
  --slug "$SLUG" \
  --mode draft

# Build swipe preview
python3 "$SKILL_DIR/scripts/build_preview_html.py" --out-dir "$CAROUSEL_DIR"
```

Default `durationFrames`: 90 (3s). Use 120 (4s) for showpieces that need extra time (complex terminal output, data-flow with 4 nodes).

### Phase 5 — Preview → iterate → production render

Open `carousel.html` in Chrome. Use arrow keys / click / swipe to navigate. Each slide autoplays on enter and loops while visible.

When [YOUR_NAME] approves, re-render at production quality:

```bash
python3 "$SKILL_DIR/scripts/render_carousel.py" \
  --spec-file "/tmp/specs_${SLUG}.json" \
  --out-dir "$CAROUSEL_DIR" \
  --slug "$SLUG" \
  --mode final
```

Re-run `build_preview_html.py` — same preview file, now with production MP4s.

---

## 🚨 Video carousels — two incidents, two hard rules (2026-09-08)

1. **MP4 slides posted as still images.** A row with six MP4s in `Carousel Images` was picked up while the poster's carousel branch was image-only (`media_type: IMAGE`, `.png` S3 keys). Instagram rendered a frozen frame on every slide. [YOUR_NAME] deleted the post. The unified poster `[N8N_WF_AUTOPOSTER_ID]` now handles VIDEO children (real extension on S3, `VIDEO` + `video_url`, per-child FINISHED polling), but the rule stands: **before scheduling any media type the poster hasn't posted before, read the live workflow's node bodies and confirm the path exists. If it doesn't, the row stays on `To Review`, never `Ready`.** Warning in chat is not enough; set the row back yourself.
2. **Black Instagram thumbnail.** Instagram uses frame 0 of the first video slide as the carousel cover in the grid and there is no API way to change it (and video carousels can't be hidden from the grid). Slide 1 started on a fade from black, so the profile tile was solid black. **Gate before every video-carousel schedule: extract frame 0 of `slide_1.mp4` with ffmpeg and look at it. If it is black or empty, do not schedule.** The notebook style solves this with headline visible at frame 0 plus a blurred teaser of the finished drawing (`"teaser": true`), see `carousel-generator/references/notebook-style.md`.

```bash
ffmpeg -v error -y -i "$DIR/slide_1.mp4" -frames:v 1 /tmp/cover_check.png   # then Read it; must not be black
```

## Reference files

Read only what you need, when you need it:

- `references/brand.md` — [BRAND] colors, typography, logo rules (shared with `carousel-generator`)
- `references/copy-patterns.md` — Hormozi voice, 7-slide arc, hook formulas (shared)
- `references/archetypes.md` — the 10 slide types, when to use each, spec shapes
- `references/motion-principles.md` — spring presets, stagger rules, motion budget per slide

---

## Slide spec schema (quick reference)

```typescript
type SlideSpec = {
  slideType:
    | "hero" | "problem" | "shift" | "feature" | "stat" | "steps" | "cta"
    | "terminal-demo" | "kinetic-photo" | "data-flow"      // showpieces (original)
    | "code-reveal" | "chart-bars"                         // showpieces (v2)
    | "quote" | "comparison" | "timeline"                  // structural (v2)
    | "matrix" | "sketch";                                 // notebook style (black, hand-drawn) — see carousel-generator/references/notebook-style.md
  surface: "light" | "white" | "gradient" | "black";   // black = notebook style only
  slideIndex: number;    // auto-filled by render_carousel.py
  totalSlides: number;   // auto-filled
  durationFrames?: number; // default 90 (3s @ 30fps)

  headline?: string;
  subhead?: string;
  body?: string;

  // Emphasis on a word in the headline (hero/shift slides).
  emphasisWord?: string;
  emphasisStyle?: "underline" | "highlight" | "circle";  // default "underline"

  items?: string[];        // problem, feature, steps

  stat?: { value: number; prefix?: string; suffix?: string; label?: string };

  terminal?: {
    command: string;
    prompt?: string;       // default "~/brand $"
    durationSec?: number;  // default 2
    output?: string[];
  };

  photo?: {
    src: string;           // absolute path; auto-copied to remotion/public/
    focus?: "left" | "right" | "center";
  };

  flow?: {
    nodes: Array<{ label: string; emoji?: string }>;  // max 4
    highlight?: string;
  };

  cta?: { text: string; handle?: string; keyword?: string };

  // v2 archetypes:
  code?: { content: string; language?: string; highlight?: number[] };

  quote?: { text: string; attribution?: string };

  comparison?: {
    beforeLabel: string; beforeItems: string[];
    afterLabel: string;  afterItems: string[];
  };

  timeline?: { milestones: Array<{ label: string; time?: string }> };

  chart?: {
    bars: Array<{
      label: string; value: number;
      prefix?: string; suffix?: string;
      highlight?: boolean;
    }>;
    max?: number;
  };

  // Notebook style (surface "black"). Hand-drawn 2x2 that builds across slides, or any drawing from JSON.
  matrix?: { stage: 0|1|2|3|4|5; axisX?: [string,string]; axisY?: [string,string]; labels?: [string,string,string,string]; textOnly?: boolean };
  sketch?: { strokes?: Array<{d?:string; rect?:number[]; line?:number[]; arrow?:[number,number,string]; start?:number; dur?:number; stroke?:string; width?:number; pre?:boolean}>;
             texts?: Array<{x:number; y:number; text:string|string[]; start?:number; dur?:number; size?:number; anchor?:string; color?:string; pre?:boolean}>;
             fills?: Array<{rect:number[]; start?:number; dur?:number; opacity?:number; glow?:boolean; pre?:boolean}> };

  // Decorative overlay on top of any slide.
  effects?: { particles?: "confetti" | "sparkle" | "grain" };

  showLockup?: boolean;    // default true
  showProgress?: boolean;  // default true
};
```

### Archetype inventory at a glance

**Showpieces** (pick at least one per carousel, max two): `terminal-demo`, `code-reveal`, `kinetic-photo`, `data-flow`, `chart-bars`.
**Notebook style** (black surface, whole carousel in one style, 300-frame slides): `matrix`, `sketch`. Rules in `carousel-generator/references/notebook-style.md`.

**Standard**: `hero`, `problem`, `shift`, `feature`, `stat`, `steps`, `cta`.

**Structural (v2)**: `quote`, `comparison`, `timeline` — use freely, don't count toward showpiece quota.

**Effects (v2)**: set `effects.particles` to `"confetti"`, `"sparkle"`, or `"grain"` on any slide. Confetti/sparkle max once per carousel; grain fine to reuse.

**Emphasis variants (v2)**: `emphasisStyle` on hero/shift — `"underline"` (red pen), `"highlight"` (yellow marker), `"circle"` (gold ring).

See `references/archetypes.md` for the full decision tree, spec examples per type, and when to use each.

---

## Hard rules

1. **Never skip the copy approval gate** (Phase 2). Motion renders are expensive; wrong copy wastes time.
2. **Always include at least one showpiece.** If the idea doesn't support one, the carousel should be static — route to `carousel-generator` instead.
3. **Never animate during the hold phase** (frames 54+ of a 90-frame slide). See `references/motion-principles.md`.
4. **Draft mode first, always.** Only run `--mode final` after [YOUR_NAME] has reviewed the draft.
5. **Never bypass the renderer.** Don't call `npx remotion render` directly from chat — always go through `render_carousel.py` so props files, photo assets, and metadata defaults are handled uniformly.
6. **Photos go in via absolute path.** The script copies them into `remotion/public/` and rewrites `spec.photo.src`. Don't pre-copy them yourself.
7. **MP4 is the primary deliverable, PNG is the fallback.** Instagram carousel items accept both; Notion/Meta Business Suite use the PNG for previews.

---

## Troubleshooting

- **`npx remotion` not found** → run `scripts/install_remotion.sh`.
- **Poppins not loading, text looks like Arial** → `FontLoader.tsx` uses `delayRender` + `document.fonts.ready`; give it an extra beat, or check network access to Google Fonts.
- **Video plays too short / cuts off animation** → bump `durationFrames` to 120 in that slide's spec. Showpieces often need 4s.
- **Slide looks static in preview** → check the browser's autoplay policy. Chrome needs `muted` on `<video>` for autoplay; the preview HTML sets that by default. If still broken, reload with the DevTools open.
- **Photo not showing** → the script only copies files it can find. Confirm the absolute path exists before writing the spec.
- **Colors drift from `carousel-generator`** → all brand values live in `remotion/src/theme.ts`. Do not import from `/[BRAND]/Marketing/Remotion/src/lib/brand.ts` — its values are stale.
