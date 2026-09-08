# B-Roll Prompt Review — All Generated Cues

Review document for manually auditing b-roll cue quality across all videos processed.

---

## Current System Prompt (summary)

- **Identity**: Motion graphics b-roll editor, output only JSON
- **Decision cascade**: counter (numbers) > scene3d (3+ items) > staggered (dynamic entrance) > particles (emotional) > comparison > statement > list > typewriter > code
- **Templates available**: counter, statement, typewriter, comparison, list, code, scene3d, particles, staggered
- **scene3d styles**: carousel, cube, flyover, terminal, card-stack
- **staggered styles**: fracture, grid-stagger, mosaic, list-reveal, card-stack-3d
- **particle styles**: fireflies, rising, confetti, snow, grid, flying-words
- **Constraints**: no same template twice in a row, alternate bgColor, 3-5s per cue, 50-70% coverage target, 1 cue per 4s minimum

---

## Video 1: "I just hired 5 new team members" (141s, 6 cues)

> NOTE: This was from an OLDER prompt version that used free-form `remotionInstructions` instead of templates. Very long, unstructured instructions.

| # | Time | Template | Headline | Items/Content | Transcript Context |
|---|------|----------|----------|---------------|-------------------|
| 0 | 3.9-10.7s (6.8s) | *custom* | YouTube Control Center | Play button + magnifying glass icons | "Lars has access to my YouTube control center" |
| 1 | 14.7-21.9s (7.2s) | *custom* | Outlier Video Analysis | Bar chart + eye icons | "gets the outlier videos that gets most engagement" |
| 2 | 34.6-40.6s (6s) | *custom* | Content Analytics | Table/spreadsheet icon | "the views, the likes, the keywords" |
| 3 | 53.7-60.4s (6.7s) | *custom* | Top Performing Videos | Calendar + trophy icons | "top performing videos in my niche" |
| 4 | 64.9-72.6s (7.7s) | *custom* | Searching Your Niche | Clock + search bar | "searches on YouTube for NADIN" |
| 5 | 91.8-99.7s (7.9s) | *custom* | Scraping Competitor Content | Funnel + video cards + speech bubbles | "scrape all the videos, get their comments" |

**Issues**:
- All cues are 6-8s (too long — should be 3-5s)
- Old prompt format — free-form remotionInstructions, not templates
- Only 6 cues for 141s video (1 per 23.5s — should be ~35 cues at 1 per 4s)
- Coverage very low
- All white backgrounds — no alternation

---

## Video 2: "you got superpowers test reel" (40s, 3 cues)

> NOTE: Also older prompt format with `animationSpec.style: "draw-on"` — not matching current template system.

| # | Time | Template | Headline | Items/Content | Transcript Context |
|---|------|----------|----------|---------------|-------------------|
| 0 | 3.8-8.0s (4.2s) | *custom draw-on* | SUPERPOWERS | Lightning icon | "you've got fucking superpowers in your back pocket" |
| 1 | 13.5-17.8s (4.3s) | *custom draw-on* | SOLVE EVERYTHING | Star icon | "a gift that could solve all your problems" |
| 2 | 33.2-37.5s (4.3s) | *custom draw-on* | WASTING IT ALL | Person icon | "your grandfather watching you, having all these capabilities" |

**Issues**:
- Only 3 cues for 40s video (1 per 13s — should be ~10)
- 15.4s gap between cue_001 and cue_002 — huge uncovered stretch
- Old `draw-on` style, not current templates
- Headlines repeat speaker's words as text ("SUPERPOWERS", "WASTING IT ALL") — violates "never repeat speaker's words"

---

## Video 3: "onboarding video test" (31s, 2 cues)

| # | Time | Template | Headline | Items/Content | Transcript Context |
|---|------|----------|----------|---------------|-------------------|
| 0 | 3.8-7.5s (3.7s) | counter | Hours Saved | 5 /wk | "saved five hours per week" |
| 1 | 24.5-29.5s (5s) | typewriter | — | "From getting started to launching their product..." | "onboarding flow handles everything" |

**Issues**:
- Only 2 cues for 31s video (1 per 15.5s — should be ~8)
- 17s gap between cues (7.5s to 24.5s) — no b-roll at all
- Typewriter repeats transcript words verbatim — violates constraint
- No animated templates (scene3d/staggered/particles) used at all
- No headline on typewriter cue

---

## Video 4: "STOP trying to fit other 1" (22s, 2 cues)

| # | Time | Template | Headline | Items/Content | Transcript Context |
|---|------|----------|----------|---------------|-------------------|
| 0 | 1.5-5.0s (3.5s) | statement | Wrong Fit | "Other people's systems aren't yours" | "trying to fit other people's systems" |
| 1 | 9.5-13.5s (4s) | illustration | Your Path Exists | roadmap.png | "doesn't mean you have to waste all your time" |

