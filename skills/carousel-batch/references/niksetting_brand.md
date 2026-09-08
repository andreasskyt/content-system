# Nik Setting — style system

Reverse-engineered from three of his carousels: the *7 story types* explainer, the *7 lessons i wish i knew about content* editorial set, and the *pov: you got onboarded at grow acquisition* process deck.

Swap-in replacement for `brand.md`. When a carousel runs on this file, every rule here overrides Brand 1/2/3 — including their non-negotiables. Do not mix.

> **v1**, built from three carousels. Refine as more references come in rather than starting a new file.

---

## The thesis

**The photograph is the design.** There is no colored canvas, no card system, no accent palette, no logo, no progress bar. A slide is a photo, a very large piece of type, and a paragraph. Everything that makes it look expensive comes from the image and from three type decisions.

This means the style is cheap to *lay out* and expensive to *feed*. All the production cost moved into photography. **You cannot fake this with a good CSS file — without real photos it collapses into white text on a stock image.** Read the photography section before anything else.

---

## Photography — the hard dependency

Non-negotiable requirements. A carousel that violates these will not look like his work no matter how correct the type is.

**Location discipline depends on the layout, and the two are very different:**

- **`process` requires one shoot, one location, one lighting setup.** Every slide of his onboarding deck is literally the same studio — same truss ceiling, same warm lamps, same brown leather chairs. That deck cannot be assembled from a camera roll.
- **`editorial` tolerates many locations.** His *7 lessons* set jumps between a studio, a ballroom stage, a hotel suite, a restaurant and a night office — eight slides, eight different days. What unifies it is **grade and wardrobe, not place**: every frame is warm, muted and dim, and everyone is in black, brown or off-white.

So an editorial carousel can be built from an existing library. A process carousel needs a dedicated session. If library shots vary in grade — one hard-daylight frame among five warm dim ones — **grade them to match before use**; a single saturated outlier will break the set faster than a change of location ever does.

**Consistent wardrobe.** Every person in every frame is in black, brown, or off-white. No logos, no pattern, no color.

**Warm, dim, directional light.** Pools of warm light against a darker room. Practical lamps in frame (orange glow spheres, floor lamps, monitor glow). Never flat overhead lighting, never daylight-blue.

**Muted, filmic grade.** Desaturated warm — beige, brown, black, amber. The only saturated color in any frame comes from a screen.

**Compose for text.** Every usable frame has a large empty region — a wall, a backdrop, a ceiling, a table surface. Shoot deliberately wide with the subject to one side or low in frame. A tightly-cropped photo is unusable in this system.

**Frame types to capture in a session:**
- subject seated in profile, negative space above
- subject standing at a screen or wall, mid-gesture
- two people at a table, working, shot from across
- group seated, wide
- over-the-shoulder at a monitor, screen legible
- empty room / detail (desk, notes on a table) for breathing slides

If a batch has no photo library, **do not attempt this brand.** Fall back to `brand2.md` or `brandbrandwebsite.md` and say so.

---

## Type

Two families. The tension between them is his single most consistent signature across all three carousels.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,500;0,700;1,500;1,700&display=swap" rel="stylesheet">
```

```css
--display: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Inter Tight", "Helvetica Neue", sans-serif;
--serif:   "Playfair Display", "Bodoni Moda", Georgia, serif;
```

`--display` leads with SF Pro Display because that's what he's actually using and it's already on the Mac the export runs on. Inter Tight is the deterministic Google fallback and is metrically close. **Never set body copy in the serif** — the serif exists only for ghost numerals and the occasional italic connective phrase.

### Sizing rule — width-driven, not fixed

His one-word titles always span **85–95% of the canvas width**. That means font size is derived from character count, not set to a constant. On the 420px canvas:

| Characters | Size |
|---|---|
| 4–6 (`angles`, `pov`) | 72px |
| 7–9 (`lessons`, `currency`, `invisible`) | 62px |
| 10–12 (`creativity`, `intention`) | 50px |
| 13–15 (`transposition`, `differentiation`) | 38px |

Always check the exported PNG and adjust — the goal is edge-to-edge, not a number from a table.

### Scale

| Use | Family | Size | Weight | Tracking | Leading |
|---|---|---|---|---|---|
| One-word title (editorial) | display | see table | 700 | -0.035em | 0.95 |
| Step title (process) | display | 30px | 700 | -0.03em | 1.05 |
| Hook stack (large) | display | 46px | 700 | -0.035em | 0.98 |
| Hook stack (small) | display | 24px | 500 | -0.02em | 1.1 |
| Body | display | 13px | 500 | -0.005em | 1.5 |
| Body (editorial, long) | display | 13.5px | 600 | -0.005em | 1.45 |
| Italic connective | serif | matches adjacent | 500 italic | 0 | — |
| Ghost numeral (behind) | serif | 280–420px | 500 | — | 1 |
| Ghost numeral (beside) | serif | 54px | 500 | — | 1 |

All titles are **lowercase** in the editorial layout and **Title Case** in the process layout. Never uppercase, ever, anywhere.

---

## Color and legibility

```css
--ink-light: #FFFFFF;   /* text on darker photos */
--ink-dark:  #0A0A0A;   /* text on brighter photos */
--ghost:     rgba(255,255,255,0.30);  /* or rgba(10,10,10,0.22) on light photos */
```

**That is the entire palette.** There is no brand accent in this system. Any accent color appears only on the final CTA element, and even that is optional.

### The drop shadow is the whole trick

He never uses a dark gradient scrim. A scrim flattens the photograph and makes every slide look identical — the reason his images stay vivid is that the type carries its own separation instead.

```css
.nk-title, .nk-body {
  text-shadow:
    0 2px 26px rgba(0,0,0,0.55),
    0 1px 4px  rgba(0,0,0,0.40);
}

