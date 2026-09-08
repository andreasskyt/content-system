# Notion schema

Four databases. JSON schemas in `notion/*.schema.json` (what `create-databases.py` builds). Property names matter: the n8n workflows read them verbatim.

Recommended layout in Notion:

```
MARKETING (parent page, shared with the integration)
├── Content Production Pipeline      ← the only DB the autoposters read
├── Comments to DM Config
└── Content Engine (page)
    ├── IG My Content                ← analytics log, written by the autoposter + IG sync
    └── YT My Content                ← analytics log, written by the autoposter + YT sync
```

---

## 1. Content Production Pipeline (CPP)

| Property | Type | Options / notes |
|---|---|---|
| Title | title | |
| Type | select | Short Form (purple) · Carousel (purple) · Long Form (red) · Story (purple) · LinkedIn (blue) · Newsletter (gray) · Ads (green) |
| Status | status | **To-do:** Idea (gray) · **In progress:** Scripting (blue), Recording (orange), Editing (purple), To Review (pink), Ready (yellow) · **Complete:** Posted (green) |
| Upload Date | date | date + time. Display format `MMM d`, time `H:mm`. **This is the scheduled publish time.** |
| Recording Date | date | |
| Platforms | multi_select | Instagram (purple) · Facebook (blue) · YouTube Shorts (red) · YouTube (red) · TikTok (default) · Threads (gray) · LinkedIn (blue) |
| Content Goal | multi_select | Views / Virality (gray) · Engagement (Likes & Shares) (orange) · Profile Traffic / Followers (default) · Retention / Watch Time (pink) · Leads (Comment / DM) (blue) · Community Members (yellow) |
| Funnel Stage | select | ToFu - Problem Aware (green) · MoFu - Solution Aware (yellow) · BoFu - Converting (red) |
| Video Format | select | Vertical (9:16) (yellow) · Landscape (16:9) (purple) · Square (1:1) (red) |
| Include CTA? | checkbox | |
| Caption | rich_text | posted verbatim as IG caption / YT description |
| YouTube Title | rich_text | used for YT uploads; falls back to Title |
| Final Video (drive) | url | Google Drive share link of the finished video |
| Raw Footage (drive link) | url | |
| Frame.io link | url | |
| Inspiration 1 | url | |
| Thumbnail URL | url | |
| Thumbnail | files | |
| Carousel Images | files | ordered PNGs; uploaded via File Upload API |
| Stories Media | files | ordered frames for Type=Story |
| Posted on IG / Posted on FB / Posted on YT | checkbox | ticked by the autoposter |
| Instagram Post | relation → IG My Content | created automatically by the relation on IG My Content |
| YouTube Post | relation → YT My Content | same |
| Created time / Page last edited time / Page last edited by | system | |

### Views (create in the UI)

1. **Grouped Pipeline** — Board, grouped by Status (ascending, show empty groups). Card properties: Title, Upload Date, Video Format, Platforms.
2. **All by Status** — Board, grouped by Status. Card properties: Title, Upload Date, Platforms, Type. (Alternative: a Table grouped by Status showing every property.)
3. **Schedule Calendar** — Calendar by Upload Date, shows Title only.

### Page templates (New → template dropdown)

**Instagram** (default Type: Short Form)
```
[callout] "Big Idea" description:
# Script  (toggle)
  ## Hooks:   ### 1)  ### 2)  ### 3)
  ## Build-Up:
  ## BODY:
  ## CTA:
# Editing  (toggle)
  ### B-ROLL   Type:
  ### VISUAL STYLE   > See Inspiration Reels
```
**YouTube** (default Type: Long Form) — same, with Script sections `Hook / Intro / Build-Up / Value / CTA`.

### The autoposter contract (put this as a callout at the top of the DB page)

