# YouTube

Inherits `Marketing/CLAUDE.md`. This file adds YouTube-specific rules.

---

## Goal & direction

YouTube is the trust engine: long-form authority that drives inbound and warms sales calls. Target: **4–8 videos/mo, 5–15 min.** Long-horizon play — judge videos on iteration and retention data, not early view counts.

**Content mix (20-70-10):** ~20% growth videos modeled on competitor outliers · ~70% authority videos on the [YOUR_OFFER] method solving ICP pain points · ~10% conversion (VSL, case-study breakdowns).

**Evergreen assets to build and keep current (Foundational Trio):** a Case Study video, a Unique Model/VSL video (the [YOUR_OFFER] method), and an Industry Mistakes video. When scripting, check whether one of these is missing before pitching new ideas.

---

## Video structure & scripting

Default structure for every script: packaging first → curiosity-loop intro → credibility → context → core framework → **3 CTAs** (early: lead magnet · middle: next step · end: next video). Scripts follow the 3-stories / 3-frustrations / 3-golden-nuggets formula, written in [YOUR_NAME]'s natural speaking voice (~1,500–2,000 words ≈ 12 min).

Full frameworks, title formulas, and the trio templates: `_reference-youtube-formula.md` (this folder).

**Waterfall:** every video ends with a list of derivative assets — reels per golden nugget, one carousel angle, DM/email material. Hand these to the shortform pipeline.

---

## Workflow & technicals

- **One folder per video** in this directory, named after the video. Everything for that video (source, edited output, thumbnails, packaging) lives inside it.
- **Edit via /editing** — output exactly one `edited_<basename>.mp4`, original untouched, no stage files (see Marketing/CLAUDE.md).
- **Packaging via /youtube-packaging** — 5 titles + description with chapters + tags + thumbnail critique. Also the mandatory **publish gate**: run it before ANY upload.
- **Thumbnails:** /thumbnail-prompter writes the image-gen prompts (Pikzels/Nano Banana etc.); /youtube-packaging can also render coded HTML thumbnails using the cutout library at `Thumbnails/_cutouts/` (110 background-removed PNGs, indexed by emotional beat).
- **Monthly batch:** titles + thumbnails for the month created up front; record 2 videos per session.
- **Posting:** schedule in the Notion CPP like everything else (Type=`Long Form`) — see Marketing/CLAUDE.md for the contract.
- After 2–4 weeks per video: read comments for follow-up ideas, make follow-ups to high performers.
