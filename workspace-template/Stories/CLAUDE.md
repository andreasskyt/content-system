# Instagram Stories

Inherits `Marketing/CLAUDE.md`. Scripting, creating, and advising on [YOUR_NAME]'s IG stories (@[IG_HANDLE]).

---

## What stories are for

Stories last 24h and reach **followers only** — this is the nurture-and-convert layer, not reach. Every story frames toward buying: shift a belief, smash an objection, show proof, or soft-pitch — while staying human and day-to-day. Lurkers → engaged followers → DMs → booked calls.

**Three objectives (every story serves one):**
1. **TOF (warm-up):** newer followers who barely know [YOUR_NAME]. Day-to-day, behind-the-scenes (highest-trust format), personality, problem-awareness. Also: promoting new YouTube videos.
2. **MOF (belief shifts):** make them solution-aware. Teach one thing, break one limiting belief, show the [YOUR_OFFER] method working. Get hand-raises via stickers.
3. **BOF (convert):** objection prehandling, client wins, DM screenshots, testimonials, soft pitches. Make buying feel easy. CTA to DM or book.

## The weekly system

- **10–20 story bits per week, posted daily** — people binge stories; stack them. Tray position rewards recency, so never let a day go fully dark.
- **First story of the day matters most** — it decides whether followers tap you for the rest of the day. Never open with filler.
- **Sequence, don't post isolated frames:** 3–5 connected stories telling one mini-narrative (hook → value/belief shift → proof → CTA) massively outperform singles. Value-first: 3–5 frames of pure value before the ask.
- **Mix formats:** talking-head rants, screen recordings (real dashboards — show don't tell), testimonials/DM screenshots, lifestyle/context shots, YouTube promo frames.

## Engagement stickers

Polls, Q&A, quizzes, sliders — intentional only: ask what a real [ICP_QUALIFIER] business owner is actually wondering ("Do you trust your dashboard numbers?" — never generic engagement bait). Polls are lowest-friction (one tap). Combining stickers across a sequence lifts the whole sequence. Sticker answers = market research + a list of hand-raisers to DM.

## CTAs

- **Primary: "Reply with KEYWORD"** — story replies land straight in DMs, the highest-converting path for a service like ours. NOTE: story replies are NOT wired to the comments-to-DM engine (that's post comments only) — replies are handled manually today. Automating story-keyword replies is an open build.
- **Secondary: link sticker** → [WEBSITE_DOMAIN] landing page / YouTube video / booking.
- Positioning rules apply ([YOUR_OFFER] naming, claims are [YOUR_NAME]'s own, real numbers).

## Proof & credibility

Social-proof overload is the strategy: repost client wins, DM screenshots, video testimonial clips — upload everything real we have, regularly. The testimonial library lives in `Marketing/Testimonials/`. Profile stays credible at a glance (public, strong grid) since stories convert against the whole account.

## Amplify & follow-up

- **Boost winning stories** only to WARM audiences (booked calls, active DMs, no-shows, booked-not-bought) — never cold; rotate creatives, never the same story to the same people twice in a row. Fits the always-on retargeting layer in `ADS/CLAUDE.md`.
- **DM new followers** ("thanks for following — are you running an agency?") → ask their main constraint → send a resource → book. Manual for now; an IG DM-setter automation can take this over later.

## Production

iPhone is enough — raw and real beats polished and boring for stories. Clean background, clear audio. No heavy editing pipeline; /editing only if a clip needs subs.

### Creating story images (locked system, 2026-09-02)

Every story image must look like [YOUR_NAME] made it manually in the Instagram app — real photo + native IG text. Never designed graphics, never brand display fonts (no Poppins), never anything that smells AI-generated.

**Styles — read the sheet BEFORE building, rotate between them:**
- `styles/style-1-classic-pills.md` — Classic sans in background pills. Hooks, lists, CTAs, blur-reveal.
- `styles/style-2-plain-classic.md` — plain white Classic text, no pills. Rants, text-wall storytelling.
- `styles/style-3-serif-proof.md` — Editor-style serif in green/beige pills. Client wins, BTS, proof.
- `styles/style-4-yt-promo.md` — new-YouTube-video promo: pills + rounded thumbnail attachment, NO CTA ([YOUR_NAME] adds the link sticker manually).

The style sheets are the single source of truth for fonts, text style, colours, and placement. To change how ALL future stories look, edit the sheets — never inline-override them per story.

**Hard rules (all styles):**
- NO emojis. NO tilted text — everything horizontal. NO text over [YOUR_NAME]'s face or the photo subject.
- Emphasis = red `#ED2121` word or white hand-drawn scribble underline (per the style sheet), nothing else.
- Photos: real ones from `Marketing/_photo-library/` (has `photos.json` descriptions) or supplied by [YOUR_NAME].
- Proof is real or it doesn't exist — never fabricate screenshots or numbers.

**Formats:**
- *Scattered sequence:* different photo per frame, hook → pain → mechanism → proof → CTA.
- *Blur-reveal:* SAME photo all frames, one list, N lines = N frames; frame k shows lines 1-k sharp, rest blurred (`filter: blur(5px); opacity: 0.9`). CTA appears only on the last frame. Line stack goes over negative space so blurred bars never cover the subject.

**Workflow & folder convention:**
1. Each story/sequence gets a subfolder directly in `Stories/`: `Stories/<kebab-case-story-name>/`.
2. Write `script.md` in the subfolder first: per-frame copy, style used, photo used, emphasis words, CTA keyword. This file is the copy archive — later analysis reads scripts, not images.
3. Author frames as HTML (540×960, link `styles/base.css`) in the session scratchpad — HTML is temp and never lands in the story folder.
4. Render: `python3 "Stories/styles/render.py" <scratch_html_dir> "Stories/<story-name>/"` → 1080×1920 PNGs.
5. A story subfolder contains ONLY `script.md` + the final PNGs. Nothing else.

`styles/base.css` + `styles/render.py` are the shared render kit. `_Testing/` holds experiments and is exempt from the convention.

**Posting:** the IG Graph API supports story publishing (`media_type=STORIES`, business accounts, image/video, 8MB, 4:5–1.91:1) — but NO stickers: no polls/Q&A/countdowns/link stickers via API. Split accordingly:
- **Auto (target ~90%):** scripted sequences, proof frames, YT promos, testimonial clips — batch-create, schedule in Notion CPP (Type=`Story`), posted by the n8n auto-poster (extension of `[N8N_WF_AUTOPOSTER_ID]` — pending build). "Reply with KEYWORD" CTAs work burned into the image; links = "link in bio".
- **Manual (from the app):** anything needing stickers — polls, Q&A, quizzes, link stickers. 2–3 interactive frames/week.

**Test everything, weekly:** watch what gets replies (not views), double down on those formats.

## Never

- Buy followers or fake credibility of any kind — proof is real or it doesn't exist.
- Pure day-logging with no angle toward belief, proof, or offer.
- Generic engagement-bait stickers.
- Running story ads to cold audiences.
