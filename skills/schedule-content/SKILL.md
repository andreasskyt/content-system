# /schedule-content — Content Scheduling

Trigger: user says `/schedule-content` with optional args

Schedules a finished piece of content: either a **short-form video** (Drive → Notion) or an **Instagram carousel** (PNGs → Notion file uploads). The n8n auto-poster workflows handle actual posting from there.

## 🚨 Rule #1 — NEVER publish a production/folder title

The Notion `Title` property becomes the **public YouTube video title** (and the internal name everywhere). The folder/file name is a *production* slug (`zane 2 - nowornever`, `[CLIENT] 1 - nowornever`) — it must **NEVER** be used as the published title.

| ❌ NEVER publish (production slug) | ✅ Publish (post hook) |
|---|---|
| `zane 2 - nowornever` | `If you have sales calls, DO THIS` |
| `[CLIENT] 1 - nowornever` | `The system that predicts client churn` |

The folder name is used ONLY to locate the file and name the Drive backup folder. The published title is a separate **post title** that is always either (a) given by [YOUR_NAME], or (b) generated as a viral hook from the transcript — see Step 2.9. **Do not derive the published title from the folder name. Ever.**

**How to recognize a production-note title (reject these as the published title):** these are notes-to-self, not real titles. Tell-tale signs:
- A name + a number: `[CLIENT] 1`, `zane 2`, `Video 1`, `Client 3`
- A `<label> - <label>` / comma structure where one side is a song, app, client, or project name: `zane 2 - nowornever`, `name, number - song-name`, `Video 1 - my app`
- Mentions a song/track, raw client name, take/version number, or file/project codename
- Reads like a label, not a sentence with a hook — no promise, result, or curiosity

A real post title reads like a hook someone would click: `If you have sales calls, DO THIS`, `The system that predicts client churn`.

If the title you're about to publish (whether from the folder OR even one [YOUR_NAME] typed) matches the production-note pattern, **do not publish it — flag it and ask for a real post title** (or offer to generate one from the transcript, Step 2.9 option b).

## 🚨 Rule #2 — ASK for anything not provided

Every schedule needs four things: **Title, Caption, Post date, Platforms.** For each one [YOUR_NAME] did NOT explicitly provide in his prompt, you MUST ask him before scheduling — never silently default. The ONLY auto-derived field is `Video Format` (ffprobe). See Step 2.9.

## Config

```
LOCAL_SHORTFORM_FOLDER:   ~/Desktop/[BRAND]/Marketing/Short Form
LOCAL_CAROUSEL_FOLDER:    [CONTENT_ROOT]/Carousels
GDRIVE_PARENT_FOLDER_ID:  [GDRIVE_PARENT_FOLDER_ID]
NOTION_DB_ID:             [NOTION_CPP_DB_ID]
NOTION_DS_ID:             [NOTION_CPP_DATA_SOURCE_ID]
```

## `--now` behavior (post immediately via webhook)

`--now` fires the auto-poster workflow's webhook right after the Notion row is created, bypassing the cron schedule. Both workflows accept the same payload and return the same response.

**Payload** (both): `{"pageId": "<NOTION_PAGE_ID>"}`
**Expected response** (both): `{"message":"Workflow was started"}` with HTTP 200

| Content type | Webhook URL | Workflow ID | Executions dashboard |
|---|---|---|---|
| **IG Carousel** | `https://[N8N_HOST]/webhook/carousel-now` | `[N8N_WF_AUTOPOSTER_ID]` | https://[N8N_HOST]/workflow/[N8N_WF_AUTOPOSTER_ID] |
| **Short Form** | `https://[N8N_HOST]/webhook/shortform-now` | `[N8N_WF_AUTOPOSTER_ID]` | https://[N8N_HOST]/workflow/[N8N_WF_AUTOPOSTER_ID] |

Both workflows have the same branching pattern: `Trigger → SET Variables → Has Page ID? → (webhook) Get Single Page → Loop | (cron) Get Scheduled Posts → filters → Loop`. The cron path is unchanged by the webhook addition — it still fires at 10/14/18/22 for short-form and 9/13/17/21 for carousels.

**After firing a webhook, verify it actually posted:**
1. Expect HTTP 200 `{"message":"Workflow was started"}`.
2. Wait ~60-90s, then query the Notion page:
   - **Carousel**: check `Posted on IG: true` and `Post ID` is set. Note: current carousel workflow populates `Post ID` in a separate IG Content DB row but DOESN'T copy it back to the source row — use `Status = "Posted"` as the primary signal instead.
   - **Short Form**: check `Posted on IG` and/or `Posted on YT` checkboxes + `Status = "Posted"`.
