---
name: carousel-batch
description: >
  Batch-produce a month of [BRAND] Instagram carousels in four gated phases — ideas → scripts → styles → generate —
  so copy is locked before a single pixel is rendered. Use when [YOUR_NAME] wants to batch carousels, plan a month of
  carousels, do a carousel batch session, or says "/carousel-batch", "batch my carousels", "plan 30 carousels",
  "carousel batch for September", "write the slide text for the batch", "generate the batch". Two styles only:
  real photos of [YOUR_NAME] with text overlay, or fully coded branded HTML. Output is dated day-folders of numbered
  PNGs he posts manually from the Instagram app. For a SINGLE one-off carousel, use /carousel-generator instead.
---

# Carousel Batch

Produce a month of carousels in one sitting per phase. The entire point is **not generating until the text is locked** — regenerating 30 carousels because the copy was wrong is the exact waste this skill exists to prevent.

[YOUR_NAME] posts every carousel **manually from the Instagram app**. There is no autoposter, no Notion, no S3, no scheduler. The folder structure is the queue.

---

## The gate — read this before doing anything

Every entry in `plan.md` carries a `status`. Each phase only touches entries at the correct status, and **refuses to run ahead**:

| Phase | Command | Acts on | Advances to |
|---|---|---|---|
| 1. Ideas | `/carousel-batch ideas` | — (creates the plan) | `idea` |
| 2. Script | `/carousel-batch script` | `idea` | `scripted` |
| 3. Style | `/carousel-batch style` | `scripted` | `styled` |
| 4. Generate | `/carousel-batch generate` | `styled` | `built` |

If [YOUR_NAME] asks to generate and entries are still at `idea` or `scripted`, **stop and say so**:

> 18 of 30 entries have no slide text yet. Run `/carousel-batch script` first — generating now means regenerating later.

Never "helpfully" run two phases in one go. The pause between phases is where he edits the copy, and that edit is the whole value. The only exception is an explicit override ("I know, do it anyway") — then generate only the `styled` entries and report exactly what you skipped.

---

## Folder structure (non-negotiable)

`Marketing/Carousels/` has exactly four kinds of entry at its root — `_Testing/`, `Reels/` and `{Mon} Batch/` (the shared photo library lives at `Marketing/_photo-library/`). **Never create anything else there, and never write a carousel to the root itself.**

```
[CONTENT_ROOT]/Carousels/
├── _Testing/                    ← only when [YOUR_NAME] explicitly asks for a test/variant
│   └── {slug}/
(photo library: ../_photo-library/ — shared across all of Marketing, see references/photo-style.md)
│   ├── photos.json
│   └── *.jpg
├── Reels/                       ← /motion-reel-carousel output only
└── Aug Batch/
    ├── plan.md                  ← the state store. [YOUR_NAME] edits this directly.
    ├── plan.json                ← build artifact, written at generate time
    ├── Aug 10/
    │   ├── 1.png … 7.png        ← what he uploads, in order
    │   ├── caption.txt          ← what he pastes
    │   ├── carousel.html        ← the source, for re-exports
    │   ├── profile.png
    │   └── photo_1.jpg …        ← only for photo-style carousels
    └── Aug 11/
```

**Day folders are zero-padded** (`Aug 08`, not `Aug 8`) so they sort correctly on his phone. Batch folders are `{Mon} Batch` — `Aug Batch`, `Sep Batch`.

### Testing vs approved — the hard rule

**Build straight into the current month's batch folder.** `_Testing/` is only for work [YOUR_NAME] explicitly calls a test or a style comparison (his call, 2026-08-14 — the staging round-trip wasn't earning its keep).

Real carousels go to `{Mon} Batch/{slug}/` from the first render and get revised in place. Only genuine experiments — style tests, brand comparisons, layout option sets he asked to compare — live in `_Testing/{slug}/`, one folder per experiment with the variants inside it. Never scatter option files at the root of `Carousels/`.

Promoting is a move, not a copy:

```bash
CAROUSELS="[CONTENT_ROOT]/Carousels"
mv "$CAROUSELS/_Testing/$SLUG" "$CAROUSELS/$(date +%b) Batch/$SLUG"
```

A full month batch that [YOUR_NAME] has approved at the plan.md gate is approved work — scaffold it straight into `{Mon} Batch/`. A batch he's still deciding on is not.

Slides are `1.png … N.png`. Not `slide_1.png` — he's picking them off a phone in upload order.

---

## Phase 1 — `/carousel-batch ideas`

Ask for the month and how many (default 30). Then write `plan.md` with that many entries at `status: idea`.

Ideas must be **specific claims, not topics**. "AI automation" is not an idea. "Your business isn't slow, your data is" is.

Pull from what's actually going on:
- Real client builds and their outcomes ([CLIENT], Ruder Klart, [CLIENT], Suit Club — real numbers beat abstractions)
- Objections he hears on sales calls
- Contrarian takes on AI hype — the "context is king / data before AI" thesis is his core differentiator
- Things he built for himself that others do by hand

