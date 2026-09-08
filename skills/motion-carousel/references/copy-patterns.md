# Copy patterns — Hormozi-inspired

[BRAND]'s voice on Instagram: direct, specific, punchy, **first-person singular**. It's a personal brand — written by one operator, [YOUR_NAME]. No guru fluff, no "unlock your potential" abstractions. Short sentences. Fragments are fine. Numbers and specifics beat adjectives.

## Core principles

1. **Always write as "I", never "we".** Rewrite any drafted line that uses "we / us / our / we've" → "I / me / my / I've". This applies to headlines, proof slides, CTAs, and captions. Even "we build systems for agencies" becomes "I build systems for agencies." Before shipping any carousel, grep the copy for we/us/our/our's — if you find one, rewrite it.
2. **Every slide earns its place.** If a slide doesn't land a punch, cut it or merge it. Five great slides beat seven mediocre ones.
3. **Specifics over abstractions.** "Saved 11 hours/week" > "Saved time". "£3k/month" > "significant revenue". "n8n workflow" > "automation".
4. **Short sentences.** If it's longer than 10 words, split it.
5. **Fragment sentences are fine.** "No hire. No headache. No monthly fee." Three fragments, one idea, one slide.
6. **Contrast creates attention.** Put what most people do next to what actually works. "They hire editors. I run a pipeline."
7. **Stop teaching. Start proving.** Show the result, then the mechanism. Never the other way around.

## Hook formulas (slide 1)

The hook has ONE job: stop the scroll. Descriptive hooks fail. Use one of these patterns:

### 1. Bold claim
> "Most agencies don't need more clients. They need fewer shitty systems."
> "Human editors are obsolete for 80% of my videos."

### 2. Contrarian take
> "Stop hiring. Start automating."
> "AI won't replace your agency. Your agency will replace itself."

### 3. Pattern interrupt (unexpected number / image / contrast)
> "I replaced my editor with 400 lines of code."
> "1 video. 6 platforms. 0 editors."

### 4. Direct call-out
> "Read this if you still edit your own videos."
> "For agency owners who can't stop 'just checking Slack'."

### 5. Stat that sounds wrong
> "I edit 200 videos a month with 0 editors."

### Banned hook patterns
- "Here's how to..." (descriptive, boring)
- "In this post I'll..." (meta, not about the reader)
- Questions that have obvious yes/no answers ("Want to save time?")
- Anything with "unlock", "transform your", "level up"

## Middle slides (problem, shift, proof, how)

### Problem slide (dark)
Name a specific pain. Short. The more niche, the better — niche pain generates stronger nods.

Template: **[Specific bad state] + [why it persists] + [what it costs]**

> "Hiring another editor.
> Paying £1,500/month.
> Watching them ghost by month 3."

### Shift / solution slide (gradient)
Name the reframe. One sentence. Maximum two.

> "Replace the role, not the person."
> "The work didn't need a human. It needed a system."

### Proof / features slide (light)
List 3-4 concrete things your system does. Use the feature-list component. Each item: **label** + **specific detail**.

> Extract clips → Cuts 47% of the filler automatically
> Pick segments → Claude picks the best takes
> Generate b-roll → 40% coverage without a designer

### How / details slide (dark)
Show the mechanism briefly. Not a tutorial — an architecture sketch.

> "1. Upload raw video
>  2. AI selects best clips
>  3. Remotion renders b-roll
>  4. FFmpeg composites
>  5. You review the preview"

## CTA slide (last)

One clear action. One. Never two.

### Good CTAs
- "Comment \"COMMAND\" and I'll DM you inside one." — the default lead-magnet CTA
- "Comment \"AUTO\" and I'll DM you the blueprint."
- "Follow @[IG_HANDLE] for more systems like this."
- "Book a call at [WEBSITE_DOMAIN]."

**Keyword CTAs are ALWAYS comment-based, never "DM me".** The comment-to-DM system (GHL workflow
+ n8n + Notion "Comments to DM Config" DB) triggers on COMMENTS containing a keyword and sends the
DM automatically. "DM me X" points people at a door with no automation behind it — [YOUR_NAME] would
have to answer manually. Before using a keyword in a CTA, confirm it exists as an active row in the
Comments to DM Config database (Notion, under MARKETING) with a live landing page.

### Banned CTA patterns
- "Link in bio for more" — lazy, vague
- "Like and share" — no one does this
- "What do you think?" — isn't a CTA

The CTA slide ALWAYS includes `@[IG_HANDLE]` visibly (plain text, no lockup).

### YouTube variant (ManyChat-driven DM flow)

When the carousel is about a specific YouTube video, the CTA slide shows the video's thumbnail + a comment-keyword trigger. The keyword fires a ManyChat automation that DMs the viewer the YouTube link.

Examples:
- "Comment **WATCH** and I'll DM you the link."
- "Comment **VIDEO** for the full breakdown."
- "Comment **LINK** — I'll send it over."

Rules:
- Keyword is ONE uppercase word, ≤7 chars, easy to spell (WATCH, VIDEO, LINK, BLUEPRINT, SYSTEM).
- Never ask for multiple actions ("comment AND follow") — ManyChat triggers on a single exact-match keyword.
- The thumbnail is rendered on-slide via `scripts/fetch_youtube_thumbnail.py` — see `references/components.md` § YouTube thumbnail CTA slide.

## Line-break rules (visual copywriting)

These are NOT optional — they're what makes the slides feel crafted vs. auto-wrapped.

1. **Never orphan the last word of a sentence on its own line.** If the last word wraps alone, the slide reads broken. Fix by: shortening the sentence, rewriting it to balance line lengths, or inserting a deliberate `<br>` to split the sentence cleanly.
2. **Never let a period (or any trailing punctuation) fall onto its own line.** Same fix.
3. **Check every headline in the exported PNG**, not just the HTML. 420px canvas + 30px Poppins = unpredictable wraps. What looks fine in HTML can orphan a word in the render.
4. **Use explicit `<br>` to control breaks on headlines.** Don't trust the browser's auto-wrap on any line you care about. Place the `<br>` where you'd pause speaking the sentence.

### Highlights must fit on one line

The hand-drawn underline (`.hl` — always red, grainy single-bow pen stroke) uses an `::after` pseudo-element on an `inline-block` span. If the highlighted phrase wraps to a second line, the underline stretches across the whole bounding box instead of following each line's text. So:

- Highlight ONE or TWO words max — never a multi-word phrase that might wrap.
- If you want to emphasize a longer phrase, use `font-weight:700` or color-only emphasis (no `.hl` class).

## Copy length guidelines per slide

| Slide type | Word count target |
|---|---|
| Hero / hook | 6-12 words in the headline |
| Problem | 10-20 words total |
| Shift | 5-15 words — make it quotable |
| Proof (with list) | 3-4 items × 8-15 words each |
| How (numbered) | 3-6 steps × 5-10 words each |
| CTA | 8-15 words |

If you blow past these, cut. Every Instagram carousel is constrained by a 420×525px canvas — text that doesn't fit the canvas doesn't belong on the slide.

## Tone tests before writing HTML

Before generating slides, ask yourself about the draft copy:
1. Would Alex Hormozi nod at this, or roll his eyes?
2. Could a reader screenshot one slide and it works on its own?
3. Is there a single specific noun/number in this slide, or is it all adjectives?
4. Does the hook make me want to swipe, or does it tell me what I'm about to read?

If any answer is "no" → rewrite before moving on.
