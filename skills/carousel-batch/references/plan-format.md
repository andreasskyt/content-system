# plan.md format

`plan.md` lives at the root of a batch folder and is the single source of truth for the whole batch. [YOUR_NAME] edits it by hand between phases — keep it readable, never machine-mangled.

## Header

```markdown
# Aug Batch
start: 2026-08-10
count: 30
brand: brand.md
```

`brand` selects the visual system for the whole batch — `brand.md` (Brand 1, warm editorial, lives in `/carousel-generator/references/`) or `brand2.md` (Brand 2 "Signal", dark technical, lives in this skill's `references/`). Defaults to `brand.md` if omitted. A single entry can override it with its own `brand:` line, which is how you A/B two looks on the same copy. Never mix two brands inside one carousel.

`start` is the first post date. Dates are assigned sequentially from here at generate time — one carousel per day, in the order entries appear in the file. Reorder entries to reorder the calendar.

## Entry

Entries are separated by `---`. An entry grows as it moves through the phases; earlier fields never get rewritten by a later phase.

**After phase 1 (ideas):**

```markdown
---
## 7. Your business isn't slow. Your data is.
status: idea
```

**After phase 2 (script):**

```markdown
---
## 7. Your business isn't slow. Your data is.
status: scripted

S1
headline: Your business isn't slow. Your data is.
sub: 15 tools. Zero source of truth.

S2
headline: You added AI to a mess.
sub: Now it guesses faster.

S3
headline: Structure the data first.
body: Every system that works starts with one place the numbers live. Everything else is decoration.

S4
headline: Then automate. Then AI.
steps:
  1. One source of truth
  2. Visibility on top
  3. Automate the repeat work
  4. AI on clean inputs

S5
headline: This is the whole trick.
sub: There isn't a shortcut. There's an order.

S6
headline: Want the order for your business?
cta: DM "SYSTEM" — @[IG_HANDLE]

caption:
your AI isn't the problem. your data is.

most businesses bolt AI onto 15 disconnected tools and wonder why it hallucinates. it's not hallucinating — it's guessing, because you never gave it anything true to read.

structure first. then visibility. then automation. then AI.

DM "SYSTEM" if you want the order mapped for your business →
```

**After phase 3 (style):**

```markdown
status: styled
style: photo
photos: 12-desk-night.jpg, 03-whiteboard.jpg, 27-laptop-cafe.jpg
```

**After phase 4 (generate):**

```markdown
status: built
date: Aug 16
```

## Slide block grammar

Each slide starts with `S<n>` on its own line, followed by indent-free `key: value` lines. Keys:

| Key | Meaning |
|---|---|
| `headline` | The main line. Required on every slide. Max ~9 words. |
| `sub` | One supporting line under the headline. Optional. |
| `body` | A short paragraph, 1-3 sentences. Use instead of `sub` when the slide carries an argument. |
| `steps` | Numbered list, one per line, indented two spaces. |
| `cta` | Last slide only. The action + `@[IG_HANDLE]`. |
| `highlight` | One or two words from the headline to get the red pen underline. Optional, max one per slide. |

A slide uses `sub` **or** `body` **or** `steps` — never two of them. If a slide needs more than one, it's two slides.

`caption:` is not a slide. It sits at the end of the entry and everything after it, to the next `---`, is caption text.

## Status lifecycle

```
idea → scripted → styled → built
```

A phase reads only its input status and writes only its output status. Entries at the wrong status are left untouched and reported, never silently skipped.

[YOUR_NAME] can hand-set any status to force a rerun — setting an entry back to `scripted` and running `/carousel-batch style` re-styles just that one.

## plan.json

Written at generate time by parsing `plan.md`. It's a build artifact — never hand-edited, always safe to delete and regenerate.

```json
{
  "batch": "Aug Batch",
  "days": [
    {
      "date": "Aug 16",
      "title": "Your business isn't slow. Your data is.",
      "brand": "brand2.md",
      "style": "photo",
      "photos": ["12-desk-night.jpg", "03-whiteboard.jpg"],
      "slides": 6,
      "caption": "your AI isn't the problem. your data is.\n\n..."
    }
  ]
}
```

`slides` is the count, not the content — the slide text goes straight into the HTML you write, not through the script. `photos` is `[]` for coded carousels.
