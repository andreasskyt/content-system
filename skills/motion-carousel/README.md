# Motion Carousel + Motion Reel Carousel

Two paired Claude Code skills that generate on-brand animated Instagram content:

- **`/motion-carousel`** — animated feed carousels. Each slide renders as a 1080×1350 MP4 (with PNG fallback) and a swipeable HTML preview.
- **`/motion-reel-carousel`** — reel version of the same content. Renders as a single 1080×1920 MP4 with auto-swipe transitions between slides, for the Reels tab.

Both share one Remotion project, 15 animated slide archetypes, the same JSON spec schema, and the same brand system. Write copy once → ship both formats.

---

## What you get

**15 slide archetypes.** Showpieces: `terminal-demo`, `code-reveal`, `kinetic-photo`, `data-flow`, `chart-bars`. Standard: `hero`, `problem`, `shift`, `feature`, `stat`, `steps`, `cta`. Structural: `quote`, `comparison`, `timeline`.

**Effects.** Confetti / sparkle / film-grain particle overlays on any slide.

**Emphasis variants.** `underline` (red pen), `highlight` (yellow marker), `circle` (gold hand-drawn ring) around a word in a hero headline.

**Production-tuned motion.** Spring-physics animations (not linear tweens), staggered word-by-word entrances, scanner-bar code reveals, live-typing terminal, animated counters, kinetic typography over photos.

---

## Requirements

- macOS or Linux
- **Node 18+** (Remotion 4.x requirement)
- **Python 3.9+**
- **Claude Code** — <https://claude.com/claude-code>
- ~600 MB free disk for Remotion node_modules

---

## Install

### 1. Place both skill folders in `~/.claude/skills/`

Claude Code auto-discovers skills in this directory. The final layout should be:

```
~/.claude/skills/
├── motion-carousel/          ← this folder (has the Remotion project)
└── motion-reel-carousel/     ← sibling skill (reuses the Remotion project)
```

### 2. Find-replace absolute paths

Every hardcoded path assumes `~/`. If your macOS username is different, run this once:

```bash
find ~/.claude/skills/motion-carousel ~/.claude/skills/motion-reel-carousel \
  -type f \( -name "*.md" -o -name "*.py" -o -name "*.json" \) \
  -not -path "*/node_modules/*" \
  -exec sed -i '' "s|~|$HOME|g" {} +
```

Affected files (for sanity-checking):
- `motion-carousel/SKILL.md`, `evals/evals.json`
- `motion-reel-carousel/SKILL.md`, `evals/evals.json`
- `motion-reel-carousel/scripts/render_reel.py` (line 35: `SHARED_SKILL = Path(...)`)

### 3. Install Remotion dependencies (one-time, ~90 s)

```bash
bash ~/.claude/skills/motion-carousel/scripts/install_remotion.sh
```

This installs Remotion 4.0.435, `remotion-bits`, and `culori` into `motion-carousel/remotion/node_modules/`. Both skills share this install — don't install anything in `motion-reel-carousel/`.

### 4. Verify

```bash
cd ~/.claude/skills/motion-carousel/remotion && npx remotion studio src/index.ts
```

Remotion Studio should open in your browser at `http://localhost:3000`. Close when done.

---

## Customize for your brand

The skill ships with [BRAND]' brand locked in. Four things to swap for yours:

### A. Colors + fonts — `remotion/src/theme.ts`

```ts
export const colors = {
  primary: "#303b2f",        // your primary brand color
  primaryLight: "#4C564A",
  primaryDark: "#161B15",
  accentGold: "#BCAC8B",     // your accent
  lightBg: "#F5F1EA",        // your warm-surface bg
  lightBorder: "#E8E1D3",
  white: "#FFFFFF",
  textDark: "#1A1918",
  textMuted: "#8A8580",
  underlineRed: "#C8102E",
  gradient:
    "linear-gradient(165deg, #161B15 0%, #303b2f 50%, #4C564A 100%)",
};

export const fonts = {
  display: "Poppins",        // change if using a different Google Font
  mono: "ui-monospace, ...",
};
```

If you change `fonts.display`, also update the `<link href>` in `remotion/src/components/FontLoader.tsx` to pull the right font from Google Fonts.

### B. Profile avatar — `assets/profile.png`

Replace with your own circular avatar (512×512 PNG recommended). Next render will copy it into `remotion/public/profile.png` where Remotion serves it. Used by the `Lockup` component in the top-left of every slide and the reel footer.

### C. Handle — find-replace `@[IG_HANDLE]`

```bash
grep -rl "@[IG_HANDLE]" ~/.claude/skills/motion-carousel ~/.claude/skills/motion-reel-carousel \
  --include="*.tsx" --include="*.ts" --include="*.py" --include="*.md" \
  | xargs sed -i '' 's|@[IG_HANDLE]|@yourhandle|g'
```

Or set per-render via `--handle "@yourhandle"` on `render_reel.py` and in the `cta.handle` field of each spec.

### D. Brand reference docs — `references/brand.md` + `references/copy-patterns.md`

Both files are **symlinks** to `~/.claude/skills/carousel-generator/references/*`. If you don't have the `carousel-generator` skill installed, replace the symlinks with real files:

```bash
cd ~/.claude/skills/motion-carousel/references
rm brand.md copy-patterns.md
# ... then create your own brand.md and copy-patterns.md (or copy from a template)
```