3. Still `Scheduled` after 2 min → the n8n run errored somewhere after "started". Surface the executions URL.

### Re-firing a stuck post

Symptom: 2+ minutes after the first `--now` fire, Notion still shows `Status=Scheduled` and post-flags unset. The workflow started but never published.

- Safe to re-fire — both workflows are idempotent-ish: they check the post-flag before actually publishing to IG/YT, so they won't create a duplicate live post. (The carousel workflow specifically checks `Create Child Container` before running; the short-form checks `Needs Instagram?` and `Needs YouTube?` IF nodes.)
- ALWAYS check current state first. Never blindly re-fire without confirming the post-flags are still false.
- If two re-fires still don't publish, stop hammering the webhook and check the executions page for the actual error.

### The Notion response parsing gotcha

Captions with newlines cause `echo "$RESP" | jq ...` to fail in zsh (control-character error). The Notion API returns valid escaped JSON, but `echo` in zsh re-interprets `\n` sequences and corrupts the response before jq sees it. Two fixes:

- Use here-string: `jq '...' <<< "$RESP"`
- Or write to tmpfile: `echo "$RESP" > /tmp/r.json; jq '...' /tmp/r.json`

The Notion page is still created successfully in this case — the parse failure only affects extracting the page ID locally. If the CREATE returned HTTP 200, the page exists; just grep the response directly for the UUID.

## Detecting which mode to run

Look at the input to decide:

| Input signal | Route |
|---|---|
| Path to a `.mp4`/`.mov`/`.webm` file OR a folder containing `finalreadyvideo.mp4` | **Short-form flow** (see below) |
| Path to a folder containing `slide_*.png` files (from carousel-generator skill) OR 2–10 image files | **Carousel flow** |
| User says "carousel" / "IG post" / "swipeable" | **Carousel flow** |
| User says "video" / "short" / "reel" | **Short-form flow** |
| Ambiguous | Ask which type to schedule |

## Scheduling slots (shared by both flows)

Both auto-poster workflows run several times daily. **Every scheduled row must include a date AND time** in `Upload Date` — the workflows filter `Upload Date <= now`, so they fire at the first cron tick at/after the time you set.

| Content type | Cron (the `Schedule` node, in **UTC**) | In [TIMEZONE] | Workflow |
|---|---|---|---|
| **Short Form** (videos, Reels) | `0 0 8,10,12,14,16,18 * * *` | summer (CEST): 10,12,14,16,18,**20** · winter (CET): 09,11,13,15,17,19 | `[N8N_WF_AUTOPOSTER_ID]` |
| **IG Carousel** | 09:00, 13:00, 17:00, 21:00 (local — unverified, re-check node) | — | `[N8N_WF_AUTOPOSTER_ID]` |

> ⚠️ The Short Form cron is **UTC**, not local. The last daily tick is `18:00 UTC` = **20:00 CEST** (summer) / 19:00 CET (winter). There is NO 22:00 slot. Verified live 2026-06-01 (execution 5764 fired at 16:00 UTC = 18:00 CEST).

### Slot-rounding rule

When the user provides `--when`:
1. Parse as local datetime
2. Round UP to the next valid slot for the content type (slots are the cron ticks above):
   - Short Form: next tick in {10,12,14,16,18,20} CEST (last is 20:00; nothing after)
   - Carousel: next odd-hour in {9, 13, 17, 21}
3. If all of today's slots are past → roll to tomorrow's first slot
4. Store as ISO 8601 with timezone offset

