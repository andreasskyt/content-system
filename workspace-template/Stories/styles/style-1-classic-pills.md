# Style 1 — Classic Pills

The workhorse. Hooks, belief-shifts, lists, CTAs, blur-reveal sequences. Mimics IG's **Classic** font with the background-pill ("A" button) style.

## Font
- Family: `'Helvetica Neue', -apple-system, sans-serif` (closest match to IG Classic / Proxima Nova)
- Weight: 700 · letter-spacing: -0.1px · line-height: 1.5-1.6
- Sizes (540×960 design frame): headline pills 21-24px · body/list pills 19-20px · never above 26px

## Text style
- Every line sits in a per-line background pill: `padding: 5px 9px; border-radius: 6px; box-decoration-break: clone`
- Sentence case. Punchy short lines. Numbered lists allowed ("1. …")
- Emphasis: key word in red `#ED2121` (inside the pill) OR white hand-drawn scribble underline (SVG, 4px stroke, wavy). One emphasis per frame max, never both on the same word.
- NEVER: emojis · tilted/rotated text · standalone styled display text outside pills · brand display fonts (no Poppins)

## Colours (pill background / text) — the only combos allowed
| Combo | Background | Text | Use |
|---|---|---|---|
| White | `#fff` | `#111` | hooks, headers, CTA |
| Black | `rgba(10,10,10,0.96)` | `#fff` | body stacks, lists |
| Beige | `#BCAC8B` | `#161B15` | ONE accent line per frame max |
- Red `#ED2121` for accent words inside white or black pills.

## Placement
- All blocks horizontal, left-aligned or centered. Margins: 40px from frame edges (design px).
- Hook/header: top area, y 84-130.
- Body stacks/lists: upper half, over sky or negative space. NEVER over [YOUR_NAME]'s face or the photo subject.
- CTA block: bottom area, y 740-800, above the reply-bar zone (keep bottom 120px clear).
- Photo: real photo from `Marketing/_photo-library/` or camera roll, `object-fit: cover`, darken with `brightness(0.75-0.9)` only when text needs contrast.
