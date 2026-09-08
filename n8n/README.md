# n8n workflow exports

Templated exports. Import order: create credentials → `01` → `02` → (optional) `03`–`08`. Details per workflow, node flows, and the testing checklist: [../docs/n8n-workflows.md](../docs/n8n-workflows.md).

After import, in every workflow:
1. Fix the red credential warnings (each node lists the expected credential type in its name, e.g. `[Meta Graph API — System User token (Header Auth…)]`).
2. Open **SET Variables** and replace every `[PLACEHOLDER]`.
3. Settings → Error workflow → pick yours.
4. Save, note the workflow id from the URL, activate.

Files:

| File | Name inside n8n |
|---|---|
| `01-auto-poster-unified.json` | 1. Auto-Poster (Unified — Carousels + Video) |
| `02-story-auto-poster.json` | 2. Story Auto-Poster |
| `03-ig-comment-to-dm.json` | IG Comment → DM (config-driven) |
| `04-youtube-to-notion-sync.json` | YouTube → Notion Sync (Metrics + Transcripts) |
| `05-instagram-to-notion-sync.json` | Instagram → Notion Sync |
| `06-yt-research-agent.json` | YT Research Agent (Notion) |
| `07-ig-research-agent.json` | Instagram Research Agent |
| `08-yt-channel-growth-tracking.json` | YT Channel Growth Tracking |

Re-exporting your own changes back into this repo: Download from n8n, run `./setup/check-secrets.sh`, and search the JSON for your ids before committing; replace them with the same placeholder names so the file stays shareable.
