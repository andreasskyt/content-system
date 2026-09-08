# Notion — rebuild the Content Production Pipeline

Two ways. Both end with the manual steps the API cannot do (Status options, views, templates).

## A. Script (fastest)

```bash
export NOTION_TOKEN=ntn_...
python3 notion/create-databases.py <parent_page_id>
```
Prints the 4 database ids + data source ids. Then do the manual steps in [../docs/notion-schema.md](../docs/notion-schema.md).

## B. Copy-paste prompt for Claude Code (Notion MCP)

Prerequisite: the Notion MCP connected, or an integration token exported as `NOTION_TOKEN`. Paste everything between the lines:

---8<------------------------------------------------------------------

Build my Content Production Pipeline in Notion under the parent page I give you. It is the single scheduling and production hub for ALL my content (reels, carousels, long-form YouTube, stories, LinkedIn). An n8n autoposter will read it on a schedule and publish whatever is due, so property names must match exactly.

Use the schema files in `notion/*.schema.json` of my content-system repo as the source of truth (properties, types, select options with colours). Create four databases: **Content Production Pipeline**, **IG My Content** (relation "Content Piece" → CPP), **YT My Content** (relation "Content Piece" → CPP), **Comments to DM Config**. Create everything the API supports first.

Then walk me through the manual steps one at a time, waiting for my confirmation after each:

1. **Status property** on the CPP: To-do group `Idea` (gray) · In progress `Scripting` (blue), `Recording` (orange), `Editing` (purple), `To Review` (pink), `Ready` (yellow) · Complete `Posted` (green). Delete Notion's default options.
2. **Views** on the CPP: "Grouped Pipeline" (board by Status, show empty groups; cards show Title, Upload Date, Video Format, Platforms) · "All by Status" (board by Status; Title, Upload Date, Platforms, Type) · "Schedule Calendar" (calendar by Upload Date, Title only).
3. **Page templates** on the CPP: "Instagram" (Type default Short Form; callout "Big Idea"; toggle Script with Hooks 1) 2) 3), Build-Up, BODY, CTA; toggle Editing with B-ROLL Type and VISUAL STYLE) and "YouTube" (Type default Long Form; Script with Hook, Intro, Build-Up, Value, CTA; same Editing toggle).
4. **Callout at the top of the CPP page** with the autoposter contract: a row is auto-published when Status = Ready · Upload Date is in the past · Type set · Caption filled · Platforms selected · media attached (Final Video (drive) for video, Carousel Images for carousels, Stories Media for stories). The autoposter runs every 2 hours 8:00–18:00, ticks Posted on IG/FB/YT and sets Status to Posted. Nothing is posted manually.

Finish by creating 2 sample rows (Status=Idea) and printing every database id and data source id. I need them for `setup/configure.sh`.

---8<------------------------------------------------------------------

## Uploading media programmatically

Files attached through Notion MCP integrations are NOT visible to the public API (n8n sees `files: []`). Always use the File Upload API:

```bash
# 1. create upload
curl -s -X POST https://api.notion.com/v1/file_uploads -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28" -H "Content-Type: application/json" -d '{"filename":"slide_1.png","content_type":"image/png"}'
# 2. send bytes to the returned id
curl -s -X POST "https://api.notion.com/v1/file_uploads/<id>/send" -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28" -F "file=@slide_1.png"
# 3. attach to the page property
curl -s -X PATCH https://api.notion.com/v1/pages/<page_id> -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2022-06-28" -H "Content-Type: application/json" -d '{"properties":{"Carousel Images":{"files":[{"type":"file_upload","file_upload":{"id":"<id>"},"name":"slide_1.png"}]}}}'
```
`/schedule-content` does exactly this.
