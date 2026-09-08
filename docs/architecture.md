# Architecture

Six tiers. Each has one tool, one responsibility, one data contract.

## 1. Ideation & research

| Source | Where | Output |
|---|---|---|
| Your own recordings | phone/camera → `[CONTENT_ROOT]/Reels` or `/YouTube` | files on disk |
| Sales / discovery calls | `/fathom-content-ideas` (Fathom transcripts) | ideas in the ICP's own words |
| YouTube competitor research | n8n `06-yt-research-agent` (Apify + LLM) | Notion research DBs + Slack report |
| Instagram competitor research | n8n `07-ig-research-agent` | Notion reels DBs + weekly report |
| YouTube long-form | the waterfall: every video → reels, carousel angles, DM assets | |

Ideas land as rows in the Content Production Pipeline (CPP) with `Status=Idea`.

## 2. Planning — Notion CPP

One database, one status chain: `Idea → Scripting → Recording → Editing → To Review → Ready → Posted`. Types: Short Form · Carousel · Long Form · Story · LinkedIn · Newsletter · Ads. Schema in [notion-schema.md](notion-schema.md).

## 3. Creation — local Claude Code skills

| Skill | Produces |
|---|---|
| `/editing` | one `edited_<name>.mp4` (transcribe → cut → b-roll → subs → music → finalize) |
| `/carousel-generator`, `/carousel-batch`, `/yt-carousel` | 1080×1350 PNG slides |
| `/motion-reel-carousel`, `/motion-carousel` | carousel as an animated 9:16 reel |
| `/youtube-packaging`, `/thumbnail-prompter` | titles, description, chapters, coded thumbnails / image-gen prompts |
| Stories kit (`Stories/styles/`) | 1080×1920 native-looking story frames |
| `/shortform-content`, `/longform-content` | scripts |

All outputs land in `[CONTENT_ROOT]/<Format>/<title>/`.

## 4. Scheduling bridge — `/schedule-content`

The single choke point from "file on disk" to "row the autoposter will pick up". Uploads media (Notion File Upload API for images/stories, Google Drive link for video), writes Caption/Platforms/Upload Date, sets `Status=Ready`. Picks the next open slot.

## 5. Distribution — n8n auto-posters

- `01-auto-poster-unified`: every 2 h (8–18) reads CPP rows with Status=Ready and Upload Date in the past. Video → Drive download → S3 → IG Reel container → publish; same file → YouTube resumable upload (Short or long-form). Carousel → each image → S3 → child containers → carousel container → publish. Writes "My Content" rows, ticks Posted on IG/YT, flips Status to Posted, Slack.
- `02-story-auto-poster`: same contract for `Type=Story`, frame by frame (`media_type=STORIES`).
- Webhooks `shortform-now` / `story-now` post a single page immediately.

## 6. Feedback loop

- `04-youtube-to-notion-sync` (daily): stats + analytics → YT My Content; transcripts appended as toggle blocks.
- `05-instagram-to-notion-sync` (daily): insights → IG My Content.
- `08-yt-channel-growth-tracking`: subscriber/view deltas to Airtable (optional).
- `03-ig-comment-to-dm`: comment keyword → CRM fields/tags → DM with landing link → public comment reply. The organic lead engine.

## Design rules that keep it working

- **Notion is the only source of truth for scheduling.** Nothing is posted manually.
- **Media must be publicly downloadable at post time** → the bucket. Notion/Drive links expire.
- **One output file per edit**, original untouched, stage files deleted (`finalize.ts`).
- **Files attached via a Notion MCP are invisible to the public API.** Always upload via the File Upload API.
- **Keywords are config, not code.** New lead magnet = one Notion row.
