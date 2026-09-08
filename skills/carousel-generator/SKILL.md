---
name: carousel-generator
description: Generate on-brand Instagram carousels for [BRAND] ([YOUR_NAME]'s AI automation agency). Produces 1080x1350 PNG slides via HTML + Playwright with [BRAND]'s locked brand — deep green #303b2f primary, gold #BCAC8B as secondary accent, warm off-white and near-black backgrounds, Poppins typography, @[IG_HANDLE] handle. Use this skill whenever [YOUR_NAME] asks to make a carousel, IG post, swipeable post, Instagram slides, or wants to turn a video transcript, topic, article, or reference screenshot into a carousel. Also trigger on "make me a carousel", "IG carousel", "turn this transcript into a carousel", "[BRAND] post", "carousel post about X". Writes Hormozi-style punchy copy — bold claims, short sentences, specific numbers, one clear CTA. If the output is an Instagram carousel, this is the skill to use.
---

# Carousel Generator ([BRAND] brand)

Generate on-brand Instagram carousels for [BRAND]. Output is 5-6 coded HTML slides (hard cap 6) at 420×525 design width, exported as 1080×1350 PNGs via Playwright. No image generation — real fonts, pixel-perfect spacing, consistent [BRAND] brand every time.

The brand is locked. Do not ask what colors or fonts to use. Read `references/brand.md` for the exact tokens.

---

## Output location (non-negotiable)

`Marketing/Carousels/` has exactly four kinds of entry at its root. **Never create anything else there.**

```
[CONTENT_ROOT]/Carousels/
├── _Testing/                ← ONLY when [YOUR_NAME] explicitly asks for a test/variant
(shared photo library: Marketing/_photo-library/)
├── Reels/                   ← /motion-reel-carousel output only
└── {Mon} Batch/             ← approved work, one folder per month (Aug Batch, Sep Batch)
```

**Build straight into the current month's batch folder — `{Mon} Batch/{slug}/`.** [YOUR_NAME] dropped the `_Testing/` staging step on 2026-08-14: it added a promotion round-trip to work he was going to keep anyway. Only use `_Testing/` when he explicitly asks for a test, a style comparison, or throwaway variants. Nothing is ever written to the root of `Carousels/`.

Iterate in place — revisions happen inside the batch folder, no move required. If he does ask for a test and later approves it, move the whole folder, don't copy:

```bash
mv "$CAROUSELS/_Testing/$SLUG" "$CAROUSELS/$(date +%b) Batch/$SLUG"
```

Inside either location the carousel folder is flat:

```
{slug}/
├── carousel.html
├── profile.png        ← copied from the skill's assets; used in the lockup
│                        canonical source: "[CONTENT_ROOT]/_photo-library/profile.png"
├── slide_1.png
├── slide_2.png
└── ...
```

Where `{slug}` is a short kebab-case name derived from the hook or topic (e.g. `automated-pipeline`, `stop-hiring-editors`).

**Folder setup — always, first thing, before writing HTML:**

```bash
SLUG="your-slug-here"
CAROUSEL_DIR="[CONTENT_ROOT]/Carousels/$(date +%b) Batch/$SLUG"
mkdir -p "$CAROUSEL_DIR"
cp "~/.claude/skills/carousel-generator/assets/profile.png" "$CAROUSEL_DIR/profile.png"
```

**Profile picture — canonical source.** `assets/profile.png` is a mirror of `[CONTENT_ROOT]/_photo-library/profile.png`. That Desktop file is the only approved photo of [YOUR_NAME] for lockups and avatars; use it by default on every carousel unless he names a different one. If the two ever differ, re-copy from the Desktop file — it wins.

The `cp` step is non-negotiable — the lockup and the IG preview-header both reference `src="profile.png"` as a relative path. Without the file in the carousel folder, the image is broken in the preview **and** in the exported PNGs (the export script loads the HTML via `file://` so relative URLs resolve against the carousel folder).

Then write `carousel.html` and export `slide_*.png` files **in the same folder**. Do NOT nest PNGs in a `/slides` subfolder — flat layout only. When calling the exporter, `--out` is the carousel folder itself:

```bash
python3 scripts/export_carousel.py \
  --html "$CAROUSEL_DIR/carousel.html" \
  --out  "$CAROUSEL_DIR" \
  --slides N
```

---

## Preview requirement (every carousel)

The preview HTML MUST be click/keyboard/touch navigable. Static HTML with no navigation breaks [YOUR_NAME]'s review flow. Every carousel includes the navigation script below at the bottom of the file (before `</body>`):

```html
<script>
(function() {
  const track = document.querySelector('.carousel-track');
  const viewport = document.querySelector('.carousel-viewport');
  const slides = document.querySelectorAll('.carousel-track .slide');
  const dots = document.querySelectorAll('.ig-dots span');
  const TOTAL = slides.length;
  const SLIDE_W = 420;
  let idx = 0;
  function go(n) {
    idx = Math.max(0, Math.min(TOTAL - 1, n));
    track.style.transform = 'translateX(' + (-idx * SLIDE_W) + 'px)';
    dots.forEach((d, i) => d.style.background = i === idx ? '#303b2f' : '#ccc');
  }
  viewport.addEventListener('click', (e) => {
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) go(idx - 1); else go(idx + 1);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  });
  dots.forEach((d, i) => {
    d.style.cursor = 'pointer';
    d.addEventListener('click', (e) => { e.stopPropagation(); go(i); });
  });
  let touchStartX = 0;
  viewport.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
  viewport.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
  });
})();
</script>
```

This is already baked into `assets/template.html`. Do not skip it — [YOUR_NAME] can't review a static carousel.

The export script (`scripts/export_carousel.py`) ignores this JS because it translates the track via page.evaluate() directly, so the script has zero impact on PNG output.

---

## Workflow

### Phase 1: Classify the input

Look at what [YOUR_NAME] provided and route accordingly. Do NOT ask about brand — it's fixed.

| Input type | What to do |
|---|---|
| Video transcript (`final_transcript.json`, `transcript.json`, or raw transcript text) | Extract the 5-10 strongest insights, quotes, or stats from the transcript. Map them to the carousel arc. |
| Topic prompt ("make a carousel about X") | Write the content yourself using [BRAND]'s voice. See `references/copy-patterns.md`. |
| Reference Instagram screenshot(s) + topic | Read the screenshots, extract content AND structural patterns (hero style, layout moves, slide count rhythm). Rebuild the same structure with [BRAND] brand. See `references/layout-variations.md`. |
| Article, newsletter, blog post | Condense to the 5-6 strongest beats, map to the arc. |
| Raw notes | Structure them into a coherent arc first, then write the carousel. |
| **YouTube URL present** (alongside transcript, topic, or standalone) | (a) **If no transcript/topic was also provided**, auto-fetch the transcript first: `python3 scripts/fetch_youtube_transcript.py "<url>"` — pulls YouTube's existing captions via `youtube-transcript-api` (install: `pip3 install --user youtube-transcript-api`). Zero AI on our side, near-instant on second run (local cache). Use the returned text as the transcript source. (b) Build the carousel normally, **swap the last slide for the YouTube thumbnail CTA** — see Phase 3 arc table + `references/components.md` § YouTube thumbnail CTA slide. (c) Ask [YOUR_NAME] for the ManyChat keyword (WATCH, VIDEO, LINK, etc.) during the copy phase. If the fetch errors with "no captions available", re-run with `--whisper` (slow, local-only, opt-in — requires `yt-dlp` and `openai-whisper` installed) or ask [YOUR_NAME] for a manual transcript. |

Ask the user only to clarify the topic or angle if it's genuinely ambiguous. Never ask about brand.

### Phase 2: Write the copy first

Before touching HTML, draft every slide's copy in plain text and show it to [YOUR_NAME] for approval. This is the 20% that determines 80% of the outcome — getting copy right before visual work saves huge iteration cost.

Follow `references/copy-patterns.md` strictly:
- Hooks: bold claim, contrarian take, or pattern interrupt. Never descriptive.
- Short sentences. Fragments are fine.
- Specific numbers over abstractions ("saved 11 hours" not "saved time")
- One clear CTA — no "link in bio for more" vague fluff

### Phase 3: Map to slide architecture

**Surfaces: beige, white, brand gradient. No black, ever.** [YOUR_NAME] explicitly killed the dark (near-black) slide surface — it doesn't sit with the brand anymore. The three slide classes are `.light` (beige #F5F1EA), `.white` (#FFFFFF), and `.gradient` (the deep-green gradient). Alternate them for visual rhythm; never two beige or two white in a row.

**No category tags.** The small uppercase `THE PROBLEM` / `THE REFRAME` / `BUILD YOURS` labels above headlines are removed from the brand. Every slide goes straight from lockup (when present) to headline. If you ever feel tempted to add one, don't.

**Photo-overlay carousels use the website brand, NOT the Poppins system below.** When slides are white text over a real photo of [YOUR_NAME], Poppins reads as generic AI content — he rejected it on sight. Use the [WEBSITE_DOMAIN] stack instead: Bricolage Grotesque 800 headlines (`-0.03em`, 1.04), Instrument Sans body, JetBrains Mono eyebrows/step-numbers/index (10px, `0.14em`, uppercase), beige `#BBAC8B` as the only accent, sand `#CBC4B8` for body copy, `#8A7B5C` for quiet marks. Emphasis is **Playfair Display italic 500 in beige** on the words carrying the pressure — the verdict or the promise, never the topic word or the buzzword. One italic run per headline, at the start or end of a line. Full tokens: `carousel-batch/references/brandbrandwebsite.md`. Add a ~6% overlay-blend grain layer and vary the slide structure (eyebrow on some slides, not all) — uniform eyebrow→headline→body on every slide is the tell that reads as AI-generated. Working examples: `Marketing/Carousels/Aug Batch/dashboard-wrong-order/` and `four-hour-report/`.

### 🚨 Video carousels — two incidents, two hard rules (2026-09-08)

1. **MP4 slides posted as still images.** A row with six MP4s in `Carousel Images` was picked up while the poster's carousel branch was image-only (`media_type: IMAGE`, `.png` S3 keys). Instagram rendered a frozen frame on every slide. [YOUR_NAME] deleted the post. The unified poster `[N8N_WF_AUTOPOSTER_ID]` now handles VIDEO children (real extension on S3, `VIDEO` + `video_url`, per-child FINISHED polling), but the rule stands: **before scheduling any media type the poster hasn't posted before, read the live workflow's node bodies and confirm the path exists. If it doesn't, the row stays on `To Review`, never `Ready`.** Warning in chat is not enough; set the row back yourself.
2. **Black Instagram thumbnail.** Instagram uses frame 0 of the first video slide as the carousel cover in the grid and there is no API way to change it (and video carousels can't be hidden from the grid). Slide 1 started on a fade from black, so the profile tile was solid black. **Gate before every video-carousel schedule: extract frame 0 of `slide_1.mp4` with ffmpeg and look at it. If it is black or empty, do not schedule.** The notebook style solves this with headline visible at frame 0 plus a blurred teaser of the finished drawing (`"teaser": true`), see `carousel-generator/references/notebook-style.md`.

```bash
ffmpeg -v error -y -i "$DIR/slide_1.mp4" -frames:v 1 /tmp/cover_check.png   # then Read it; must not be black
```

**Notebook style (black, hand-drawn, animated) is a motion style.** When the point of the carousel IS a drawing (a 2x2, a flow, a before/after sketch) and [YOUR_NAME] wants it to feel like his notebook, do not build it here. Read `references/notebook-style.md` and render through `/motion-carousel` with `surface: "black"` and the `matrix` or `sketch` slide types. Drawn things draw in like a pen, typeset things fade. Reference build: `Sep Batch/system-matrix/`.

**Hand-drawn means unique — draw every mark from scratch, per slide.** If a carousel uses hand-drawn swipe arrows, underlines, circles or scribbles, each one must be a *materially different shape*: different path geometry, curvature, length, arrowhead angle and stroke width. Re-using one path and only changing the turbulence seed produces five identical arrows with different noise — the eye reads that instantly as copy-paste and the whole "hand-made" effect dies. Give each slide its own gesture (a long S-sweep, a hook with a loop, a near-straight diagonal, a J that dips before climbing, a backwards-C) so it looks like the same hand drew it five separate times. Same rule for any repeated hand-drawn element across a batch.

**HARD CAP: 6 slides. 5 is better.** Drop-off compounds with every swipe — a 9-slide carousel means almost nobody reads the payoff or the CTA, so the whole message dies before it converts. Never ship 7+. If the content "needs" more slides, it doesn't — it needs a sharper argument, or it's two carousels.

**One point per slide, and every slide must set up the next.** Each slide earns the swipe by leaving an open loop: claim → cause → consequence → fix → order/proof → payoff+CTA. If you can reorder two slides without the carousel breaking, they aren't a chain — they're a list, and a list loses people. Merge or cut until it reads as one continuous argument.

**The open loop lives at the BOTTOM of the slide, never the top.** The last line of every slide (except the final one) is a hanging setup that only the next slide resolves — the reader has to swipe to close it. Never put the bridge on the slide that answers it; by then the reader has already decided whether to keep going.

- Wrong: slide 1 ends on the claim, slide 2 opens with *"Because you built it backwards…"*
- Right: slide 1 ends on *"…and it's not the tool's fault."* → slide 2 delivers the cause.

Practical forms: an unfinished sentence that completes on the next slide, a colon promising a list, a denial that demands the real answer (*"…and it's not X."*), or a stake-raise (*"…there's one move that kills all 51:"*). Make the tease specific — a vague cliffhanger reads as filler and gets swiped past. Read the whole carousel top-to-bottom as one paragraph: if any slide break is a clean full stop, that's where you lose people.

Default [BRAND] arc (5-6 slides, flex based on content):

| # | Type | Surface | Purpose |
|---|------|---------|---------|
| 1 | Hero | beige (`.light`) | Hook — bold claim, logo lockup |
| 2 | Cause | white | Why the hook is true — center-aligned so text lands near the eye-line |
| 3 | Consequence | gradient | What it costs them — makes the fix necessary |
| 4 | Fix | beige (`.light`) | The concrete reframe or move |
| 5 | Proof/How | white | Specifics, order, or numbered steps |
| 6 | CTA | gradient | Payoff line + one clear action + @[IG_HANDLE]. **YouTube variant:** thumbnail card + ManyChat comment-keyword CTA — see `references/components.md` § YouTube thumbnail CTA slide. |

Merge slides down when the content doesn't need them — 5 beats 6. A pure how-to might be: Hook → Steps → CTA. A pattern-interrupt piece might be Hook → Reframe → Proof → CTA.

**Emphasis color per surface:** green (`--brand-primary`) on beige/white, gold (`--brand-accent-gold`) only on the gradient. Don't use gold on light surfaces — it disappears.

**Vertical alignment:** for text-heavy slides like the problem slide, use `.slide.white.center` so content sits around the optical center rather than `.end` (flex-end), which pushes it to the bottom and leaves dead space above the reader's eye-line.

### Phase 4: Generate the HTML

Use `assets/template.html` as the starting scaffold. It includes:
- Poppins Google Fonts link
- [BRAND] brand CSS variables
- Instagram preview frame wrapper (header, dots, actions, caption)
- Carousel viewport at 420×525

Read `references/components.md` for the reusable HTML bits (tag pills, feature lists, numbered steps, CTA button, progress bar, swipe arrow).

Rules that apply to every carousel:
- Aspect ratio: 4:5 at 420×525 design width
- Every slide gets a progress bar at bottom showing position (`(index+1)/total * 100%` fill)
- Every slide except the last gets a swipe arrow on the right edge
- Alternate surfaces for rhythm: beige ↔ white ↔ gradient. Never two beige or two white in a row.
- No category tags above headlines — go straight to the hook.
- Last slide: brand gradient, NO arrow, progress bar at 100%, @[IG_HANDLE] handle visible
- Content padding: `0 36px` standard, `0 36px 52px` to clear the progress bar
- **Never change the 420px frame width** — all typography and spacing is designed for it

**YouTube carousels — extra step for the last slide:**

Before writing the HTML, run the thumbnail fetcher and capture its output:

```bash
THUMB=$(python3 ~/.claude/skills/carousel-generator/scripts/fetch_youtube_thumbnail.py "<youtube-url>")
```

Then embed `$THUMB` as the `src` of the thumbnail `<img>` on the CTA slide (see `references/components.md` § YouTube thumbnail CTA slide). It's a base64 data URI — required so the thumbnail survives the Playwright export (per `references/export-guide.md`). Never use a raw `https://img.youtube.com/...` URL on the slide — it'll render in the browser preview but disappear in the exported PNG.

The fetcher tries `maxresdefault → sddefault → hqdefault` and skips YouTube's gray-placeholder response. No YouTube API key needed.

### Phase 5: Preview → iterate → export

Write the HTML file, then open it so [YOUR_NAME] can swipe through the IG-framed preview. Ask him to flag issues per slide. Fix individual slides rather than rebuilding the whole carousel.

Once approved, export via `scripts/export_carousel.py`. Read `references/export-guide.md` for the full explanation. Short version:
- Keep HTML layout at 420px width
- Playwright uses `device_scale_factor=2.5714` to scale to 1080×1350 output
- Base64-encode any embedded images
- `wait_for_timeout(3000)` lets Google Fonts load before screenshotting

Output lands in `{output_dir}/slide_1.png` ... `slide_N.png`, ready for direct Instagram upload.

---

## Reference files

Read these as you need them. Don't load all at once.

- `references/brand.md` — Locked [BRAND] palette, fonts, handle, logo lockup. Read first.
- `references/copy-patterns.md` — Hormozi-style hook formulas, punchy copy rules, CTA patterns.
- `references/components.md` — Reusable HTML components (pills, feature rows, numbered steps, CTA button, IG frame).
- `references/layout-variations.md` — Common Instagram carousel layout patterns, for matching when a reference screenshot is provided.
- `references/export-guide.md` — How the Playwright export works, rules, mistakes to avoid.
- `references/notebook-style.md` — Black hand-drawn animated style (renders via /motion-carousel). Style contract + spec examples.

## Scripts

- `scripts/export_carousel.py` — Ready-to-run. Takes the carousel HTML and output directory, produces 1080×1350 PNGs. Update `TOTAL_SLIDES` before running.

## Assets

- `assets/template.html` — Base HTML scaffold with Poppins + [BRAND] brand CSS variables + IG preview frame. Copy it, fill in the slides, and save to the working directory.
