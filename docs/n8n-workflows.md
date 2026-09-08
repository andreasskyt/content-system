# n8n workflows

All exports in `n8n/workflows/`. Credentials are stripped (every node shows `REPLACE_ME` / `[credential name]`), instance-specific ids are placeholders, `active` is false. Import → re-map credentials → fill SET Variables → test → activate.

| # | File | Trigger | Needs | Core? |
|---|---|---|---|---|
| 01 | `01-auto-poster-unified.json` | schedule 8/10/12/14/16/18 + webhook `shortform-now` | Notion, Meta, S3, Google Drive, YouTube OAuth, Slack | **yes** |
| 02 | `02-story-auto-poster.json` | schedule 8/10/12/14 + webhook `story-now` | Notion, Meta, S3, Slack | yes |
| 03 | `03-ig-comment-to-dm.json` | webhook `ig-comment-dm` (from GHL) | Notion, GHL, Meta, Slack | organic leads |
| 04 | `04-youtube-to-notion-sync.json` | daily 06:00 (metrics) + 07:00 (transcripts) | YouTube key + OAuth, Notion, OpenAI (transcript summary), Slack | analytics |
| 05 | `05-instagram-to-notion-sync.json` | daily 06:00 | Meta, Notion, Slack | analytics |
| 06 | `06-yt-research-agent.json` | form + schedules (daily 06:00, Sundays) | Apify, OpenRouter/OpenAI, Notion, Slack | research |
| 07 | `07-ig-research-agent.json` | Sundays 03:00 | Apify, OpenRouter, Gemini, Notion | research |
| 08 | `08-yt-channel-growth-tracking.json` | schedule | YouTube key, Airtable | optional |

## Credentials to create (once)

| n8n credential | Type | Value |
|---|---|---|
| Notion API | Notion | integration token |
| Notion (header) | Header Auth | `Authorization: Bearer <NOTION_TOKEN>` (used by raw HTTP nodes: file uploads, page creation) |
| Meta Graph API | Header Auth | `Authorization: Bearer <META_SYSTEM_USER_TOKEN>` |
| S3 / R2 | S3 | access key, secret, endpoint, region `auto`, force path style |
| Google Drive | Google Drive OAuth2 | the account holding `Final Video (drive)` files |
| Slack | Slack API | bot token |
| GHL | Header Auth | `Authorization: Bearer <GHL_PIT_TOKEN>` + set `Version: 2021-07-28` in the node headers (already in export) |
| OpenAI / OpenRouter / Apify / Gemini / Airtable | native | only for 04, 06, 07, 08 |

---

## 01 — Auto-Poster (Unified: carousels + video)

**SET Variables:** `NOTION_CONTENT_DB`, `NOTION_IG_MY_CONTENT_DB`, `NOTION_YT_MY_CONTENT_DB`, `IG_ACCOUNT_ID`, `S3_BUCKET`, `S3_REGION`, `S3_PUBLIC_URL`, `SLACK_CHANNEL`, `YT_OAUTH_CLIENT_ID`, `YT_OAUTH_CLIENT_SECRET`, `YT_OAUTH_REFRESH_TOKEN`, `Notion_Version`.

**Flow:**
1. `Get Scheduled Posts` (Notion, filter Status=Ready) → `Filter due` (Upload Date ≤ now) → loop.
   Webhook path: `Post Now` → `Get Single Page` → same chain.
2. `Extract Notion Data` (Code): type, caption, platforms, drive file id, carousel/story file URLs, YT title.
3. **Video branch** (Type = Short Form / Long Form): `Download Video` (Google Drive) → `Upload to S3` → `Create Media Container` (`media_type=REELS`, `video_url`, caption) → `Check Upload Status` (poll `status_code` until FINISHED, Wait 30s ×N) → `Publish to Instagram` → `Get Instagram URL` → `Create IG My Content Page` → `Mark Posted on IG` (+ FB).
   If Platforms contains YouTube Shorts / YouTube: `YT: init resumable upload` (OAuth token from refresh token) → `YT: Upload Video` (PUT bytes) → `Create YT My Content Page` → `Mark Posted on YT`. Long Form uses the "(Long)" nodes with category/description tweaks.
