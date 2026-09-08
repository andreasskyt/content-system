# [BRAND] Brand — locked

This is the only brand this skill produces. Never ask the user about colors, fonts, or handle — use these exact values.

## Color tokens

Drop these as CSS custom properties at the top of every carousel HTML file:

```css
:root {
  --brand-primary: #303b2f;        /* deep green — MAIN brand accent, progress bar fill on light, emphasis color, logo circle */
  --brand-primary-light: #4C564A;  /* ~20% lighter — gradient highlight */
  --brand-primary-dark: #161B15;   /* ~30% darker — gradient anchor, CTA text on light gradient */
  --brand-accent-gold: #BCAC8B;    /* gold — used ONLY on the brand gradient (highlight words, CTA border). Disappears on light surfaces. */
  --brand-light-bg: #F5F1EA;       /* warm off-white / beige — primary light slide background */
  --brand-light-border: #E8E1D3;   /* 1 shade darker than light-bg — dividers on beige/white slides */
  --brand-text-dark: #1A1918;      /* body text on light surfaces */
  --brand-text-muted: #8A8580;     /* secondary text on light surfaces */
}
```

## Surfaces (three only — no black)

[BRAND] carousels use three backgrounds, alternated for rhythm:

- **Beige** (`.slide.light`, `--brand-light-bg`) — warm off-white, primary light surface
- **White** (`.slide.white`, `#FFFFFF`) — crisp pure white, alternates with beige
- **Brand gradient** (`.slide.gradient`) — deep green fade, used for shift + CTA slides

The previous near-black surface (`--brand-dark-bg`) was removed from the brand — it doesn't fit. Never use black backgrounds or white-on-black text. If you need contrast on a light slide, use the brand gradient for that slide instead.

## Brand gradient (CTA + shift slides)

```css
background: linear-gradient(165deg, #161B15 0%, #303b2f 50%, #4C564A 100%);
```

Text on the gradient: white (`#fff`). Sub-text on the gradient: `rgba(255,255,255,0.75)`. Gold (`#BCAC8B`) can be used for a single highlighted word on the gradient for warm contrast.

## Typography

Single font family: **Poppins** (Google Fonts). Weights used:
- 400 — body
- 600 — emphasis, tags, step titles
- 700 — headlines

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
```

```css
body, .sans { font-family: 'Poppins', system-ui, sans-serif; }
```

### Font size scale (fixed, never change)

| Use | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| Headline | 30px (range 28-34 allowed) | 700 | -0.3px to -0.5px | 1.1-1.15 |
| Body | 14px | 400 | 0 | 1.5-1.55 |
| Tag / label | 10px | 600 | 2px | 1 (UPPERCASE) |
| Step number | 26px | 700 | -0.5px | 1 |
| Small print | 11-12px | 400 | 0 | 1.4 |

Apply via the class `.sans` on every text element (all fonts are Poppins — the class keeps a consistent hook for future font changes).

## Logo lockup

Use [YOUR_NAME]'s Instagram profile picture (the [BRAND] account is personal-brand), not an abstract monogram. The image lives at `assets/profile.png` in this skill and **must be copied into each carousel folder alongside `carousel.html`** so the relative `src="profile.png"` resolves for both the browser preview and the Playwright export (which loads the HTML via `file://`).

- 40px circle, `<img>` with `border-radius:50%` and `object-fit:cover`
- Brand name beside it: `[BRAND]` — Poppins 13px, weight 600, letter-spacing 1px, uppercase
- Color: `--brand-text-dark` on light bg, `#fff` on dark/gradient bg

```html
<div style="display:flex;align-items:center;gap:12px;">
  <img src="profile.png" alt="[BRAND_SLUG]" style="width:40px;height:40px;border-radius:50%;object-fit:cover;display:block;">
  <span style="font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--brand-text-dark);">[BRAND]</span>
</div>
```

On dark or gradient slides, swap the text color to `#fff`. The same profile image is also used in the Instagram preview-frame header (32px).

**Never fall back to the green circle with an "S".** It was replaced because a personal profile picture converts better for a personal brand on IG.

## Instagram handle

`@[IG_HANDLE]` — always lowercase, always prefixed with `@`. Appears:
- In the IG preview frame header
- On the CTA slide (the last slide)
- In the preview caption

## Default post caption (for the IG preview frame)

Use this tone. Short, punchy, lowercase-friendly. Not marketing-speak.

> built this so i could stop doing it by hand. swipe for the system →

## Category tags — DO NOT USE

The small uppercase `THE PROBLEM` / `THE REFRAME` / `BUILD YOURS` labels above headlines are removed from the brand. Every slide goes straight from logo lockup (when present) to headline. Don't add them, don't re-add them, don't rename them. The `.tag` CSS class has been stripped from the template.

## Text colors per surface

- **Beige** (`.slide.light`): main + body text in `var(--brand-text-dark)` (dark charcoal, reads as dark grey). Emphasize with **green** (`var(--brand-primary)`). Sub-text in `var(--brand-text-muted)`.
- **White** (`.slide.white`): main text in `var(--brand-primary)` (dark green). Sub-text in `var(--brand-text-muted)` (warm muted beige-tone). Emphasize with **bold weight** (text is already green). **Never** use `var(--brand-text-dark)` / near-black on white — the `.slide.white h1,.feature-title,.step-title` selectors in the template enforce this automatically.
- **Gradient** (`.slide.gradient`): main text in `#fff`. Emphasize with **gold** (`var(--brand-accent-gold)`).

Gold disappears on beige/white — never use it there. Pure black (`#000000`) is banned everywhere.

## Hand-drawn underline (highlighted words)

Highlighted words get a single-bow red pen stroke underline — always red (`#C8102E`), grainy edges (SVG turbulence filter), one arc. It's meant to read like someone quickly dragged a red pen under the word while talking.

One helper class in the template: `.hl`. Drop it in as a span. The TEXT color of the highlighted word inherits from the surface's emphasis color (green on beige/white, gold on gradient); the underline stays red regardless.

```html
<span class="hl">retention rates</span>
<span class="hl">system</span>
```

The underline is an SVG path rendered via `::after`. Rules:

- **One highlight per slide** — it's the payoff. Every slide having a red line under a word kills the emphasis.
- **One or two words only** — the underline stretches across the span's bounding box; a multi-word highlight that wraps renders a stretched underline across both lines (see copy-patterns.md).
- **Don't change the color.** If you find yourself wanting to drop the red because it clashes with a slide, the slide probably doesn't need a highlight at all.

## Visual rhythm rule

**Surface arc (fixed):** slide 1 is always `.slide.gradient`. After slide 1, cycle through beige → gradient → white → beige → gradient → white → … as needed.

For a 6-slide carousel: gradient → beige → gradient → white → beige → gradient.

This puts gradient on the hero (pattern-interrupt scroll-stop) and anchors gradient on the CTA. Two gradients within the body (shift + CTA) stay the brand's "anchor" beats.

Never two adjacent beige or two adjacent white slides.
