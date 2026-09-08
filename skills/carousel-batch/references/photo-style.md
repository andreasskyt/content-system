# Photo style

Real photos of [YOUR_NAME] with text overlaid. This is the style that outperforms on Instagram — a face and a real environment stop the scroll in a way a graphic doesn't. The branded coded style is the other half of the mix; see `brand.md` in `/carousel-generator` for that.

## Photo library contract

```
[CONTENT_ROOT]/_photo-library/
├── photos.json
├── 01-desk-night.jpg
├── 02-whiteboard.jpg
└── …
```

`photos.json`:

```json
[
  {
    "file": "01-desk-night.jpg",
    "desc": "at the desk late, two screens on, city dark behind",
    "tags": ["work", "night", "solo", "building"],
    "focal": "right"
  },
  {
    "file": "02-whiteboard.jpg",
    "desc": "drawing a system diagram on a whiteboard, mid-gesture",
    "tags": ["teaching", "systems", "explaining"]
  }
]
```

- `file` — filename in the same folder
- `desc` — plain description of what's happening; this is what you match against the slide's message
- `tags` — loose keywords for filtering
- `focal` — `left` | `right` | `center`, where [YOUR_NAME] sits in the frame. Text goes on the **opposite** side. Defaults to `center` (text goes bottom).
- `text_space` — where the frame is actually empty enough to hold copy, and which ink it needs. The single most important field when running `niksetting_brand.md`, which places text by negative space rather than to a grid.
- `grade` — `A`–`C`, how well the shot works for carousels. Hero slides pull from A only.
- `orientation` — `portrait` | `landscape`. Landscape shots lose most of the frame in a 4:5 crop; avoid for hero slides.

Shoot **landscape or 4:5 portrait**, minimum 1080px on the short edge. Anything smaller will look soft at 1080×1350.

If `photos.json` is missing, say so and fall back to `coded`. Never invent filenames — a missing photo produces a broken slide that survives all the way to export.

## Picking photos

Match the photo to what the slide *says*, not to a vibe. A slide about explaining something to a client gets the whiteboard shot. A slide about grinding alone gets the desk-at-night shot. Reaching for whatever looks nicest is how a carousel ends up feeling stock.

2-4 photo slides per carousel. Never all of them:

- **Slide 1 always photo** — it's the scroll-stopper
- Body slides that carry an argument or numbers go **coded** (beige/white/gradient) — text over a photo is harder to read, and a dense paragraph on a photo is unreadable at feed size
- **Last slide (CTA) always coded gradient** — the CTA needs the brand, not a face
- Never two photo slides adjacent

So a typical 6-slide photo carousel is: `photo → beige → photo → white → photo → gradient`.

## Photo slide HTML

Photos are copied into the day folder as `photo_1.jpg`, `photo_2.jpg` … by `batch.py scaffold`, and referenced **relatively**. The exporter loads the HTML over `file://`, so relative paths resolve — same mechanism as `profile.png`. Never reference the library path directly and never use an absolute path.

Add this CSS alongside the template's existing styles:

```css
.slide.photo { position: relative; padding: 0; overflow: hidden; }

.slide.photo .ph-bg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
}

/* Non-negotiable. Text never sits on a raw photo. */
.slide.photo .ph-scrim {
  position: absolute; inset: 0;
  background: linear-gradient(180deg,
    rgba(22,27,21,0.10) 0%,
    rgba(22,27,21,0.55) 48%,
    rgba(22,27,21,0.92) 100%);
}

.slide.photo .ph-content {
  position: relative; z-index: 2;
  height: 100%;
  display: flex; flex-direction: column; justify-content: flex-end;
  padding: 0 36px 52px;
}

.slide.photo h1 { color: #fff; }
.slide.photo .sub { color: rgba(255,255,255,0.78); }
```

A photo slide behaves like a gradient slide for every other component, so add `.slide.photo` to those selectors in the template — otherwise the progress bar and arrow render in their dark-on-light variant and vanish against the scrim:

```css
.slide.gradient .progress-track,   .slide.photo .progress-track   { background: rgba(255,255,255,0.18); }
.slide.gradient .progress-fill,    .slide.photo .progress-fill    { background: #fff; }
.slide.gradient .progress-counter, .slide.photo .progress-counter { color: rgba(255,255,255,0.5); }
.slide.gradient .swipe-arrow,      .slide.photo .swipe-arrow      { background: linear-gradient(to right, transparent, rgba(255,255,255,0.08)); }
.slide.gradient .lockup .name,     .slide.photo .lockup .name     { color: #fff; }
.slide.gradient .hl,               .slide.photo .hl               { color: var(--brand-accent-gold); }
```

Markup:

```html
<div class="slide photo">
  <img class="ph-bg" src="photo_1.jpg" alt="">
  <div class="ph-scrim"></div>
  <div class="ph-content">
    <h1 class="sans">Your business isn't slow.<br>Your <span class="hl">data</span> is.</h1>
    <p class="sub sans">15 tools. Zero source of truth.</p>
  </div>
</div>
```

The progress bar and swipe arrow still go on photo slides. They already carry `z-index: 9/10` from the template, which puts them above the scrim — don't add positioning of your own.

## Rules

- **Scrim always.** No exceptions. Even a dark photo gets it — it's what keeps type legible across 30 different shots.
- **Headline max ~9 words** on a photo slide. Long text needs a solid surface.
- Text colors follow the gradient rules from `brand.md`: white headline, `rgba(255,255,255,0.78)` sub, gold for a highlighted word, red pen underline for `.hl`.
- **Shift the scrim, not the text,** when [YOUR_NAME] is bottom-of-frame: change the gradient to `180deg, rgba(22,27,21,0.92) 0%, rgba(22,27,21,0.55) 52%, rgba(22,27,21,0.10) 100%` and set `justify-content: flex-start` with padding `52px 36px 0`.
- If a photo has him hard `left` or `right`, keep text bottom and let the scrim do the work. Side-by-side text and face at 420px wide is too cramped to read.
- Never stretch — `object-fit: cover` only. A distorted face reads as amateur instantly.

## Text placement variants (added 2026-08-25 — vary these, never all-bottom)

A photo carousel must MIX placements across its slides — all-bottom reads as a template. Three variants, chosen by where the photo's negative space is (never over a face):

```css
/* top-anchored — flip the scrim */
.slide.photo.top .ph-scrim { background: linear-gradient(180deg, rgba(22,27,21,0.92) 0%, rgba(22,27,21,0.55) 52%, rgba(22,27,21,0.10) 100%); }
.slide.photo.top .ph-content { justify-content: flex-start; padding: 52px 36px 0; }
/* center-stage — centered text, symmetric scrim; use for quotable/punch slides */
.slide.photo.mid .ph-scrim { background: linear-gradient(180deg, rgba(22,27,21,0.35) 0%, rgba(22,27,21,0.74) 50%, rgba(22,27,21,0.35) 100%); }
.slide.photo.mid .ph-content { justify-content: center; align-items: center; text-align: center; padding: 0 36px; }
/* oversized statement (combine with .mid) — for a single huge line like "#1 CONSTRAINT" */
.slide.photo.big h1 { font-size: 42px; letter-spacing: -1px; }
```

Rhythm guide for a 6-slide carousel: e.g. top → mid → top → bottom → mid → bottom. Hook slide placement = wherever the photo's empty space is; CTA usually bottom. [YOUR_NAME]'s call 2026-08-25: "vary the placing, don't make them look exactly the same."