4. **Carousel branch** (Type = Carousel): `Split Out` images → `Carousel: Download Image` → `Carousel: Upload to S3` → `Carousel: Create Child Container` (`is_carousel_item=true`) per image → `Aggregate` ids → `Carousel: Check Children Status` → `Carousel: Create Carousel Container` (`media_type=CAROUSEL`, `children=…`) → `Check Upload Status` → `Publish` → URL → `Create IG My Content Page` → `Mark Posted on IG/FB`.
5. `Set Status → Posted` → `Slack Notification`. `Stop and Error` nodes guard: no media, container error, publish failed.

**Gotchas:** IG requires the file at a public URL (hence S3). Reels must be ≤ 90 s for Shorts cross-post logic; the workflow decides Short vs Long by `Type`. YouTube quota: 1,600 units per upload, 10,000/day default. Carousel: 2–10 images, all same aspect ratio recommended.

## 02 — Story Auto-Poster

**SET Variables:** `IG_ACCOUNT_ID`, `S3_BUCKET`, `S3_PUBLIC_URL`, `SLACK_CHANNEL`. Reads `Type=Story`, `Status=Ready`, due. For each file in `Stories Media`: download → S3 → `Create Story Container` (`media_type=STORIES`, `image_url`/`video_url`) → wait → `Publish` → next frame (order preserved, ~10 s between frames). Then `Mark Story Posted` + Slack. No stickers/links via API: burn CTAs into the image.

## 03 — IG Comment → DM (config-driven)

Webhook receives the GHL payload (contact id + `triggerData.igCommentOnPost.ig.{body, commentId, permalinkUrl}` + `full_name`). `Get DM Config` (Notion, Active rows) → `Match Keyword` (Code: word-boundary match, no match = clean stop) → `Write DM Fields` (GHL PUT contact custom fields `dm_payload`, `lead_magnet`, `source_post`) → `Add Tags` (`ig-lead`, `kw-{keyword}`, `dm-ready`) → `Slack Notify` → `Wait 90s` → `Get Contact Tags` → If `dm-ready` gone (GHL sent the DM) → `Reply to Comment` (Graph API `POST /{commentId}/replies` with the row's Comment Reply) → Slack thread; else Slack alert "DM NOT sent".

Custom field ids are placeholders `[GHL_FIELD_*_ID]` in the export: create the three fields in GHL and paste their ids into the `Write DM Fields` node. See [ghl-comments-to-dm.md](ghl-comments-to-dm.md).

## 04 — YouTube → Notion Sync

06:00: `YouTube Search` (channel uploads) → `Statistics` (Data API key) → `Analytics` (watch time, subs; OAuth access token fetched from refresh token in `3b-auth`) → find Notion page by Video ID (fallback by title) → update or create YT My Content page. 07:00: pages without transcript → fetch transcript → summarise (OpenAI) → append as toggle block → tick Has Transcript. SET Variables holds the YouTube key/OAuth values.

## 05 — Instagram → Notion Sync

06:00: `GET /{IG_USER_ID}/media` → per post `insights` (reach, saves, shares, views) → find IG My Content page by Post ID → update or create. SET Variables: `IG_USER_ID`, the two Notion ids.

## 06 / 07 — Research agents

Apify scrapers (`streamers~youtube-scraper`, comments scraper, IG reel scraper) feed LLM agents (OpenRouter/OpenAI/Gemini) that write outlier videos/reels, comment analyses, and weekly idea reports into Notion research DBs and Slack. Replace the example niche/channel values in the SET nodes (`Niche`, `Broad Niche`, `Channel URL`, `Channel Description`, `SET IG User`). Costs: Apify + LLM tokens per run; start with the Sunday schedule only.

## 08 — YT Channel Growth Tracking

`GET /youtube/v3/channels?part=statistics` → Airtable rows with deltas. Swap Airtable for a Notion DB if you prefer (two nodes).

---

## Error workflow

Create a tiny workflow (Error Trigger → Slack) and set it as the error workflow in each imported workflow's settings (`REPLACE_WITH_YOUR_ERROR_WORKFLOW_ID`).

## Testing checklist

- [ ] One CPP row, Status=Ready, Upload Date in the past, Platforms=Instagram, 2 carousel PNGs attached via File Upload API → run 01 manually → row Posted, IG My Content row created.
- [ ] One Short Form row with a Drive link → posted as Reel; if Platforms includes YouTube Shorts, uploaded (check Studio, may be Private if app unverified).
- [ ] Story row with 2 frames → 02 posts both in order.
- [ ] POST the webhook with a fake GHL body → 03 matches keyword, writes fields/tags, Slack notify. Remove `dm-ready` manually within 90 s to simulate the DM being sent → comment reply attempted.
