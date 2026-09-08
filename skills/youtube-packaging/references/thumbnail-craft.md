# Thumbnail craft

Design rules, in priority order. Earlier rules beat later ones.

---

## The hard limits

| Rule | Number | Why |
|---|---|---|
| Words of on-image text | **≤ 3** | <4 words correlates with ~30% higher click rate; 3 or fewer is the 2026 norm |
| Distinct visual elements | **≤ 3** | more than three drops CTR ~23% — one subject, one artifact, one text block |
| Annotations (arrow/circle) | **≤ 1** | arrows/circles lift clicks up to ~25%, but only when there is exactly one thing to look at |
| Focal points | **1** | if the eye has a choice, the thumbnail failed |
| Export | 1280×720, <2MB | YouTube's spec; the 2560×1440 master is for reuse, not upload |

Every thumbnail is validated at **320px wide**, because that is roughly what a
phone shows. If it fails there, it fails — the desktop version is irrelevant.

## [YOUR_NAME] is in the thumbnail

Default: **a real photo of [YOUR_NAME] appears in every thumbnail.** Faces lift CTR
20–30%, and on a personal brand the face *is* the channel's recognition asset.
His library is `assets/cutouts/`, tagged in `assets/cutouts-index.json`.

- Pick by **emotional beat first** — the expression must match the video's beat.
  A smiling photo on a "you're losing money" video kills the premise.
- Half-body reads better than a headshot at feed size, unless the face IS the story.
- Never generate, redraw, or AI-alter his face. Ever. The photo is the photo.
- The one exception is the **object-only pattern break** — no face at all, one
  arresting object. Use it deliberately, roughly one video in six, never by default.

Composition: subject on one side, artifact on the other, text in the remaining
corner. Him on the left reads naturally for Latin-script viewers, but alternate
so the channel page doesn't look like one repeated image.

If his photo is cropped mid-shoulder by the frame edge, **layer the artifact over
the cut** rather than leaving a hard vertical line — set `over_subject: true`.

## The artifact

The second element is the thing being discussed, rendered for real: a UI, code,
a node graph, an invoice, a chart, a phone. Build it from `templates/partials.md`.

Real beats representative. A dashboard with plausible numbers and a real error
state beats a generic "tech" visual, because the viewer recognises their own
screen in it.

## Anti-AI-look rules

The thumbnail must not read as machine-made. This is a hard requirement — the
audience is technical and discounts anything that smells generated.

**Banned outright:**
- Generated or altered faces, generated hands, generated text inside images
- Purple/blue gradient on white; neon glow on everything
- Inter, Roboto, Arial, Helvetica as the headline face
- Floating glossy 3D icons, "AI brain" imagery, circuit-board motifs
- Perfectly symmetrical, perfectly centred, perfectly clean compositions
- Stock-photo people who are not [YOUR_NAME]

**Required imperfection layer** (already in the template, do not remove):
- `.grain` — fine noise over everything, ~5% opacity
- `.vig` — inner shadow so edges settle
- Slight rotation on artifacts (−2° to +2°) and on stamps (−12° to +8°)
- Real shadows: `drop-shadow` on the subject, layered `box-shadow` on windows

**Physical props** beat digital effects for authenticity: pressure stamps, tape
strips, marker circles, torn paper, sticky notes, coffee rings. One per
thumbnail, maximum.

## Colour

- Start from the [BRAND] palette — deep green `#303b2f`, gold `#BCAC8B`, warm
  off-white `#F5F1EA` — then pick **one** accent that carries the emotion:
  red `#e5484d` (wrong/danger), amber `#f5a524` (warning), green `#1f9d63`
  (result/win), blue `#3b82f6` (system/neutral).
- The accent appears at most twice: on the text and on one annotation.
- Light backgrounds (`bg-dots`, `bg-grid`, `bg-paper`) stand out in a feed that
  is mostly dark thumbnails. Use dark backgrounds only when the artifact is a
  dark UI, so it doesn't float on white.

## Typography

- Headline: **Montserrat Black** (heavy, tall, survives shrinking) or
  **Poppins Bold** for the stamp treatment. Never a system font.
- Uppercase, tight tracking, ≥80px in the 1280×720 design space.
- Never place text over the face, and never over a busy part of the artifact.
- Contrast check: if the text sits on anything other than flat background,
  either move it or put it on a slab (`h-slab`).

## Consistency vs. novelty

The channel needs a recognisable look — same face, same type, same imperfection
layer — with the *idea* changing every time. Do not reinvent the visual system
per video; reinvent the argument.