Spread them across the arc: ~40% problem-aware hooks, ~40% how-it-works/proof, ~20% hard opinion. Don't write slide text yet. One line each.

Then tell him: **delete the weak ones directly in `plan.md`, then run `/carousel-batch script`.** Killing ideas is free at this stage and expensive later.

## Phase 2 — `/carousel-batch script`

For every entry at `status: idea`, write the **exact text of every slide** plus the caption, into the entry in `plan.md`. Set `status: scripted`.

Follow `~/.claude/skills/carousel-generator/references/copy-patterns.md` — that's the locked [BRAND] voice, don't reinvent it. Short sentences. Specific numbers. One clear CTA.

Slide count: 5-6, hard cap 6 — drop-off compounds per swipe, so 7+ buries the payoff and CTA. One point per slide, each setting up the next. Put the open loop at the BOTTOM of each slide — the last line is a hanging setup only the next slide resolves (never open a slide with "Because…"; end the previous one on it). No slide break may be a clean full stop. Structure per `references/plan-format.md`.

Then stop and tell him to **read the text and edit it in `plan.md`**. This is the review layer. Fixing a word here costs nothing; fixing it after render costs a full re-export.

## Phase 3 — `/carousel-batch style`

For every entry at `status: scripted`, assign exactly one style and set `status: styled`.

- **`photo`** — real photos of [YOUR_NAME], text overlaid. Read `Marketing/_photo-library/photos.json`, pick photos whose subject matches the slide's message, and list them in the entry. See `references/photo-style.md`.
- **`coded`** — fully coded branded slides, the existing [BRAND] look. No photos.

If `Marketing/_photo-library/photos.json` does not exist yet, say so plainly and set everything to `coded` — do not invent filenames. A carousel referencing a photo that isn't there fails at export.

Default mix: **roughly 60% photo, 40% coded.** Photos of a real person outperform pure graphics on IG, but an all-photo feed loses the branded look that makes the grid read as one system. Vary it deliberately — don't alternate mechanically.

## Phase 4 — `/carousel-batch generate`

Refuse any entry not at `status: styled`. Then:

1. Assign dates — sequential days from the batch's `start:` date, one carousel per day, in plan order.
2. Write `plan.json` from `plan.md` (schema in `references/plan-format.md`).
3. `python3 scripts/batch.py scaffold --batch "<batch dir>"` — creates day folders, copies `profile.png` and any referenced photos, writes `caption.txt`.
4. For each day folder, write `carousel.html`:
   - **Read the batch's brand file first** — `brand:` in `plan.md`, defaulting to `brand.md`. Resolution: `brand.md` means `~/.claude/skills/carousel-generator/references/brand.md` (Brand 1, warm editorial); any other filename means that file in *this* skill's `references/` folder. Current options there: `brand2.md` (dark technical, lime), `brandbrandwebsite.md` (dark technical, website beige), `niksetting_brand.md` (photo-first editorial, no accent color).
     The brand file is the authority on tokens, surfaces, fonts, type scale, emphasis and slide rhythm. Where it contradicts anything below, the brand file wins — including rules stated as non-negotiable.
   - Structure scaffold (frame, viewport, track, nav script): `~/.claude/skills/carousel-generator/assets/template.html`. On Brand 2 keep the structure and replace the entire style block — the template's colors and fonts are Brand 1's.
   - Reusable slide components: `~/.claude/skills/carousel-generator/references/components.md` (written for Brand 1; restyle them with Brand 2 tokens)
   - Photo slides: `references/photo-style.md` in *this* skill — brand-independent apart from the scrim color
   - Never change the 420px frame width
5. `python3 scripts/batch.py finish --batch "<batch dir>"` — exports every day folder to 1080×1350 PNGs and renames them `1.png … N.png`.
6. Set `status: built` in `plan.md` and report: how many built, which dates, anything skipped.

Work through the day folders in order. Don't parallelise with subagents unless [YOUR_NAME] asks — a 30-carousel export is a few minutes and sequential keeps the failures readable.

---

## Relationship to /carousel-generator

This skill **reuses** that one's brand, template, components, copy patterns and exporter by absolute path. It does not copy or modify them. One brand, one source of truth.

Use `/carousel-generator` for a single carousel from a transcript, a YouTube video, or a one-off idea. Use this skill when the unit of work is a month.

---

## Reference files

- `references/plan-format.md` — `plan.md` grammar, `plan.json` schema, status lifecycle
- `references/photo-style.md` — photo-library contract, photo-slide HTML/CSS, composition rules
- `references/brand2.md` — Brand 2 "Signal": dark technical system, swap-in replacement for Brand 1's `brand.md`
- `references/brandbrandwebsite.md` — [BRAND] Website brand: Brand 2's system with the live [WEBSITE_DOMAIN] sand accent

## Scripts

- `scripts/batch.py scaffold` — build day folders from `plan.json`, copy assets, write captions
- `scripts/batch.py finish` — export each day's HTML to PNGs, rename to upload order
