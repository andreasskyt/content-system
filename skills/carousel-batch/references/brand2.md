# [BRAND] Brand 2 — "Signal" (candidate)

Dark technical aesthetic derived from the Creative Intelligence System build brief. Near-black canvas, hairline structure, monospace labelling, and one electric lime that only ever means *signal*.

This is a **swap-in replacement for `brand.md`**, not an addition to it. When a carousel runs on Brand 2, every rule here overrides the original — including the ones the original calls non-negotiable. Do not mix the two in a single carousel.

> Status: candidate for the rebrand. If it wins, the website moves to these exact tokens.

---

## Color tokens

Both notations are the same colors. Prefer `oklch` (that's the source of truth and what the site should use); the hex fallbacks exist for tools that can't parse it.

```css
:root {
  --bg:          oklch(0.125 0.006 275);   /* #060609 — near-black canvas, faint blue cast */
  --surface:     oklch(0.185 0.008 275);   /* #121216 — cards, raised slides */
  --surface-2:   oklch(0.222 0.009 275);   /* #1A1B1F — one step brighter, rarely needed */
  --fg:          oklch(0.968 0.004 270);   /* #F3F4F7 — primary text, near-white not pure */
  --muted:       oklch(0.68 0.011 275);    /* #96989F — body copy, secondary */
  --faint:       oklch(0.5 0.01 275);      /* #616369 — captions, meta, deep background text */
  --hairline:    oklch(1 0 0 / 9%);        /* rgba(255,255,255,0.09) — every border */
  --signal:      oklch(0.88 0.2 128);      /* #B1EF4A — THE accent. Electric lime. */
  --signal-dim:  oklch(0.62 0.13 128);     /* #6F9436 — eyebrows, markers, quiet accent */
  --signal-ink:  oklch(0.19 0.05 130);     /* #0C1800 — text ON a lime fill */
  --warn:        oklch(0.8 0.15 72);       /* #F8AC3D — amber, sparingly */
  --info:        oklch(0.75 0.1 220);      /* #5BBDDA — blue, sparingly */
  --glow:        oklch(0.338 0.06 143);    /* #243F22 — the green bloom behind the canvas */
}
```

### The one rule about lime

`--signal` is not a decorative color. It marks the single most important thing on a slide — one number, one word, one CTA. If two things on a slide are lime, neither reads as important. On most slides the correct amount of lime is a 10px eyebrow and nothing else.

`--warn` and `--info` exist for completeness. On a carousel you will almost never need them.

---

## Surfaces

Three slide backgrounds:

- **Void** (`.slide.void`) — `--bg` plus the glow. The default and the anchor. Hero and CTA are always void.
- **Surface** (`.slide.surface`) — flat `--surface`, no glow. The body-copy surface. Reads as a card lifted off the canvas.
- **Signal** (`.slide.signal`) — full `--signal` fill with `--signal-ink` text. A hard pattern interrupt.

```css
.slide.void {
  background:
    radial-gradient(620px 300px at 50% -90px, var(--glow), transparent 70%),
    var(--bg);
  color: var(--fg);
}
.slide.surface { background: var(--surface); color: var(--fg); }
.slide.signal  { background: var(--signal); color: var(--signal-ink); }
```

**Max one signal slide per carousel, and never slide 1.** It's the loudest move in the system — spend it on the single line you want screenshotted. Many carousels should use zero. Two lime slides in one carousel means neither lands.

Never put a photo behind lime. Never use pure `#000000` — the canvas is `#060609` and the blue cast is deliberate.

### Surface arc

Slide 1 is always **void**. After that alternate void ↔ surface for rhythm, dropping in the one signal slide at the payoff beat if the carousel has one. Last slide is always **void**.

A 6-slide carousel: `void → surface → void → signal → surface → void`
Without a signal slide: `void → surface → void → surface → void → void` — in that case give slide 5 a hairline-bordered stat block so two adjacent voids don't read as the same slide.

---

## Typography

Three families, each with a fixed job. This is the biggest departure from Brand 1's single-font system, and it's what makes the aesthetic read as technical rather than generic.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Instrument+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

```css
--display: "Bricolage Grotesque", "Helvetica Neue", sans-serif;  /* headlines, numbers. 700/800 only. */
--sans:    "Instrument Sans", system-ui, sans-serif;             /* body. 400/500/600. */
--mono:    "JetBrains Mono", ui-monospace, monospace;            /* eyebrows, labels, step numbers, meta. 400/500. */
```

Never set a headline in Instrument Sans, and never set body copy in Bricolage. The contrast between the two carries the design.

### Scale (fixed for the 420×525 canvas)

| Use | Family | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| Headline | display | 32px (28-36 allowed) | 800 | -0.03em | 1.04 |
| Headline, long | display | 26px | 800 | -0.03em | 1.08 |
| Body | sans | 14px | 400 | 0 | 1.55 |
| Lede / sub | sans | 15px | 400 | 0 | 1.5 |
| Eyebrow | mono | 10px | 500 | 0.14em | 1 (UPPERCASE) |
| Step number | mono | 12px | 500 | 0.06em | 1 |
| Stat value | display | 44px | 800 | -0.035em | 1 |
| Meta / caption | mono | 10px | 400 | 0.06em | 1.4 |

Headlines get `text-wrap: balance`. All numerals in mono or display contexts get `font-variant-numeric: tabular-nums`.

---

## The eyebrow — back, and load-bearing

Brand 1 banned category tags. **Brand 2 requires them.** The small mono uppercase label above the headline is a core element of this aesthetic — it's what makes a slide read as an instrument panel rather than a poster.

```html
<div class="eyebrow">THE PROBLEM</div>
```

```css
.eyebrow {
  font-family: var(--mono);
  font-size: 10px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--signal-dim);
}
```

One per slide, 1-3 words, always above the headline. On a signal slide use `--signal-ink` at 60% opacity instead of `--signal-dim`. Good eyebrows name the beat (`THE PROBLEM`, `WHAT I BUILT`, `THE ORDER`, `01 / 04`) — not the topic.

---

## Emphasis — no more red pen

The hand-drawn red underline from Brand 1 is **gone**. It's an organic, hand-made mark and it fights everything about this system. Do not port it over.

Emphasis in Brand 2 is `--signal` text with a flat 2px underline:

```css
.hl {
  color: var(--signal);
  border-bottom: 2px solid var(--signal-dim);
  padding-bottom: 1px;
}
.slide.signal .hl { color: var(--signal-ink); border-bottom-color: oklch(0.19 0.05 130 / 40%); }
```

Same discipline as before: **one highlight per slide, one or two words.** Since this underline is a border rather than a stretched SVG, it wraps correctly across lines — but a highlight spanning two lines still looks weak, so keep it short.

Bracketed mono is the alternative when you want emphasis without color: `<span class="mono">[ 15 systems ]</span>`.

---

## Structure elements

**Hairlines carry the layout.** Every border in this system is `1px solid var(--hairline)` at 9% white. Cards, dividers, tables, the progress track. Nothing gets a heavy border, nothing gets a shadow.

**Radii:** 10px for cards and blocks, 8px for small nodes, 999px for pills. Never fully square, never more than 10px.

**Stat block** — the highest-value component in this system for carousels:

```html
<div class="stat">
  <div class="val">15 → 1</div>
  <div class="lbl">SYSTEMS CONSOLIDATED</div>
</div>
```

```css
.stat {
  background: var(--surface); border: 1px solid var(--hairline);
  border-radius: 10px; padding: 20px 22px; display: grid; gap: 4px;
}
.stat .val {
  font-family: var(--display); font-weight: 800; font-size: 44px;
  letter-spacing: -0.035em; line-height: 1; color: var(--signal);
  font-variant-numeric: tabular-nums;
}
.stat .lbl {
  font-family: var(--mono); font-size: 10px; font-weight: 500;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
```

**Numbered steps** use mono with leading zeros and dashed dividers:

```css
.step { display: grid; grid-template-columns: 34px 1fr; gap: 14px; padding: 13px 0; border-bottom: 1px dashed var(--hairline); }
.step:last-child { border-bottom: none; }
.step .n { font-family: var(--mono); font-size: 12px; font-weight: 500; color: var(--signal-dim); padding-top: 3px; }
.step b { font-family: var(--sans); font-size: 14px; font-weight: 600; color: var(--fg); }
```

**Arrow lists** use a mono `→` in signal instead of a bullet:

```css
.terms li::before { content: "→"; color: var(--signal); font-family: var(--mono); font-size: 12px; position: absolute; left: 0; }
```

---

## Progress bar and swipe arrow

```css
.progress-track { background: var(--hairline); }
.progress-fill  { background: var(--signal); }
.progress-counter { font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em; color: var(--faint); }
.swipe-arrow { background: linear-gradient(to right, transparent, oklch(1 0 0 / 5%)); }

.slide.signal .progress-track { background: oklch(0.19 0.05 130 / 20%); }
.slide.signal .progress-fill  { background: var(--signal-ink); }
.slide.signal .progress-counter { color: oklch(0.19 0.05 130 / 55%); }
```

The counter goes mono — `1/6` in JetBrains Mono is part of the look.

---

## Logo lockup

[YOUR_NAME]'s profile photo stays — it's a personal brand and a real face still converts. The wordmark changes:

```html
<div class="lockup">
  <img src="profile.png" alt="[BRAND_SLUG]">
  <span class="wordmark">[BRAND] <span>SYSTEMS</span></span>
</div>
```

```css
.lockup { display: flex; align-items: center; gap: 12px; }
.lockup img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; display: block;
              border: 1px solid var(--hairline); }
.wordmark { font-family: var(--display); font-weight: 800; font-size: 14px; letter-spacing: -0.02em; color: var(--fg); }
.wordmark span { color: var(--signal); }
```

`SYSTEMS` is lime, `[BRAND]` is near-white. On a signal slide the whole wordmark goes `--signal-ink` and the avatar border goes to 20% ink.

Note this is now the one deliberate exception to the one-lime-per-slide rule, because the lockup reads as a mark rather than as content.

---

## Handle and caption

`@[IG_HANDLE]` — lowercase, mono, `--faint`, on the CTA slide and nowhere else.

Caption voice is unchanged from Brand 1 — lowercase, direct, no marketing-speak. See `copy-patterns.md`, which stays valid across both brands. **The copy system is brand-independent; only the visual layer swaps.**

---

## Photo slides on Brand 2

The photo style still works, with two changes:

- The scrim goes to the Brand 2 canvas, not the old green-black:
  `linear-gradient(180deg, oklch(0.125 0.006 275 / 0.15) 0%, oklch(0.125 0.006 275 / 0.6) 48%, oklch(0.125 0.006 275 / 0.94) 100%)`
- Highlights on a photo slide use `--signal` with the flat underline, exactly as elsewhere.

Everything else in `photo-style.md` — the library contract, the composition rules, `object-fit: cover`, the scrim-always rule — is brand-independent and still applies.

---

## What changed from Brand 1, at a glance

| | Brand 1 | Brand 2 |
|---|---|---|
| Canvas | warm beige / white | near-black `#060609` |
| Accent | deep green + gold | electric lime `#B1EF4A` |
| Fonts | Poppins only | Bricolage / Instrument Sans / JetBrains Mono |
| Category tags | banned | required (eyebrow) |
| Emphasis | red hand-drawn underline | lime text + flat underline |
| Black | banned | it's the whole canvas |
| Feel | editorial, warm, human | instrument panel, technical, precise |

The two systems share nothing visually. That's the point — this is a rebrand candidate, not a variant.