.on-light .nk-title, .on-light .nk-body {
  color: var(--ink-dark);
  text-shadow:
    0 2px 26px rgba(255,255,255,0.75),
    0 1px 4px  rgba(255,255,255,0.55);
}
```

**Pick ink per slide by photo luminance.** Sample the region the text will actually sit on, not the whole image: bright wall or white cyc → `.on-light` with dark ink; dim room or night desk → white ink. He switches mid-carousel without hesitation and it never reads as inconsistent.

If a photo is so busy that shadowed text still fails, the answer is **a different photo**, not a scrim.

---

## Ghost numeral

A large serif numeral at low opacity. Two placements, and the placement is what determines whether it works.

**Behind (hook slides only).** Enormous, centered-ish, the title sits on top of it.

```css
.nk-ghost-behind {
  position: absolute; z-index: 1;
  font-family: var(--serif); font-weight: 500;
  font-size: 380px; line-height: 1;
  color: rgba(255,255,255,0.22);
  top: 50%; left: 50%; transform: translate(-50%,-50%);
}
```

**Beside (process/step slides).** Sits immediately left of the title, optically aligned to the cap-height of the first line.

```css
.nk-step-head { display: grid; grid-template-columns: 44px 1fr; gap: 10px; align-items: start; }
.nk-ghost-beside {
  font-family: var(--serif); font-weight: 500;
  font-size: 54px; line-height: 0.9;
  color: rgba(255,255,255,0.35);
}
```

**Prefer *beside*.** Two of eight slides in his editorial set are genuinely hard to read because body copy runs straight through a numeral placed behind. The process deck uses *beside* throughout and has zero collisions. Only use *behind* on a hook slide where the type sits clear of the numeral's dense strokes.

---

## Layouts

Three archetypes. Pick one per carousel and hold it — never mix within a set.

### `editorial` — one word per slide

His strongest and cheapest format. Every slide is a photo. Each carries a single-noun title and 2–3 short paragraphs.

```
┌─────────────────────────┐
│  currency               │  ← title, top, lowercase, huge
│                         │
│      [photograph]       │
│                         │
│  body paragraph 1       │  ← placed in whatever region is empty
│                         │
│  body paragraph 2       │
└─────────────────────────┘
```

- Title locked to the top, ~36px from the left edge, ~28px from the top.
- Body placed wherever the photo has negative space — upper-right, lower-left, top-and-bottom. It moves every slide. The fixed title plus the moving body is what makes it feel composed rather than templated.
- **Body copy is long by carousel standards** — 40–60 words per slide, 2–3 paragraphs separated by a blank line. Optimizes for saves and depth, not scroll-stop.
- Lowercase throughout, conversational, heavy use of trailing `...`

**The single-noun title is the engine of this format.** One abstract noun per lesson: `currency`, `transposition`, `intention`, `invisible`, `angles`, `differentiation`. It creates a curiosity gap (you can't guess the content from the word), makes ordinary advice sound proprietary, and gives the reader something to remember. Choosing these words is 80% of the work — do it in the scripting phase, never at render time.

### `process` — numbered steps, offer explainer

Bottom-of-funnel. "Here is exactly what happens if you work with me." Photo canvas throughout.

```
┌─────────────────────────┐
│  1  Audit & Gameplan    │  ← ghost numeral beside Title Case title
│     │ body copy, 2-4    │  ← thin vertical rule left of body
│     │ lines             │
│                         │
│      [photograph +      │
│    composited proof]    │
└─────────────────────────┘
```

Fixed anatomy on every step slide — ghost numeral, title (1–2 lines), rule, body (2–4 lines). It never varies, which is exactly why it scans so easily.

```css
.nk-rule { border-left: 1.5px solid rgba(255,255,255,0.45); padding-left: 12px; }
.on-light .nk-rule { border-left-color: rgba(10,10,10,0.35); }
```

That hairline rule is a small device doing real work — it groups the paragraph and builds hierarchy with no box, no fill, no color.

**Proof must escalate across the deck.** His order: wins wall → content library → DM-to-signed flow → payment notifications → dashboards. Each step's evidence is more specific and more financial than the last, so the money lands right before the CTA.

### `explainer` — white slides, pills, device collages

The outlier. White canvas, huge black headline, ghost numeral, three color-coded pills, iPhone mockup collages bleeding off the edges.

Documented for completeness, but it is a **different visual language** from the other two and costs several times more to produce per slide. Its one genuinely portable idea is the **coded pill triad** — the same three metadata dimensions on every slide, same colors every time, so the reader learns the code once and then scans:

```css
--pill-cadence: #D8C5FF;  /* how often  */
--pill-effect:  #E5E5E5;  /* what it does */
--pill-fit:     #B5EFC8;  /* who it's for */
```

Default to `editorial` or `process`. Reach for `explainer` only when the content is genuinely a taxonomy that needs metadata.

---

## Composited proof

Screenshots are never pasted flat on top of the image. They're placed **into the scene** — on the wall behind the subjects, dimmed to the room's exposure, in matching perspective, partially occluded by people or furniture.

```css
.nk-proof {
  filter: brightness(0.82) contrast(0.95);
  border-radius: 6px;
  box-shadow: 0 18px 60px rgba(0,0,0,0.45);
  opacity: 0.94;
}
```

A screenshot at full brightness sitting square on the canvas is the single clearest tell of an amateur imitation of this style. If it can't be composited convincingly, leave it out.

Small hand-drawn annotation arrows and labels (in a handwriting face) are used sparingly to point at parts of a screenshot. One or two per slide maximum.

---

## Copy voice

- **Lowercase** for editorial titles and all body copy; Title Case for process step names.
- Short declaratives, fragments welcome, frequent `...` at paragraph ends.
- First person singular. He writes as one person even when describing a team.
- The hook slide uses a casual register (`pov: you got onboarded at`), then shifts to a serious one for the content. That shift is deliberate.
- **One CTA, one keyword**, shown as a mocked DM bubble with an arrow pointing at it — not as a button.

`copy-patterns.md` from `/carousel-generator` still governs hooks and CTA discipline. It is brand-independent.

---

## Slide arc

- 8–9 slides. Longer than the 5–7 of Brands 1–3, because body copy is doing more work.
- Slide 1 is always a hook: a photo, a stacked mixed-weight headline, often a ghost numeral behind.
- Last slide is the CTA with the mocked DM bubble.
- No progress bar, no dots, no handle, no logo lockup on interior slides. Instagram's native dots do the orientation. **Do not add the progress bar from Brands 1–3** — it is not part of this system and it makes the slides look busy.

---

## Failure modes — observed in his own work

These are real defects in the reference carousels. Don't reproduce them.

1. **Never split a sentence across a subject.** Two of his slides wrap body copy into two columns either side of a person, and the eye reads across the gap instead of down each column. The sentences become genuinely unparseable. If a subject sits mid-frame, put the text entirely above or entirely below.
2. **Never let body copy cross a face.** One slide runs a line straight through his head and a word is lost.
3. **Ghost numeral behind + long body = collision.** Use *beside* unless the slide is a hook.
4. **Watch the bottom third.** In the process deck it's mostly furniture and legs. Atmospheric, but at feed size the useful content is the top 40% — push text up and crop tighter than feels natural.
5. **Low-contrast elements over busy screenshots** — his content-wall slide is the hardest to read in the whole set. Put pills and small text over plain wall, never over a collage.

---

## Adapting this to [BRAND]

Three notes for when this style is used for [YOUR_NAME] rather than copied wholesale.

**Substitute proof of work for proof of lifestyle.** His frames sell an aspirational life — hotels, luxury cars, designer chairs. That's correctly targeted at people who want to be him. It reads as biz-opp to a business owner buying $20k of data infrastructure. [YOUR_NAME]'s equivalent frames are real work: a whiteboard mid-diagram, a monitor with a live dashboard, an n8n canvas, a client meeting.

**The dashboards slide is the opening.** In his process deck, "Data Optimization" is a wall of *invented* charts — the thinnest-substance slide he has. That slide is [YOUR_NAME]'s entire product, and he can shoot it for real: actual client dashboards, real Supabase schemas, real Slack alerts from his own workflows.

**The one-word titles map directly onto his domain.** `context` · `truth` · `schema` · `drift` · `provenance` · `latency` · `sources` · `sequence`. These are literally his job rather than borrowed vocabulary, which makes the device land harder for him than it does for its originator.
