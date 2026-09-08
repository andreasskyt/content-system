# SETUP — end to end

Do the steps in order. Later steps depend on ids produced by earlier ones. Tick them off.

Time: ~4 hours if you have no accounts yet, ~1 hour if you already have Meta/Google API access.

---

## 0. Clone and configure

```bash
git clone <repo> content-system && cd content-system
chmod +x setup/*.sh
./setup/configure.sh
```

You won't know all ids yet (Notion, n8n, IG account). Leave them empty now and re-run `configure.sh` after each step. Remaining placeholders are printed at the end of every run.

Create your content workspace folder (this is `[CONTENT_ROOT]`, e.g. `~/Marketing`) and copy the template into it:

```bash
cp -R workspace-template/ "$CONTENT_ROOT"/
```

The `CLAUDE.md` files inside are what make Claude Code follow the system's rules whenever you work in that folder.

---

## 1. Notion — the Content Production Pipeline

1. Create an **internal integration** at notion.so/my-integrations. Name it e.g. "Content System". Capabilities: read, update, insert content. Copy the token → `export NOTION_TOKEN=ntn_...` in `~/.zshrc`.
2. Create a parent page (e.g. "MARKETING"). Share it with the integration (page menu → Connections → add the integration). Copy its id (last 32 hex chars of the URL).
3. Create the databases:
   ```bash
   NOTION_TOKEN=ntn_... python3 notion/create-databases.py <parent_page_id>
   ```
   It prints 4 database ids + data source ids. Save them (they go into `configure.sh`).
   Alternative: paste `notion/README.md`'s prompt into Claude Code and let it build the DBs with the Notion MCP.
4. **Manual steps the API can't do** (10 minutes, in the Notion UI): Status options and groups, three views, two page templates. Exact spec in [docs/notion-schema.md](docs/notion-schema.md).
5. Re-run `./setup/configure.sh` with the ids.

Verify: create one row with Status=Idea. Query it with curl:
```bash
curl -s -X POST "https://api.notion.com/v1/databases/$NOTION_CPP_DB_ID/query" -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28" | head -c 300
```

---

## 2. Meta — Instagram publishing, comments, DMs

Full walkthrough: [docs/meta-setup.md](docs/meta-setup.md). Outcome you need:

- Instagram **professional** (Business) account linked to a Facebook Page.
- A Meta developer app (type Business) with Instagram Graph API + Messenger/Instagram messaging added.
- A **System User token** from Business Manager (never expires) with scopes: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `pages_messaging`, `business_management`.
- Your **IG account id** (`1784...`) → `[IG_ACCOUNT_ID]`.

Store the token as `META_SYSTEM_USER_TOKEN` in `~/.zshrc`. It also becomes an n8n Header Auth credential.

---

## 3. Google — YouTube upload + analytics

Full walkthrough: [docs/youtube-setup.md](docs/youtube-setup.md). Outcome:

- Google Cloud project with **YouTube Data API v3** and **YouTube Analytics API** enabled, OAuth consent screen configured, an **OAuth client (Web)** with redirect `http://localhost:8888`.
- A **refresh token** for the channel's Google account with scopes `youtube.upload`, `youtube`, `yt-analytics.readonly`, plus `drive.readonly` if you use Drive for video hand-off (`skills/schedule-content/reauth-drive.sh` does the OAuth dance).
- A YouTube **Data API key** (for read-only stats) and your **channel id** (`UC...`).

Placeholders: `[YT_OAUTH_CLIENT_ID]`, `[YT_OAUTH_CLIENT_SECRET]`, `[YT_OAUTH_REFRESH_TOKEN]`, `[YT_DATA_API_KEY]`, `[YT_CHANNEL_ID]`. These live only inside n8n (SET Variables node) and `~/.zshrc`, never in this repo.

> Unverified apps: uploads may be forced to Private until Google verifies your app, and refresh tokens of apps in "Testing" expire after 7 days. Publish the app (no verification needed for your own channel) to get non-expiring refresh tokens.

---

## 4. Storage — public bucket for media staging

Instagram's API only accepts publicly downloadable URLs; Notion and Drive links are signed/expiring. The auto-posters copy media to a bucket first.

[docs/storage-r2.md](docs/storage-r2.md): Cloudflare R2 (free tier is enough) or any S3. Bucket with public read → `[S3_BUCKET]`, public host → `[S3_PUBLIC_HOST]` (e.g. `pub-xxxx.r2.dev`). n8n S3 credential: access key, secret, endpoint `https://<account>.r2.cloudflarestorage.com`, region `auto`, force path style ON.

---

## 5. Slack (optional)

Create a Slack app with a bot token (`chat:write`, `chat:write.public`), invite the bot to a channel, copy the channel id → `[SLACK_CHANNEL_ID]`. If you skip Slack, delete the Slack nodes in the workflows after import (they are leaf nodes).