A row is auto-published when ALL are true: `Status = Ready` · `Upload Date` in the past · `Type` set · `Caption` filled · `Platforms` selected · media attached (`Final Video (drive)` for video, `Carousel Images` for carousels, `Stories Media` for stories). The autoposter runs 8/10/12/14/16/18, publishes what's due, ticks `Posted on …`, flips Status to `Posted`. Nothing is posted manually.

---

## 2. IG My Content (analytics log)

| Property | Type | Notes |
|---|---|---|
| Caption | title | |
| URL | url | permalink |
| Post ID | rich_text | IG media id (sync key) |
| Container ID | rich_text | |
| Post Date | date | |
| Views · Reach · Likes · Comments · Shares · Saves | number | filled by `05-instagram-to-notion-sync` |
| Engagement Rate | formula | `prop("Likes")/prop("Views")` |
| Thumbnail URL | url | |
| Transcript | rich_text | |
| Has Transcript | checkbox | |
| Hook Analysis | rich_text | |
| Target Audience · Funnel Stage | select (empty options) | |
| Include CTA? | checkbox | |
| Content Piece | relation → CPP | |
| Last Updated | last_edited_time | |

Views: default Table (all properties) · Gallery "Board" (page cover) · Chart views: Views, Reach, Likes, Comments (column chart, name = Caption).

## 3. YT My Content

| Property | Type | Notes |
|---|---|---|
| Caption | title | video title |
| URL | url | |
| Video ID | rich_text | sync key |
| Post Date | date | |
| Views · Likes · Comments · Subscribers Gained | number | |
| Watch Time | number | minutes (decimal) |
| Watch Time (formatted) | formula | `format(floor(prop("Watch Time")) + ":" + format(round((prop("Watch Time") - floor(prop("Watch Time"))) * 60)).padStart(2, "0"))` |
| Engagement Rate | formula | `prop("Likes")/prop("Views")` |
| Thumbnail URL | url | |
| Summary · Hook Analysis | rich_text | |
| Has Transcript | checkbox | transcript body appended as page blocks by `04-youtube-to-notion-sync` |
| Content Piece | relation → CPP | |

## 4. Comments to DM Config

| Property | Type | Notes |
|---|---|---|
| Keyword | title | UPPERCASE, one word, ≤7 chars, never reused |
| DM Text | rich_text | `{{link}}` is replaced with `https://[WEBSITE_DOMAIN]/{Landing Slug}?utm_source=ig&utm_medium=dm&utm_campaign={Landing Slug}` |
| Landing Slug | rich_text | |
| Lead Magnet | rich_text | human-readable name stored on the CRM contact |
| Comment Reply | rich_text | public reply posted under the comment after the DM is confirmed sent |
| Active | checkbox | only active rows match |

One row per keyword/lead magnet. n8n reads it live on every comment. Landing page must exist BEFORE the keyword is used in a post.

---

## Optional research DBs (only for workflows 06/07)

Create as plain databases with a Title + the properties the workflow's "Create page" nodes set (open the node in n8n after import to see the exact list): YT Niche Outliers, YT Broad Niche Outliers, YT Comments Data, YT Daily Niche, YT Research Reports, YT Competitor List (Title = channel URL) · IG Research Reports, IG My Reels, IG Competitor Reels, IG Competitor List (Title = username, checkbox `Active`).

---

## Gotchas

- **Status options can't be set via API.** Create the DB, then edit Status in the UI. Delete Notion's defaults (Not started / In progress / Done).
- **Files attached via a Notion MCP integration are invisible to the public API** (n8n sees `files: []`). Upload with the File Upload API: `POST /v1/file_uploads` → multipart PUT to `upload_url` → PATCH the page's files property with `{type:"file_upload", file_upload:{id}}`. `/schedule-content` does this.
- Notion API version `2022-06-28` works for everything here. The data source id (needed by the `2025-09-03` API) is printed by `create-databases.py` or visible via `GET /v1/databases/{id}` on the newer version.
- Share every database with the integration, or queries return 404.