**Issues**:
- Only 2 cues for 22s video (1 per 11s — should be ~5-6)
- 8.5s uncovered at end (13.5s to 22s)
- Uses `statement` — should use staggered/scene3d per decision cascade
- Uses `illustration` — static image, not animated
- Subtext on statement repeats speaker's words

---

## Video 5: "Ever had trouble with monday:sheets?" (103s, 12 cues)

| # | Time | Template | Style | Headline | Items | Transcript Context |
|---|------|----------|-------|----------|-------|-------------------|
| 0 | 2-6s (4s) | staggered | fracture | Tool Choice | monday.com, Google Sheets, ? | "why did you choose monday.com and Google Sheets" |
| 1 | 8-12s (4s) | scene3d | carousel | Your Reason | Best Tool?, Easy Features?, Mentor Said? | "Was it because you were sure they were the absolute best" |
| 2 | 19.5-22.5s (3s) | staggered | list-reveal | Blindly Following? | Mentor Said So, No Critical Thinking, Not Your Decision | "your mentor told you to and you forgot to be critical" |
| 3 | 26.5-31.5s (5s) | staggered | grid-stagger | Wrong Fit | Wrong Tool, Complex Agency, Can't Scale | "not built to run backend systems for complex agencies" |
| 4 | 34-38.5s (4.5s) | staggered | mosaic | Only Built For This | Basic Tasks Only, Simple Data Only, Nothing Complex | "basic task management, lightweight data" |
| 5 | 40.5-45.5s (5s) | scene3d | card-stack | Overloaded | Client Data, Project Tracking, Reporting, Automations | "client data, project tracking, reporting, automations" |
| 6 | 51.5-56.5s (5s) | scene3d | terminal | Data Talks Together | Clients → Projects, Projects → Reports, Reports → Automations | "database-driven systems where the data relates" |
| 7 | 57.5-62.5s (5s) | staggered | card-stack-3d | Frankenstein Sheet | Nested Formulas, Broken Links, Chaos | "building some Frankenstein formula in a spreadsheet" |
| 8 | 71.5-77s (5.5s) | scene3d | flyover | Better Tools | Airtable, Notion DB, PostgreSQL | "Airtable, Notion databases, PostgreSQL" |
| 9 | 83.5-88s (4.5s) | staggered | list-reveal | What Video Covers | Why Relational DBs, Choose The Right One, Migrate Without Breaking | "I just recorded a full 15-minute video" |
| 10 | 89-93s (4s) | scene3d | elements | Inside The Video | Why Monday Fails, Pick Right DB, Migrate Safely | "why relational databases matters so much" |
| 11 | 94.5-99s (4.5s) | particles | fireflies | Drop A Comment | — | "comment database, and I'll send you the link" |

**Issues**:
- This is the BEST output — good variety, good coverage, uses current template system
- `grid-stagger` with 3 items (odd) — now fixed in code
- `elements` style used (cue_010) — now removed from options
- Cue 9 and 10 cover nearly the same transcript section (83.5-93s) — redundant
- `list-reveal` used twice (cue_002 and cue_009) — should vary more
- "?" as a stagger item (cue_000) — lazy filler
- Some items just restate what was said: "Mentor Said So", "Not Your Decision"
- 8.5s gap between cue_008 and cue_009 (77s to 83.5s)

---

## Cross-Video Patterns & Improvement Areas

### 1. Cue Quantity
Early videos produced far too few cues. The "1 per 4 seconds" rule was added later but needs enforcement. Videos 1-4 are severely under-covered.

### 2. Text Repeating Speech
Multiple cues just put the speaker's words on screen. "SUPERPOWERS", "WASTING IT ALL", "Mentor Said So" — these add nothing. The prompt says "never repeat speaker's words" but it's not enforced strongly enough.

### 3. Template Variety
The best video (#5) uses good variety but still repeats `list-reveal` and leans heavily on `staggered`. Need to push for more `scene3d` and `particles` usage.

### 4. Item Quality
Items like "?", "Chaos", "Done" are vague filler. Items should be specific and add context the viewer can't get from audio alone.

### 5. Timing Gaps
Large stretches of video with no b-roll. Even the best video has 8.5s gaps. Need stricter distribution enforcement.

### 6. Old Prompt Formats
Videos 1-2 used completely different prompt formats (free-form instructions, draw-on styles). These are no longer relevant but show the evolution.

### 7. Headline Quality
Some headlines are generic: "Tool Choice", "Your Reason", "Inside The Video". Headlines should be punchy and add editorial perspective, not just describe the category.
