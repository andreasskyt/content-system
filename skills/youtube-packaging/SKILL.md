---
name: youtube-packaging
description: Turn a YouTube video transcript into a publish-ready package for [YOUR_NAME]'s channel — 5 title options, a description with chapters, tags, and a thumbnail check ([YOUR_NAME] supplies his own thumbnails; the skill critiques them, it does not create them). Use this skill whenever [YOUR_NAME] pastes or points to a video transcript and wants packaging, or says "/youtube-packaging", "package this video", "thumbnail and title for my video", "I recorded a video, here's the transcript", "what should I call this video", or asks for a YouTube title, description or chapters. Also use for repackaging an existing video that underperformed. ALSO use as the publish gate whenever [YOUR_NAME] says he is about to upload — "I'll upload a YouTube video now", "uploading this to YouTube", "about to publish the video", "ready to upload" — in that case run the Publish gate section instead of the full packaging pipeline.
---

# YouTube packaging

One invocation turns a transcript into everything needed to publish: 5 titles,
a description with chapters, tags, the upload checklist — and a check that
[YOUR_NAME] has good thumbnails. **This skill does NOT create thumbnails.** [YOUR_NAME]
makes his own; the skill asks for them and critiques what he provides.

> **Thumbnail prompts are now handled by the `thumbnail-prompter` skill**
> (AI-generation prompts for Pikzels/GPT-Image/Nano Banana with [YOUR_NAME]'s face
> reference library). Route there per §2. The old code-rendered pipeline
> (spec.json → `scripts/render.py` → PNGs, photo library in
> `assets/cutouts-index.json`) is dormant; only reactivate it if [YOUR_NAME]
> explicitly asks for code-rendered thumbnails.

## Read first, every run

1. `references/performance.md` — what has actually worked on this channel
2. `references/strategy.md` — the packaging framework
3. `references/thumbnail-craft.md` — design rules, used to CRITIQUE [YOUR_NAME]'s thumbnails
4. `references/titles.md` — title formulas and the locked description format
5. `references/publish.md` — tags and the YouTube Studio upload checklist

## Pipeline

### 1. Strip the transcript

Extract: one idea · promise · who it's for · proof · the gap · emotional beat.
See `references/strategy.md`. If the video has no curiosity gap, say so plainly
— that is a content problem and no packaging fixes it.

### 1b. Intro check (first 60 seconds)

Packaging priority is thumbnail → title → intro → description. The intro is the
only one of those that can't be fixed after upload, so check it while the video
can still be re-cut.

Read the first ~60 seconds of the transcript and answer three questions:

1. **Does the open pay off the packaging promise?** The first sentences must
   engage the same gap the thumbnail + title sell. Channel intro, "welcome
   back", or context-setting before the promise = flag it.
2. **Is the payoff teased but not resolved?** The intro should prove the video
   will deliver (show the result, name the stakes) without closing the gap.
3. **Dead weight?** Anything in the first minute a cold viewer would skip.

Report a verdict in one short block: pass, or the specific mismatch and which
sentence to cut/move.

### 2. Thumbnails — ask first, always

**Always ask [YOUR_NAME]: "Do you already have a thumbnail for this one? Drop 1–3
here."** Never skip this question, even when the thumbnail seems implied.

- **He has thumbnails:** critique each against `references/thumbnail-craft.md`
  (instant read at 320px, ≤3 words, one focal point, emotion matches the beat,
  honest promise) and against the chosen title — thumbnail and title must be
  two angles on one promise, never the same sentence twice. Give a verdict per
  thumbnail and name the single biggest fix.
- **He doesn't:** invoke the `thumbnail-prompter` skill with the video's
  transcript/topic and the emotional beat extracted in §1. It delivers 2–3
  concepts with copy-paste generation prompts built on his face-reference
  library. Pair each concept with a title from §3 so thumbnail and title are
  never separated.

Note: `thumbnail-craft.md`'s anti-AI rules (no generated faces/hands) predate
the AI-generation pipeline — when critiquing an AI-generated thumbnail, apply
the thumbnail-prompter skill's anatomy verification (count fingers, check ears,
neck, teeth) instead of rejecting it for being generated.

### 3. Titles

5 title options ranked, built from the formulas in `references/titles.md`,
each tied to a thumbnail angle so the pair argues one promise from two sides.

### 4. Description, tags

`description.md` in the locked format (links → chapters → the point — see
`references/titles.md`, never improvise it). Chapters from the transcript's
natural breaks, adjusted for any trim. `tags.md` per `references/publish.md`.

### 5. Deliver — in chat, never as files

Everything goes directly in the chat reply ([YOUR_NAME]'s explicit preference,
2026-08-29 — do NOT write titles.md/description.md/tags.md):

1. Ranked titles table (5, with chars + thumbnail pairing)
2. Intro verdict
3. Thumbnail ask or critique
4. Description in a single copy-paste fenced block (locked format)
5. Tags in a single copy-paste fenced block (one line)
6. Upload checklist, compact

Fence the description and tags so he can copy them straight into Studio.

## Rules

- Titles 40–60 chars, no emoji, no caps, must not repeat the thumbnail text.
- Never invent client names or numbers that imply real results.
- The video must actually deliver what the package promises. If a title
  overclaims, cut it.

## Publish gate

Runs when [YOUR_NAME] says he's about to upload. Do NOT re-run the packaging
pipeline — verify what exists and block on what's missing. Check in packaging
priority order (thumbnail → title → intro → description → the rest) and reply
with a single checklist: ✅ verified, ❌ missing/broken, each ❌ with the one
action that fixes it.

Verify with tools where possible, ask only for what can't be checked:

1. **Final video** — `final_<name>.mp4` exists in the content folder, subs
   burned in (`/editing` output). Ask which video if ambiguous.
2. **Thumbnails** — ask [YOUR_NAME]: does he have 1–3 ready? (This skill does not
   make them.) If he shares them, critique per `references/thumbnail-craft.md`.
3. **Title** — one of the ranked options chosen, proofread out loud.
4. **Intro** — the intro check (§1b) ran and passed against the chosen
   thumbnail+title. If packaging changed since, re-check.
5. **Description** — `description.md` in the locked format, chapters with real
   timestamps, `/yt/{publish-date}` link with the confirmed date.
6. **Redirect live** — `curl -sI https://[WEBSITE_DOMAIN]/yt/{date}` returns
   307/308, not 404. If it 404s, the redirect is missing from the website
   repo's `next.config.js` — that's a deploy, so ask before shipping it.
7. **Tags** — `tags.md` exists, ≤12 tags, 3 branded ones present.
8. **Studio settings** — walk the upload checklist from
   `references/publish.md` (language, playlist, subtitle file, end screen,
   pinned comment with `utm_medium=pinned_comment`, category, made-for-kids No).

Only say "clear to upload" when every line is ✅.

## Maintenance

Feed the loop: after a video has been live 7+ days, append its result to
`references/performance.md` — what worked on this channel outranks every rule
in this skill.

The dormant thumbnail-render machinery (scripts/, templates/, assets/ and the
photo-library workflow) is documented in git history and the files themselves;
leave it in place for the "later idea" above.