Same applies to `motion-reel-carousel/references/`. Symlinks are to `archetypes.md` and `motion-principles.md` too — those are shared between the two motion skills and should stay symlinked.

---

## Usage

### From Claude Code

Invoke by slash command:
```
/motion-carousel Make me a 7-slide carousel about [topic]
/motion-reel-carousel Turn this into a reel: [topic]
```

Or natural language — the skill descriptions auto-route:
> "Make a motion carousel about AI agents"
> "Turn this YouTube video into a reel"

### Output locations

- **Carousels** → `[CONTENT_ROOT]/Carousels/{slug}/`
   - `slide_1.mp4` … `slide_N.mp4` (per-slide MP4s)
   - `slide_1.png` … `slide_N.png` (PNG fallbacks for schedulers)
   - `carousel.html` (swipeable browser preview)
   - `profile.png`

- **Reels** → `[CONTENT_ROOT]/Carousels/Reels/{slug}/`
   - `reel.mp4` (the single reel — drag-drop to Instagram)
   - `preview.html` (autoplay browser preview)
   - `specs.json` (archived specs for re-runs)
   - `slides/slide_1.png` … `slide_N.png` (reference stills)

Change these defaults by editing the "Output location" section in each skill's `SKILL.md`.

### The 5-phase workflow (same for both skills)

1. **Classify input** — topic / transcript / YouTube URL / photo / reference screenshot
2. **Write copy first** — Claude drafts plain-text copy for every slide, you approve
3. **Map to archetypes** — one showpiece per carousel, correct surface rhythm, hero + CTA bookends
4. **Render** — draft quality first (`--mode draft`, ~60 s for 7 slides), final when approved
5. **Preview → iterate → ship**

### Archetype reference

See `references/archetypes.md` for the full decision tree, spec shapes per slide type, and example JSON for each archetype.

---

## Troubleshooting

- **"Shared Remotion project not installed"** → run `scripts/install_remotion.sh`.
- **Fonts rendering as Arial** → Poppins is loaded from Google Fonts at render time. If you're offline or behind a firewall, self-host the font and update `FontLoader.tsx`.
- **Reel render is slow** → use `--mode draft` (quarter quality, 2–3× faster) while iterating. Only run `--mode final` on the approved version.
- **Photo not showing in `kinetic-photo` slide** → spec's `photo.src` must be an absolute path that exists; the render script copies it into `remotion/public/` and rewrites the src for `staticFile()`.
- **"Cannot find module 'culori'"** → peer dep of `remotion-bits`. Run `cd motion-carousel/remotion && npm install culori`.

---

## File structure

```
motion-carousel/
├── README.md                     ← this file
├── SKILL.md                      ← trigger phrases, workflow, archetype rules
├── assets/profile.png            ← avatar (REPLACE with yours)
├── references/
│   ├── brand.md                  ← symlink — REPLACE or point elsewhere
│   ├── copy-patterns.md          ← symlink — REPLACE or point elsewhere
│   ├── archetypes.md             ← slide decision tree
│   └── motion-principles.md      ← spring presets, stagger rules
├── evals/evals.json
├── scripts/
│   ├── install_remotion.sh       ← run once on first install
│   ├── render_carousel.py        ← orchestrator for carousels
│   └── build_preview_html.py
└── remotion/                     ← self-contained Remotion project (shared with /motion-reel-carousel)
    ├── package.json
    ├── tsconfig.json
    ├── remotion.config.ts
    └── src/
        ├── index.ts              ← registers compositions
        ├── Root.tsx              ← CarouselSlide + CarouselReel
        ├── theme.ts              ← BRAND TOKENS — EDIT THIS
        ├── easing.ts             ← spring presets
        ├── CarouselSlide.tsx     ← per-slide composition (1080x1350)
        ├── CarouselReel.tsx      ← reel composition (1080x1920)
        ├── components/
        │   ├── FontLoader.tsx
        │   ├── Lockup.tsx        ← @handle — edit for yours
        │   ├── ProgressBar.tsx
        │   ├── Mark.tsx          ← underline / highlight / circle
        │   ├── KineticText.tsx
        │   ├── TerminalWindow.tsx
        │   ├── DataFlow.tsx
        │   └── ParticleOverlay.tsx   ← confetti / sparkle / grain
        └── slides/
            ├── HeroSlide.tsx
            ├── ProblemSlide.tsx
            ├── ShiftSlide.tsx
            ├── FeatureSlide.tsx
            ├── StatSlide.tsx
            ├── StepsSlide.tsx
            ├── CTASlide.tsx
            ├── TerminalDemoSlide.tsx
            ├── KineticPhotoSlide.tsx
            ├── DataFlowSlide.tsx
            ├── CodeRevealSlide.tsx
            ├── QuoteSlide.tsx
            ├── ComparisonSlide.tsx
            ├── TimelineSlide.tsx
            └── ChartBarsSlide.tsx

motion-reel-carousel/
├── README.md                     ← points here for full docs
├── SKILL.md                      ← reel-specific workflow + schema
├── references/                   ← all symlinks back to motion-carousel
├── scripts/render_reel.py        ← orchestrator for reels
└── evals/evals.json
```

---

## Credits

Built on [Remotion](https://remotion.dev) with [remotion-bits](https://github.com/neversight-os/remotion-bits) for `AnimatedText`, `AnimatedCounter`, and `CodeBlock`. Runs inside [Claude Code](https://claude.com/claude-code).
