# Titles & description

## Rules

- **40–60 characters.** Mobile truncates around 60. Front-load the hook — the
  first 3–4 words carry the click.
- **One idea.** No "and", no colon-stacking two concepts.
- **Specific beats clever.** A real number, tool, or amount out-pulls wordplay.
- **Odd numbers outperform even ones** by roughly 20%.
- **Use "I" and "you".** Personal pronouns consistently beat impersonal phrasing.
- **Never repeat the thumbnail text.** The pair should deliver two angles on one
  promise, not the same sentence twice.
- **The gap must close in the video.** An unresolved curiosity gap trains the
  algorithm against you through poor retention.

## Formulas that fit [YOUR_NAME]'s channel

| Formula | Shape | Example |
|---|---|---|
| Mistake | Why your X keeps [failing] | Why your AI automation keeps breaking |
| Specific number | I [did X] for N [clients/months] — here's what happened | I audited 11 agency dashboards. All 11 were wrong. |
| Contrarian | Stop [common advice]. Do this instead. | Stop automating. Structure your data first. |
| Reveal | What [group] won't show you | What "AI agencies" don't show you about their builds |
| Cost | The real cost of [thing they think is free] | The real cost of a $50 Zapier stack |
| Transformation | From [bad state] to [good state] in [time] | From 40 spreadsheets to one dashboard in 3 weeks |
| Build-along | I built [specific thing] in [time] | I built a client CRM in 6 days — full breakdown |

## Banned patterns

- "You won't believe…", "This changed everything", "The ULTIMATE guide"
- ALL-CAPS words in the title (that job belongs to the thumbnail)
- Emoji
- Vague superlatives with no referent: "insane", "crazy", "game-changer"
- Anything the video does not actually deliver

## Description — locked format

This exact shape, every video — copied from the description [YOUR_NAME] actually
published on 2026-08-11, which is the reference. Three blocks in this order:
**links → chapters → the point.** Do not add sections, keyword blocks,
hashtags, bullet lists, or a "what you'll learn" section.

```
Want to work with me? Book a free systems audit here → https://[WEBSITE_DOMAIN]/yt/{publish-date}
Instagram → https://www.instagram.com/[IG_HANDLE]/
LinkedIn → [LINKEDIN_URL]

Chapters
0:00 — [hook]
0:19 — [...]

[The main point of the video. 2–4 sentences, plain language, contains the main
keyword. What the video argues — not what the viewer "will get".]
```

Rules that are easy to get wrong:

- **Those are the social URLs.** The personal profiles, not the company
  accounts — `[IG_HANDLE]` and `[LINKEDIN_HANDLE]`. Getting this wrong sends
  viewers to a near-empty profile.
- **Prose is one unwrapped paragraph.** No hard wrapping at 80 chars — YouTube
  re-wraps and the hard breaks land mid-sentence.
- **Timestamp first on the line,** no bullet character before it, or YouTube
  won't build the chapter bar. `0:00` unpadded is what [YOUR_NAME] ships and
  YouTube parses it fine.
- First chapter is always `0:00`, minimum 3, 5–9 total, titles short and
  concrete, taken from the transcript's natural section breaks.
- Blank lines separate the three blocks, not the individual lines inside them.
- More links may be added to the top block later — after LinkedIn, one per line.

### The tracked link (website link only)

The website link is **always** the short form `[WEBSITE_DOMAIN]/yt/{publish-date}`.
Instagram and LinkedIn links in the block stay clean — no tracking on those.

**Ask [YOUR_NAME] for the publish date if it isn't obvious; don't assume today.**
The date is the link, so guessing it wrong breaks the attribution silently.

- Format is ISO with dashes: `2026-08-11`. That's what the YouTube API returns
  in `publishedAt`, so the tracking dashboard joins on it without parsing.
- Two videos on one day → suffix the second `-2` (`/yt/2026-08-11-2`).
- Never a topic slug. [YOUR_NAME] chose the date deliberately: it's the join key
  against YouTube data, and it lets old videos be retrofitted by editing their
  descriptions. Recognisability in Slack loses to joinability here.

The redirect lives in the website repo's `next.config.js` and 307s to
`/?utm_source=youtube&utm_medium=description&utm_campaign=organic_youtube&utm_content={publish-date}`,
which lands on the site with the params, where `Booking.tsx` puts them on the
GHL widget URL. Those five params map to GHL's hidden fields — the same
taxonomy Meta ads use. Never invent a parameter name for a new channel; change
the value of `utm_source`, not the schema.

`utm_content` ends up as **Ad Name** in GHL and prints as `🎯 Video:` in the
Slack booking alert.

## Output shape

Deliver 5 **pairs**, each labelled with its concept id, so a thumbnail and its
title are never separated:

```
A — the mistake
   thumbnail: NEVER DO THIS  (stamp, broken dashboard)
   title:     Why your vibe-coded dashboard breaks in week 3
```
