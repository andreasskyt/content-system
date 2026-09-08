# Reels

Inherits `Marketing/CLAUDE.md`. This file adds reels-specific rules.

---

## Goal & direction

Target: **15–30/mo.** Reach matters, but only the right reach: 2,000 qualified ICP views beat 1M random ones. Qualification comes from specificity, not capped ambition — speak in the ICP's own language ([ICP_QUALIFIER] business problems, their data, their numbers) and viral is fine; generic is not.

**Every reel serves exactly one of three objectives — state which before scripting:**

1. **TOF — reach & problem awareness.** People who don't know [YOUR_NAME]. Make them problem-aware, introduce him. This is the only tier that's allowed to chase big view counts.
2. **MOF — solution awareness & hand-raising.** People who've seen him, maybe problem-aware. Show the problem is solvable — via the [YOUR_OFFER] method (mechanism content lives here). Goal: follows and comment-keyword opt-ins for lead magnets.
3. **BOF — conversion & objection prehandling.** People who know, like, and trust him and want the problem fixed soon. Client proof, case studies, prehandling the typical sales objections. Goal: comments, opt-ins, booked calls. These reels double as sales assets — send them in DMs and before calls.

**Sources, in priority order:**
1. **Clips from YouTube long-form** — the waterfall. Clipping system: `reels_from_youtube/CLAUDE.md` (flat folder, slug-based, one raw clip per file, no subs by default — follow it exactly).
2. **Native talking-head reels** — scripted from ICP pain points and the reel template swipe file (`_reference-reel-templates.md`).
3. **Carousels as reels** — /motion-reel-carousel when a carousel topic deserves Reels-tab reach.
4. **Testimonial/interview clips** — cut from client calls; only the final subbed clip + `cuts.json` manifest, never raw duplicates.

**CTA rule (from Marketing/CLAUDE.md, enforced here):** comment-keyword CTAs only — keyword must be live in the Comments-to-DM Config with a landing page BEFORE the reel is scheduled.

---

## Workflow & technicals

- **Edit via /editing:** transcribe → cut silences → subs → music. Output exactly one `edited_<basename>.mp4`, original untouched, no stage files. Exception: the reels_from_youtube clipping system delivers raw clips without subs — its own CLAUDE.md overrides.
- **Posting:** schedule in the Notion CPP (Type=`Short`, Status=`Ready`, caption + platforms + video attached via the public File Upload API) — autoposter handles it. Nothing posted manually.
- Captions follow the positioning rules: [YOUR_OFFER] naming, no third-party credit, comment-keyword CTA.
- **NEVER put hashtags in captions/descriptions.** No `#` tags anywhere — not at the bottom, not in a first comment draft. A caption ends with the CTA.