---

## 6. n8n — import the workflows

[n8n/README.md](n8n/README.md) has the per-workflow details. Summary:

1. Create credentials in n8n first: Notion API · Header Auth "Meta" (`Authorization: Bearer <META_SYSTEM_USER_TOKEN>`) · Header Auth "Notion" (`Authorization: Bearer <NOTION_TOKEN>`) · S3 · Google Drive OAuth2 (if used) · Slack · (comment-to-DM only) Header Auth "GHL" · (research agents only) OpenAI / OpenRouter / Apify / Gemini.
2. Import `n8n/workflows/01-auto-poster-unified.json` (Workflows → Import from file). Open every node with a red credential warning and pick the matching credential.
3. Open the **SET Variables** node and fill the placeholders (Notion ids, `IG_ACCOUNT_ID`, bucket, Slack channel, YouTube OAuth values).
4. Repeat for `02-story-auto-poster.json`. Then `03-ig-comment-to-dm.json` if you use the comment-keyword lead capture (needs step 8).
5. Optional analytics/research: `04`–`08`.
6. Save each workflow, note its id from the URL → `[N8N_WF_*_ID]` placeholders, re-run `configure.sh`.
7. Activate. Test with ONE Notion row: Status=Ready, Upload Date 5 minutes ago, one platform, media attached. Trigger manually (Execute workflow) before trusting the schedule.

Instant post endpoints (used by `/schedule-content`): `POST https://[N8N_HOST]/webhook/shortform-now {"pageId": "..."}` and `/webhook/story-now`.

---

## 7. Local tools — editing engine + skills

```bash
# engine
cd editing-workflow && npm install && cp .env.example .env.local   # fill ELEVENLABS_API_KEY (or use local whisper), PEXELS_API_KEY
brew install ffmpeg                                                  # needs libass for subtitle burn-in
swiftc -O -o scripts/matte/PersonMatte scripts/matte/PersonMatte.swift   # person mask (macOS only)
pip3 install playwright && playwright install chromium               # stories, carousels, thumbnails

# skills → Claude Code
cp -R skills/* ~/.claude/skills/
```

Motion reels via Remotion: `cd skills/motion-carousel/remotion && npm install`.

YouTube thumbnails need your cut-out photo library: see `workspace-template/Thumbnails/_cutouts/README.md`.

Carousel avatar: put a square profile picture at `skills/carousel-generator/assets/profile.png` and `skills/motion-carousel/remotion/public/profile.png` (git-ignored).

Details and the full pipeline: [docs/editing-workflow.md](docs/editing-workflow.md) · [docs/skills.md](docs/skills.md).

---

## 8. Comment-to-DM lead capture (optional, GoHighLevel)

[docs/ghl-comments-to-dm.md](docs/ghl-comments-to-dm.md). One GHL workflow (IG comment trigger → webhook → wait → send DM) + the n8n brain + the Notion "Comments to DM Config" DB. Adding a lead magnet = one Notion row.

If you don't use GHL: the n8n workflow's "brain" (keyword match from Notion) is reusable; replace the four GHL HTTP nodes with your CRM's API, or send the DM directly via the Instagram Messaging API.

---

## 9. Fill in the brand layer

- `[CONTENT_ROOT]/TONE-OF-VOICE.md`: build it from your own transcripts (instructions inside).
- `[CONTENT_ROOT]/Ideal Client Profile/icp.md`: pains, desires, objections, verbatim language.
- `[CONTENT_ROOT]/_photo-library/`: 20–50 real photos + `photos.json`.
- Brand tokens: `skills/carousel-generator/references/brand.md`, `skills/carousel-batch/references/brand2.md`, `editing-workflow/assets/brand.json`, `editing-workflow/src/motion/tokens.css`, `editing-workflow/src/styles/brand.ts`. The shipped palette is a deep-green / gold / beige example. Swap hex values and fonts once, everything downstream follows.

---

## 10. First run (the smoke test)

1. `/carousel-generator` in Claude Code → 6 slides land in `[CONTENT_ROOT]/Carousels/<name>/`.
2. `/schedule-content` → uploads the PNGs to the Notion row via the File Upload API, sets Caption, Platforms, Upload Date, Status=Ready.
3. Watch n8n execute at the next tick (or fire the webhook). Notion row flips to Posted, Slack pings, an "IG My Content" row appears.
4. Record a talking-head clip → `/editing "cut silences, add subs, finalize"` → `edited_<name>.mp4` → `/schedule-content` → posted as a Reel + Short.

If step 3 says "Carousel has no images": the images were attached through a Notion MCP/UI path the public API can't see. Re-upload via the File Upload API (`/schedule-content` does this correctly).
