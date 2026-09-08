# [BRAND] Website Brand — "Signal / Sand"

Brand 2's dark technical system with the electric lime replaced by the beige and sand already running on [WEBSITE_DOMAIN]. Same canvas, same fonts, same structure — one variable changed, so a side-by-side against Brand 2 tells you exactly what the accent is worth.

Swap-in replacement for `brand.md`. Everything in `brand2.md` applies unless contradicted here.

> Status: rebrand candidate. This is the variant that requires the least change to the existing website — the accent is already live there.

---

## Color tokens

The canvas, text and structure tokens are **identical to Brand 2**. Only the accent family moves.

```css
:root {
  /* unchanged from Brand 2 */
  --bg:          oklch(0.125 0.006 275);   /* #060609 */
  --surface:     oklch(0.185 0.008 275);   /* #121216 */
  --surface-2:   oklch(0.222 0.009 275);   /* #1A1B1F */
  --fg:          oklch(0.968 0.004 270);   /* #F3F4F7 */
  --muted:       oklch(0.68 0.011 275);    /* #96989F */
  --faint:       oklch(0.5 0.01 275);      /* #616369 */
  --hairline:    oklch(1 0 0 / 9%);

  /* THE SWAP — lime out, website beige in */
  --signal:      oklch(0.749 0.048 86.4);  /* #BBAC8B — website --accent-beige */
  --signal-dim:  oklch(0.589 0.048 86.4);  /* #8A7B5C — eyebrows, markers, quiet accent */
  --signal-ink:  oklch(0.232 0.015 136.7); /* #1A1F18 — text ON a beige fill (website's darkest green) */
  --sand:        oklch(0.823 0.018 81.3);  /* #CBC4B8 — website --neutral-sand, glow + soft accents */
  --glow:        oklch(0.338 0.06 143);    /* #243F22 — green bloom, unchanged */
}
```

`--sand` is new and has one job: soft glows and low-opacity fills (`--sand` at 10-20%) where beige would be too assertive. It's a background color, never text.

### What the accent change costs you

Lime is `oklch(0.88 0.2 128)` — chroma 0.2. Beige is chroma 0.048, roughly **a quarter as saturated**. It reads as expensive rather than electric, but it does less work at small sizes. Consequences:

- A 10px beige eyebrow is quieter than a lime one. Acceptable — eyebrows are meant to be quiet.
- Beige needs **more size or weight** to register as emphasis. Stat values and highlights are where you'll notice the drop.
- Beige and `--muted` (`#96989F`) are close in lightness. **Never put beige text directly next to muted body copy** and expect a hierarchy — separate them with space, weight, or size.

### Where beige goes

Same one-rule discipline as Brand 2: one accent element per slide, plus the lockup. Beige marks the single most important thing — one number, one word, one CTA.

Because beige is calmer, you can afford it slightly more often than lime without the slide falling apart. You still shouldn't.

---

## Surfaces

Void and surface are unchanged. The signal slide becomes a beige fill:

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

The beige slide is a **much softer interrupt** than the lime one. That cuts both ways: it's less likely to feel like a mistake in a feed, and it's less likely to stop a scroll. Where Brand 2 caps you at one lime slide per carousel, Brand 3 tolerates two beige ones — but the arc rule holds, and slide 1 is still never a signal slide.

`--signal-ink` is `#1A1F18`, the darkest green from the website — not a neutral black. That warm-dark on beige is the exact pairing the site's primary button already uses, so a beige slide reads as a giant [BRAND] CTA. Use it on the CTA slide when the carousel has no other payoff beat.

### Sand glow variant

For a softer void slide — useful when several dark slides run together — swap the green bloom for a sand one:

```css
.slide.void.warm {
  background:
    radial-gradient(620px 300px at 50% -90px, oklch(0.823 0.018 81.3 / 14%), transparent 70%),
    var(--bg);
}
```

This is the website's own card-glow move (`shadow-[#cbc4b8]/20`) applied to a slide. Max one per carousel.

---

## Typography, eyebrow, structure

Unchanged from Brand 2 — Bricolage Grotesque 800 / Instrument Sans / JetBrains Mono, same scale, same mono eyebrow requirement, same hairlines and 10px radii. Do not re-tune the type for this accent.

## Emphasis

```css
.hl {
  color: var(--signal);
  border-bottom: 2px solid var(--signal-dim);
  padding-bottom: 1px;
}
.slide.signal .hl { color: var(--signal-ink); border-bottom-color: oklch(0.232 0.015 136.7 / 40%); }
```

One highlight per slide, one or two words. The red pen underline stays dead.

Because beige carries less punch than lime, a highlight buried mid-sentence tends to disappear. Put highlighted words at the **start or end of a line** where the eye already lands.

## Progress, lockup, CTA

Structurally identical to Brand 2 — every `var(--signal)` reference resolves to beige automatically. The lockup keeps `[BRAND]` near-white and `SYSTEMS` in the accent, which now matches the website's wordmark exactly.

The CTA pill is a beige fill with `--signal-ink` mono text: a 1:1 match for the site's primary button.

---

## Brand 2 vs Brand 3

| | Brand 2 "Signal" | Brand 3 "Signal / Sand" |
|---|---|---|
| Accent | `#B1EF4A` electric lime | `#BBAC8B` website beige |
| Chroma | 0.20 | 0.048 |
| Feel | instrument panel, aggressive, tech-forward | premium, calm, expensive |
| Scroll-stop | high | moderate |
| Website change needed | full accent migration | none — already live |
| Signal slides per carousel | max 1 | max 2 |

Everything else — canvas, fonts, structure, spacing, eyebrows, copy system — is identical. Choosing between them is choosing one thing: whether [BRAND] is loud or expensive.

---

## The open question

The canvas is `oklch(0.125 0.006 275)` — a near-black with a faint **blue** cast, inherited from the artifact. The website's canvas is deep **forest green**. Beige sits naturally on green; on blue-cast black it's very slightly cooler than it is on the site.

It's a small difference and nothing here depends on it, but if Brand 3 wins, resolve it before the website rebuild — either warm the carousel canvas toward the site's green, or move the site's canvas to this near-black. Don't ship both.