Example (short form, current time is 2026-04-22 11:30 local):
- `--when "2026-04-22 13:00"` → rounds up to `2026-04-22T14:00:00+02:00`
- `--when "2026-04-22 15:00"` → stays `2026-04-22T15:00:00+02:00` (not rounded — only round if user gave a non-slot time AND they didn't explicitly match a slot; actually keep what user gave)

**Simpler rule**: trust whatever time the user gave. Only auto-round when no time is given (default to the next upcoming slot). The workflow will pick the row up at the next cron that falls after `Upload Date`.

### Default `--when` behavior

If the user provides a date-only (`--when 2026-04-22`) or nothing:
- Carousel → next odd-hour slot today (or 09:00 tomorrow if past 21:00)
- Short Form → next tick today in {10,12,14,16,18,20} CEST (or 10:00 tomorrow if past 20:00)

## Arguments

| Arg | Description | Default |
|---|---|---|
| `[video path]` | Path to the video file | Newest file in LOCAL_CONTENT_FOLDER |
| `--title "..."` | Content title | Filename without extension, cleaned up |
| `--caption "..."` | Caption for the post | Prompted interactively |
| `--when "YYYY-MM-DD HH:MM"` | Scheduled datetime (local TZ). Rounded to the nearest valid slot for this content type. | Next Short Form tick today in {10,12,14,16,18,20} CEST (or 10:00 tomorrow if past 20:00) |
| `--type "..."` | Content type | `Short Form` |
| `setup` | Run first-time setup to configure Drive folder ID | — |

## Steps

### Step 0 — Load secrets

```bash
source ~/.claude/secrets.env
source ~/.zshrc 2>/dev/null
# Read ElevenLabs key from editing workflow
ELEVENLABS_API_KEY=$(grep "^ELEVENLABS_API_KEY" \
  "[EDITING_WORKFLOW_ROOT]/.env.local" \
  | cut -d'=' -f2- | tr -d '"' | tr -d "'" | xargs)
```

### Step 1 — Resolve video file

Folder structure:
```
~/Desktop/[BRAND]/Marketing/Short Form/
  └── [Video Title]/
        └── finalreadyvideo.mp4   ← always this filename
```

**If user passed a title as argument** (e.g. `/schedule-content "How to Build AI Agents"`):
- Look directly for: `~/Desktop/[BRAND]/Marketing/Short Form/How to Build AI Agents/finalreadyvideo.mp4`
- If not found: stop — "No video found at that path. Make sure the folder name matches exactly."

**If no argument**, scan for ready videos:
```bash
find ~/Desktop/[BRAND]\ Systems/Marketing/Short\ Form -maxdepth 2 -name "finalreadyvideo.mp4" 2>/dev/null
```

- If 1 result: use it automatically, confirm title to user
- If multiple results: list them numbered (showing folder names), ask "Which video?"
- If 0 results: stop — "No ready videos found. Drop your edited video at:\n  ~/Desktop/[BRAND]/Marketing/Short Form/[Video Title]/finalreadyvideo.mp4"

**Extract the FOLDER slug from path** (production name — for locating the file + naming the Drive folder ONLY, NEVER the published title):
```bash
VIDEO_PATH="/path/to/finalreadyvideo.mp4"
FOLDER_TITLE=$(dirname "$VIDEO_PATH" | xargs basename)   # e.g. "zane 2 - nowornever" — production slug, do NOT publish
FILENAME=$(basename "$VIDEO_PATH")
```
⚠️ `FOLDER_TITLE` is NOT the post title. The published `POST_TITLE` is gathered separately in Step 2.9.

### Step 2 — Get Drive access token

```bash
ACCESS_TOKEN=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=$GOOGLE_CLIENT_ID" \
  -d "client_secret=$GOOGLE_CLIENT_SECRET" \
  -d "refresh_token=$GOOGLE_REFRESH_TOKEN" \
  -d "grant_type=refresh_token" | jq -r '.access_token')
```

Verify Drive scope:
```bash
SCOPE_CHECK=$(curl -s "https://www.googleapis.com/drive/v3/files?pageSize=1" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq -r '.error.message // "OK"')
echo $SCOPE_CHECK
```

If not `OK`: stop immediately with this message:
```
Drive access not authorized yet.

Run this to re-authorize with Drive scope:
  bash ~/.claude/skills/schedule-content/reauth-drive.sh

Then paste the code it gives you back here and I'll complete the token exchange.
```

### Step 2.5 — Extract audio with ffmpeg

```bash
if ! which ffmpeg > /dev/null 2>&1; then
  echo "⚠ ffmpeg not found — skipping transcription. Caption will not be auto-generated."
  TRANSCRIPT=""
  AUDIO_TMP=""
else
  AUDIO_TMP=$(mktemp /tmp/schedule_audio_XXXXX.mp3)
  echo "Extracting audio..."
  ffmpeg -i "$VIDEO_PATH" -vn -acodec libmp3lame -q:a 4 "$AUDIO_TMP" -y -loglevel quiet
fi
```

### Step 2.6 — Transcribe with ElevenLabs Scribe v2

```bash
if [ -n "$ELEVENLABS_API_KEY" ] && [ -f "$AUDIO_TMP" ]; then
  echo "Transcribing with ElevenLabs Scribe v2..."
  TRANSCRIPT=$(curl -s -X POST "https://api.elevenlabs.io/v1/speech-to-text" \
    -H "xi-api-key: $ELEVENLABS_API_KEY" \
    -F "file=@${AUDIO_TMP};type=audio/mpeg" \
    -F "model_id=scribe_v2" \
    -F "timestamps_granularity=none" \
    -F "diarize=false" | jq -r '.text // empty')
  rm -f "$AUDIO_TMP"
fi
```

If `TRANSCRIPT` is empty or the API errors: set `TRANSCRIPT=""` and continue — do not block the upload.

### Step 2.8 — Auto-detect Video Format (the only auto-derived field)

🚨 **The auto-poster's `Extract Notion Data` node branches on two Notion properties: `Platforms` (multi_select) and `Video Format` (select). Empty `Platforms` → `needsIG`/`needsYT` all false → the row silently does NOT post (status stays Scheduled, no error). Empty `Video Format` → letterbox/routing misfires.** This was the 2026-06-01 bug. Both MUST be set. `Video Format` is auto-detected here; `Platforms` is ASKED in Step 2.9.

Probe the actual dimensions with ffprobe and map to the exact Notion option name:
```bash
DIMS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
  -of csv=p=0 "$VIDEO_PATH" 2>/dev/null)   # e.g. "1080,1920"
W=$(echo "$DIMS" | cut -d, -f1); H=$(echo "$DIMS" | cut -d, -f2)
if [ -z "$W" ] || [ -z "$H" ]; then
  VIDEO_FORMAT="Vertical (9:16)"   # safe default for Short Form if probe fails
elif [ "$W" -gt "$H" ]; then VIDEO_FORMAT="Landscape (16:9)"
elif [ "$H" -gt "$W" ]; then VIDEO_FORMAT="Vertical (9:16)"
else VIDEO_FORMAT="Square (1:1)"
fi
echo "Format: $VIDEO_FORMAT  (${W}x${H})"
```
Exact `Video Format` options: `Vertical (9:16)`, `Landscape (16:9)`, `Square (1:1)`. The node matches on `startsWith('Vertical'|'Landscape'|'Square')`.

### Step 2.9 — Gather required post metadata (ASK for anything not provided)

There are FOUR required fields. For each one [YOUR_NAME] did NOT explicitly give in his prompt, **ask him — one clear question, every single time.** Do not silently default. Use the `AskUserQuestion` tool (or plain questions) and wait for answers before proceeding. If he provided a field in the prompt, use it as-is and don't re-ask.

**1. POST_TITLE** (becomes the public YouTube title — see Rule #1). If not provided, ask:

> "What's the post title? I can either:
>  **(a)** use a title you give me now, or
>  **(b)** transcribe the video and write a viral hook title from what's actually said.
> Which one — and if (a), what's the title?"

- If he picks **(a)** → use his exact words as `POST_TITLE`, BUT first sanity-check it against the production-note pattern in Rule #1 (name+number, `x - song/app/client`, codename, take number). If it looks like a note-to-self rather than a hook, flag it: "That reads like a production note, not a post title — want to publish it as-is, or should I write a hook?" Only proceed once it's a real title.
- If he picks **(b)** → ensure `TRANSCRIPT` is populated (Steps 2.5–2.6 use ElevenLabs Scribe; if empty, run the same transcription the editing-workflow uses). Then generate 3 candidate viral hook titles from the transcript using the brief below, present them numbered, and let him pick or edit one. The chosen string is `POST_TITLE`.
- NEVER fall back to `FOLDER_TITLE`. If you cannot get a real post title, stop and ask again.

Viral-title brief (option b):
> Audience: agency owners $50K–$200K MRR, systems thinkers, been burned before.
> A scroll-stopping hook, not a description. Specific > clever. Imply a result, a system, or a contrarian take.
> ≤ 60 chars ideal for YouTube. No production slugs, no names like "zane 2".
> Good: "If you have sales calls, DO THIS" · "The system that predicts client churn"

**2. CAPTION.** If not provided, ask for it. Offer to draft one from the transcript (same brief as below) — present the draft, let him approve/edit/skip. Store as `FINAL_CAPTION`. "skip" → `FINAL_CAPTION=""`.

Caption draft brief:
> Audience: agency owners $50K–$200K MRR. Voice: direct, no fluff, like Hormozi but less aggressive.
> Hook on line 1. 2–3 short paragraphs. Optional CTA. 3–5 hashtags. Under 150 words.

**3. POST_DATE.** If not provided, ask: "When should this go out? (date + time, or 'now')". Apply the slot rules above. 'now' → schedule + fire the `--now` webhook. Store as the ISO `UPLOAD_DATE` with timezone offset.

**4. PLATFORMS.** If not provided, ask which platforms. Exact multi_select option names: `Instagram`, `Facebook`, `YouTube Shorts`, `YouTube`, `TikTok`, `Threads`, `LinkedIn`. (Vertical typically `Instagram`; landscape typically `YouTube`.) Store as `PLATFORMS_JSON`, e.g. `[{"name":"Instagram"}]` — MUST be non-empty.

### Step 3 — Confirm metadata

Show a summary before uploading. Do not proceed until confirmed.

```
Ready to schedule:

  File:          [filename]  ([file size])
  Folder slug:   [FOLDER_TITLE]   ← production only, NOT published
  Post title:    [POST_TITLE]     ← this is the public YouTube title
  Upload date:   [UPLOAD_DATE]
  Type:          Short Form
  Video format:  [VIDEO_FORMAT]   (auto-detected)
  Platforms:     [PLATFORMS]      ← must be non-empty or it won't post

  Caption:
  ─────────────────────────────────────
  [FINAL_CAPTION or "(none)"]
  ─────────────────────────────────────

  Drive folder:  2. Short Form → [date] - [FOLDER_TITLE]

Confirm to schedule (or tell me what to change):
```

Only `POST_TITLE` is written to the Notion `Title` property. `FOLDER_TITLE` is never published.

### Step 4 — Create dated folder in Drive

```bash
FOLDER_NAME="$(date +%Y-%m-%d) - $FOLDER_TITLE"   # Drive backup folder uses the production slug — fine here

FOLDER_ID=$(curl -s -X POST "https://www.googleapis.com/drive/v3/files" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$FOLDER_NAME\",
    \"mimeType\": \"application/vnd.google-apps.folder\",
    \"parents\": [\"$GDRIVE_PARENT_FOLDER_ID\"]
  }" | jq -r '.id')
```

If `FOLDER_ID` is null or empty: stop with the API error message.

### Step 5 — Upload video (resumable upload)

Detect MIME type from extension:
- `.mp4` → `video/mp4`
- `.mov` → `video/quicktime`
- `.webm` → `video/webm`
- `.avi` → `video/x-msvideo`
- other → `video/mp4`

Tell the user: "Uploading [filename]... (this may take 30–90s)"

**Step 5a — Get file size and initiate resumable session:**
```bash
FILE_SIZE=$(stat -f%z "$VIDEO_PATH")

UPLOAD_URL=$(curl -s -i -X POST \
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Upload-Content-Type: $MIME_TYPE" \
  -H "X-Upload-Content-Length: $FILE_SIZE" \
  -d "{\"name\": \"$FILENAME\", \"parents\": [\"$FOLDER_ID\"]}" \
  | grep -i "^location:" | awk '{print $2}' | tr -d '\r\n')
```

If `UPLOAD_URL` is empty: stop — print the response error, do NOT proceed. Print the Drive folder ID so user can clean up.

**Step 5b — Upload the file:**
```bash
FILE_ID=$(curl -s -X PUT "$UPLOAD_URL" \
  -H "Content-Type: $MIME_TYPE" \
  -H "Content-Length: $FILE_SIZE" \
  --data-binary "@$VIDEO_PATH" | jq -r '.id')
```

If `FILE_ID` is null or empty: stop — print the raw response. Do NOT proceed to Notion. Print the Drive folder URL so user can clean up manually.

### Step 6 — Set sharing + get shareable link

```bash
# Set anyone-with-link can view
curl -s -X POST "https://www.googleapis.com/drive/v3/files/$FILE_ID/permissions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "anyone", "role": "reader"}' > /dev/null

# Get shareable link
SHARE_LINK=$(curl -s \
  "https://www.googleapis.com/drive/v3/files/$FILE_ID?fields=webViewLink,webContentLink" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | jq -r '.webViewLink')
```

### Step 7 — Sync to Notion

**Search for existing page by title** (case-insensitive partial match on the post title):
```bash
curl -s -X POST "https://api.notion.com/v1/data_sources/[NOTION_CPP_DATA_SOURCE_ID]/query" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d "{
    \"filter\": {
      \"property\": \"Title\",
      \"title\": {\"contains\": \"$POST_TITLE\"}
    },
    \"page_size\": 5
  }"
```

If 1 match found: update that page (PATCH).
If multiple matches: list them and ask which to update, or create new.
If 0 matches: create new page.

**Properties to set in both cases** (`Platforms` and `Video Format` are REQUIRED — see Step 2.8):
```json
{
  "Status": {"status": {"name": "Scheduled"}},
  "Upload Date": {"date": {"start": "YYYY-MM-DDTHH:MM:SS+02:00"}},
  "Final Video (drive)": {"url": "SHARE_LINK"},
  "Type": {"select": {"name": "Short Form"}},
  "Platforms": {"multi_select": PLATFORMS_JSON},
  "Video Format": {"select": {"name": "VIDEO_FORMAT"}}
}
```

For a **new page**, `$PROPERTIES_JSON_WITH_TITLE` adds the title using `POST_TITLE` (NEVER `FOLDER_TITLE`):
```json
"Title": {"title": [{"text": {"content": "POST_TITLE"}}]}
```

`Platforms` MUST be non-empty or the auto-poster silently no-ops. `Video Format` must be one of `Vertical (9:16)` / `Landscape (16:9)` / `Square (1:1)`.
`Upload Date.start` MUST include the time component and timezone offset. The Short Form auto-poster cron fires at `8,10,12,14,16,18` **UTC** (= 10,12,14,16,18,20 CEST summer) and filters rows where `Upload Date <= now`, so set the exact slot you want — the last daily tick is 20:00 CEST.
Add `"Caption"` only if the user provided one:
```json
"Caption": {"rich_text": [{"type": "text", "text": {"content": "CAPTION_TEXT"}}]}
```

**PATCH existing page:**
```bash
curl -s -X PATCH "https://api.notion.com/v1/pages/$PAGE_ID" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d "$PROPERTIES_JSON"
```

**POST new page:**
```bash
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d "{
    \"parent\": {\"database_id\": \"[NOTION_CPP_DB_ID]\"},
    \"properties\": $PROPERTIES_JSON_WITH_TITLE
  }"
```

If Notion call fails: report the error AND print the Drive share link so nothing is lost.

### Step 8 — Confirm output

```
Scheduled: [POST_TITLE]

  Drive folder:   https://drive.google.com/drive/folders/[FOLDER_ID]
  Video link:     [SHARE_LINK]
  Notion page:    [NOTION_PAGE_URL]

  Post title:     [POST_TITLE]   (published — never the folder slug)
  Upload date:    [UPLOAD_DATE]
  Platforms:      [PLATFORMS]
  Caption:        "[FINAL_CAPTION]" (or "— not set")

Auto-poster will pick this up. Local file untouched.
```

## Rules

- Never delete the local file — the user manages that
- If Drive upload fails, do NOT write to Notion. Report error + Drive folder URL so user can clean up
- If Notion fails after a successful upload, report the Drive link in full so it's not lost
- Title-match in Notion is fuzzy — if ambiguous, show options and ask, never guess
- Default type is always `Short Form` unless explicitly overridden
- The `--date` flag sets Upload Date in Notion, not a publish schedule — the auto-poster handles actual timing

---

## 🚨 Video carousels — two incidents, two hard rules (2026-09-08)

1. **MP4 slides posted as still images.** A row with six MP4s in `Carousel Images` was picked up while the poster's carousel branch was image-only (`media_type: IMAGE`, `.png` S3 keys). Instagram rendered a frozen frame on every slide. [YOUR_NAME] deleted the post. The unified poster `[N8N_WF_AUTOPOSTER_ID]` now handles VIDEO children (real extension on S3, `VIDEO` + `video_url`, per-child FINISHED polling), but the rule stands: **before scheduling any media type the poster hasn't posted before, read the live workflow's node bodies and confirm the path exists. If it doesn't, the row stays on `To Review`, never `Ready`.** Warning in chat is not enough; set the row back yourself.
2. **Black Instagram thumbnail.** Instagram uses frame 0 of the first video slide as the carousel cover in the grid and there is no API way to change it (and video carousels can't be hidden from the grid). Slide 1 started on a fade from black, so the profile tile was solid black. **Gate before every video-carousel schedule: extract frame 0 of `slide_1.mp4` with ffmpeg and look at it. If it is black or empty, do not schedule.** The notebook style solves this with headline visible at frame 0 plus a blurred teaser of the finished drawing (`"teaser": true`), see `carousel-generator/references/notebook-style.md`.

```bash
ffmpeg -v error -y -i "$DIR/slide_1.mp4" -frames:v 1 /tmp/cover_check.png   # then Read it; must not be black
```

# Carousel Flow (Instagram)

> **2026-09-08 update.** Carousels are posted by the unified auto-poster `[N8N_WF_AUTOPOSTER_ID]` (Type=`Carousel`, Status=`Ready`, `Carousel Images` files, `Platforms` set). The dedicated carousel workflow `[N8N_WF_AUTOPOSTER_ID]` below is INACTIVE. Use `/webhook/shortform-now` with `{"pageId"}` for post-now. Video slides (MP4 in `Carousel Images`, uploaded with `content_type: video/mp4`) are supported since 2026-09-08: the branch creates VIDEO child containers and waits for each to finish. Before that date MP4s posted as still frames (incident, post deleted). Details: `carousel-generator/references/notebook-style.md` § Posting.


For Instagram carousels generated by the `carousel-generator` skill. The n8n workflow `C: Auto-Poster - Carousels` (ID `[N8N_WF_AUTOPOSTER_ID]`) handles actual posting — it triggers daily at 3PM for any row with `Type=IG Carousel`, `Status=Scheduled`, `Upload Date=today`, AND it exposes a webhook at `/webhook/carousel-now` for "post now".

## Carousel arguments

| Arg | Description | Default |
|---|---|---|
| `[carousel folder]` | Folder containing `slide_1.png`, `slide_2.png`, etc. | Newest folder in LOCAL_CAROUSEL_FOLDER with `slides/` subfolder |
| `--title "..."` | Post title (shown in Notion only) | Derived from folder slug |
| `--caption "..."` | Instagram caption | Prompted |
| `--when "YYYY-MM-DD HH:MM"` | Scheduled datetime (local TZ). Must include time. Cron slots for carousels: 09, 13, 17, 21. | Next odd-hour slot today, or 09:00 tomorrow if past 21:00 |
| `--now` | Skip schedule and fire webhook immediately after Notion row is created | Off (waits for next cron slot) |

## Carousel steps

### C1 — Locate the carousel folder

Expected structure (produced by `carousel-generator` skill):
```
[CONTENT_ROOT]/Carousels/[slug]/
  ├── carousel.html
  └── slides/
        ├── slide_1.png
        ├── slide_2.png
        └── slide_3.png (up to 10)
```

If the user passes a folder path, look inside for a `slides/` subfolder. If the user passes the `slides/` folder directly, use it.

Collect image paths sorted: `find "$FOLDER" -maxdepth 1 -name 'slide_*.png' | sort -V`.

**Validate**: 2 ≤ count ≤ 10. Instagram carousels require minimum 2 images and maximum 10.

### C2 — Check for NOTION_TOKEN

```bash
test -n "$NOTION_TOKEN" || { echo "NOTION_TOKEN not set"; exit 1; }
```

### C3 — Upload each PNG to Notion via file_upload API (two-step)

For each slide, do this twice: **(a)** create the upload, **(b)** send the file bytes.

```bash
upload_to_notion() {
  local file="$1"
  local filename=$(basename "$file")
  # (a) create upload
  local create_resp
  create_resp=$(curl -s -X POST "https://api.notion.com/v1/file_uploads" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: 2025-09-03" \
    -H "Content-Type: application/json" \
    -d "{\"filename\": \"$filename\", \"content_type\": \"image/png\"}")
  local upload_id upload_url
  upload_id=$(echo "$create_resp" | jq -r '.id')
  upload_url=$(echo "$create_resp" | jq -r '.upload_url')
  [[ "$upload_id" == "null" || -z "$upload_id" ]] && { echo "FAIL creating upload: $create_resp" >&2; return 1; }
  # (b) send file bytes (multipart/form-data)
  local send_resp upload_state
  send_resp=$(curl -s -X POST "$upload_url" \
    -H "Authorization: Bearer $NOTION_TOKEN" \
    -H "Notion-Version: 2025-09-03" \
    -F "file=@${file};type=image/png")
  upload_state=$(echo "$send_resp" | jq -r '.status // "?"')
  [[ "$upload_state" != "uploaded" ]] && { echo "FAIL sending file ($upload_state): $send_resp" >&2; return 1; }
  echo "$upload_id"
}
```

Collect IDs into an array. If any upload fails, abort before creating the Notion row (don't leave a half-built row).

### C4 — Verify the `Carousel Images` property exists on the data source

```bash
curl -s "https://api.notion.com/v1/data_sources/[NOTION_CPP_DATA_SOURCE_ID]" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" \
  | jq '.properties | keys | map(select(. == "Carousel Images")) | length'
```

If `0`: add it once:
```bash
curl -s -X PATCH "https://api.notion.com/v1/data_sources/[NOTION_CPP_DATA_SOURCE_ID]" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Carousel Images": {"files": {}}}}'
```

The `Type` select must have option `IG Carousel`. If it doesn't, add it via PATCH.

### C5 — Create the Notion page

Build the properties JSON. Each uploaded image becomes an entry in the `Carousel Images` files array:

```jsonc
{
  "parent": {"data_source_id": "[NOTION_CPP_DATA_SOURCE_ID]"},
  "properties": {
    "Title": {"title": [{"text": {"content": "<TITLE>"}}]},
    "Status": {"status": {"name": "Scheduled"}},
    "Type": {"select": {"name": "IG Carousel"}},
    "Upload Date": {"date": {"start": "<YYYY-MM-DDTHH:MM:SS+02:00>"}},
    "Caption": {"rich_text": [{"text": {"content": "<CAPTION>"}}]},
    "Carousel Images": {"files": [
      {"type": "file_upload", "file_upload": {"id": "<ID1>"}, "name": "slide_1.png"},
      {"type": "file_upload", "file_upload": {"id": "<ID2>"}, "name": "slide_2.png"}
    ]}
  }
}
```

`Upload Date.start` MUST include the time and timezone offset. For carousels, use one of the odd-hour slots (`09:00`, `13:00`, `17:00`, `21:00`) in [TIMEZONE] time. Example for April 22, 2026 at 13:00 local: `"2026-04-22T13:00:00+02:00"` (summer) or `"+01:00"` (winter).

POST to `https://api.notion.com/v1/pages`. Capture the returned `.id` and `.url` for the confirmation.

### C5.5 — Flip the carousel folder Finder color to Green

When `/yt-carousel` (or any pre-scheduling skill) creates a carousel folder, it tags the folder **Yellow** (label index 3) to mark "pending review". Once the Notion row is confirmed created, flip it to **Green** (label index 6) so [YOUR_NAME] can see at a glance which carousels are scheduled.

```bash
# Only run if the folder is somewhere under the Carousels root
if [[ "$CAROUSEL_FOLDER" == "[CONTENT_ROOT]/Carousels/"* ]]; then
  osascript -e "tell application \"Finder\" to set label index of (POSIX file \"$CAROUSEL_FOLDER\" as alias) to 6" >/dev/null 2>&1 || true
fi
```

Non-fatal — if osascript fails (Finder locked, no scripting access, etc.), continue. Don't block scheduling on a UI hint.

### C6 — Fire the webhook if `--now`

```bash
if [[ "$POST_NOW" == "1" ]]; then
  curl -s -X POST "https://[N8N_HOST]/webhook/carousel-now" \
    -H "Content-Type: application/json" \
    -d "{\"pageId\": \"$PAGE_ID\"}"
fi
```

A 200 response with `{"message":"Workflow was started"}` means it triggered. The n8n workflow will download images, upload them to S3, create child containers, create the carousel container, publish to Instagram, update Notion status, and ping Slack. The whole thing takes ~30–60 seconds.

### C7 — Confirm output

```
Scheduled carousel: [TITLE]

  Folder:         [carousel folder path]
  Image count:    N
  Upload date:    [DATE] (or "NOW" if --now)
  Caption:        "[first 80 chars of caption]…"

  Notion page:    [NOTION_PAGE_URL]

  [If --now]
  Webhook fired.  Check executions at:
  https://[N8N_HOST]/workflow/[N8N_WF_AUTOPOSTER_ID]
  Post should appear on @[IG_HANDLE] in ~30–60 seconds.

  [If not --now]
  Daily 3PM trigger will pick this up on [DATE].
```

## Carousel rules

- Never upload fewer than 2 or more than 10 images — Instagram's carousel API enforces this
- If any image upload fails, abort BEFORE creating the Notion row — don't leave half-finished data
- The carousel-generator skill produces PNGs at 1080×1350 (4:5). If the user hands you different dimensions, warn but don't refuse
- `--now` only fires the webhook AFTER the Notion row is confirmed created
- If the webhook returns non-200, tell the user and hand them the page ID so they can retry manually:
  ```
  curl -X POST https://[N8N_HOST]/webhook/carousel-now \
    -H "Content-Type: application/json" -d '{"pageId":"<PAGE_ID>"}'
  ```

## Known gotchas (from first working run on 2026-04-18)

- The `Meta Graph API (Instagram)` credential in n8n expires every 60 days unless created as a **System User** token (never-expires). Always use System User tokens.
- The Notion HTTP write nodes in n8n use a dedicated [BRAND] credential called `Notion API — [BRAND] Content Pipeline` (ID `[N8N_CRED_NOTION_HEADER_ID]`). The native Notion reads use `[Notion integration]` (ID `[N8N_CRED_NOTION_ID]`). Never use credential `e58D9sNo0VAOgOy2` ("[CLIENT] OpenAI API key") — that's a client credential.
- Instagram carousel API requires `media_type=IMAGE` on each child container (not obvious from docs).
- n8n Code nodes default to "Run Once for All Items" — for per-image processing you must set mode to `runOnceForEachItem`.
