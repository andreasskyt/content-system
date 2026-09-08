# [BRAND] Marketing — Shared Rules

All content work under this folder inherits these rules. Subfolder CLAUDE.md files (YouTube, Reels, Stories) add format-specific rules on top.

This file is a TEMPLATE. Replace every `[PLACEHOLDER]` (run `setup/configure.sh` from the content-system repo, or find-and-replace by hand). Delete sections that don't apply to you. Claude Code reads this file automatically whenever it works inside this folder.

---

## Why content exists

Content IS the client acquisition engine, not a side project. [YOUR_NAME] builds a personal brand (Instagram @[IG_HANDLE], LinkedIn, YouTube @[YT_HANDLE]) as a [YOUR_EXPERTISE] expert. Every piece either builds authority, captures leads, or feeds the paid pipeline.

**Funnel roles:** YouTube = long-form authority/trust for inbound + sales-call warming · Reels = top-of-funnel reach + comment-keyword lead capture · Carousels = nurture/authority for followers · Stories = daily nurture + conversion of existing followers · Ads = paid pipeline, books the free [YOUR_CALL_NAME].

**Cadence targets:** 4–8 YouTube videos/mo (5–15 min) · 15–30 reels/mo · 15–30 carousels/mo · 10–20 story frames/week.

---

## Content philosophy

- **Sell the vehicle, not the outcome.** Everyone promises the destination. We differentiate on the HOW: the [YOUR_OFFER] method. Content teaches our way of doing things, not generic outcome claims.
- **Credit the mechanism, not the person.** "The [YOUR_OFFER] took his business from X to Y", not "I helped him". The mechanism is what gets remembered and bought.
- **Context on claims filters for quality.** A bare "$X in Y days" claim attracts impatient, low-quality leads. Adding the context (the foundation, the work, the timeline) attracts the patient buyers we want. Same logic behind polished production: how content looks signals who it's for.
- **Content waterfall.** Long-form YouTube is the source material. Each video spawns reels, carousel angles, and email/DM assets. Shortform is derivative, not invented from scratch.
- **Ecosystem, not funnel.** Prospects float between YT (trust), IG (daily touchpoint + DM access), and ads (reach) at their own pace. Long-horizon compounding game. Consistency beats virality.

---

## Knowledge library (optional)

If you keep a folder of marketing playbooks, swipe files, or copy principles, list them here so Claude pulls the canon source instead of improvising. Suggested structure:

| File | Use for |
|---|---|
| `Knowledge/<playbook>.pdf` | strategy decisions |
| `Knowledge/copy-principles/*.md` | before writing any hook, ad, or script |

**ICP:** ALL ideal-client material (pain points, verbatim language, objections, example clients) lives in `Ideal Client Profile/` (this folder). It is the single source for who we sell to and their language. Content ideas must be grounded in real prospect language, never invented.

---

## The funnel content feeds

- **Paid:** ad → [WEBSITE_DOMAIN] → qualification form → booking → call.
- **Organic:** reel/carousel → comment keyword → automated DM (GHL + n8n comment-to-DM engine) → lead magnet / landing page on [WEBSITE_DOMAIN]/{slug} → same form → call.
- **Trust layer:** YouTube long-form + IG presence warm prospects between touches; bottom-of-funnel content doubles as pre-call sales assets.

Qualifier: [ICP_QUALIFIER] businesses. The call is the conversion event. Content never sells price or scope directly.

---

## Voice & positioning — non-negotiable

- **Read `TONE-OF-VOICE.md` (this folder) before writing anything as [YOUR_NAME].**
- **Shared photo library:** `_photo-library/` (with `photos.json` descriptions) — real photos of [YOUR_NAME] for carousels, stories, thumbnails, any visual. Never invent filenames; pick by subject match.
- **Product naming:** [YOUR_NAME] builds **[YOUR_OFFER]s**. Use the offer name consistently; never downgrade it to generic template-tier words.
- **No third-party credit.** All claims are [YOUR_NAME]'s own. Never "a coach told me", never quoted experts, never interactions that didn't happen. Reader-direct angles instead.
- **CTAs are comment-keyword based**, never "DM me": 'Comment "KEYWORD" and I'll DM you…'. The keyword must exist as an active row in the Notion "Comments to DM Config" DB with a live landing page BEFORE posting.
- **Qualifier in copy:** [ICP_QUALIFIER] businesses.

---

## Editing (local, via /editing)

Engine: `[EDITING_WORKFLOW_ROOT]` — transcribe → cut silences → b-roll → subs → music.

- Output is exactly ONE file: `edited_<original_basename>.mp4`. Original never moved/renamed/deleted. No stage files (raw/subs/b-roll .mp4) left behind. Every run, even partial, ends with `npx tsx scripts/finalize.ts`.
- Clips cut from source recordings: keep only the final subbed clip + `cuts.json` manifest + transcript json. Raws are regenerated from source + manifest, never stored.

---

## Posting (Notion CPP → n8n autoposter)

ALL content (carousels, reels, YouTube, stories) is scheduled in the Notion Content Production Pipeline and posted by the n8n autoposter. Nothing is posted manually.

- **CPP DB:** `https://www.notion.so/[NOTION_CPP_DB_ID]` — DB id `[NOTION_CPP_DB_ID]`, data source `[NOTION_CPP_DATA_SOURCE_ID]`.
- n8n autoposter workflow `[N8N_WF_AUTOPOSTER_ID]` (ticks 8/10/12/14/16/18); instant post via `POST https://[N8N_HOST]/webhook/shortform-now` with `{"pageId": "..."}`. Stories: workflow `[N8N_WF_STORY_AUTOPOSTER_ID]`, instant via `/webhook/story-now`.
- Contract per page: Type (`Carousel`/`Short Form`/`Long Form`/`Story`) + Status=`Ready` + past `Upload Date` + `Caption` + `Platforms` + media attached.
- Upload media via the **public Notion File Upload API with `$NOTION_TOKEN`** (in `~/.zshrc`). Files attached via the Notion MCP are invisible to n8n.

---

## Skill routing

| Task | Skill |
|---|---|
| Edit any video | /editing |
| Single carousel | /carousel-generator · month batch: /carousel-batch |
| Carousel as reel | /motion-reel-carousel · Remotion version: /motion-carousel |
| Carousel from a YouTube video | /yt-carousel |
| YT titles/thumbnails/description | /youtube-packaging (also the publish gate before any upload) |
| Thumbnail image-gen prompts | /thumbnail-prompter (prompts for Pikzels/Nano Banana etc. — does not generate) |
| Reels / Shorts scripting | /shortform-content |
| Long-form YouTube scripting | /longform-content |
| Content ideas from sales calls | /fathom-content-ideas (requires Fathom) |
| Schedule content | /schedule-content |
| Stories | follow `Stories/CLAUDE.md` (no skill needed) |
