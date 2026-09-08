# Content System

A complete, Claude Code–driven content operation for a personal brand: plan in Notion, create locally with skills (video editing, carousels, motion reels, stories, YouTube packaging), auto-post to Instagram and YouTube with n8n, capture leads from comments, and sync performance back to Notion.

Everything in this repo is templated. No credentials, no personal data. You clone it, run `setup/configure.sh`, connect your own accounts, and the whole system is yours.

```
Ideas ──► Notion "Content Production Pipeline" ──► create locally (Claude Code skills)
                    │                                       │
                    │  Status = Ready + Upload Date          ▼
                    └──────────────► n8n Auto-Poster ──► Instagram / YouTube / Stories
                                          │
                     IG comment keyword ──► n8n Comment→DM ──► CRM DM + landing page
                                          │
                     daily sync ◄─────────┘  IG / YT metrics ──► Notion "My Content" DBs
```

## What's inside

| Folder | What | Read |
|---|---|---|
| `SETUP.md` | **Start here.** Ordered, end-to-end setup guide (Notion → accounts → n8n → local tools → skills → first post) | |
| `docs/` | Deep dives: architecture, Notion schema, every n8n workflow, Meta/YouTube/storage setup, comment-to-DM, editing engine, skills, security | |
| `notion/` | Database schemas (JSON) + `create-databases.py` + the copy-paste Claude prompt to rebuild the pipeline in your workspace | [notion/README.md](notion/README.md) |
| `n8n/workflows/` | 8 templated n8n workflow exports (credentials stripped, ids as placeholders) | [n8n/README.md](n8n/README.md) |
| `skills/` | 12 Claude Code skills: editing, carousel-generator, carousel-batch, motion-reel-carousel, motion-carousel, yt-carousel, youtube-packaging, thumbnail-prompter, schedule-content, shortform-content, longform-content, fathom-content-ideas | [docs/skills.md](docs/skills.md) |
| `editing-workflow/` | The local video editing engine (TypeScript + Python + Remotion + ffmpeg): transcribe, cut silences, b-roll, subtitles in 12 styles, music, finalize | [docs/editing-workflow.md](docs/editing-workflow.md) |
| `workspace-template/` | The Marketing folder skeleton with CLAUDE.md rule files per format, the Stories render kit (4 native-IG styles + HTML→PNG renderer), photo-library and ICP templates | |
| `setup/` | `configure.sh` fills every `[PLACEHOLDER]`; `check-secrets.sh` scans before you commit | |

## Requirements

- macOS (the editing engine uses Apple Vision for person masks; everything else is cross-platform)
- Claude Code (Max plan recommended: the editing engine bills model calls through the CLI, not the API)
- Node 20+, Python 3.10+, ffmpeg, Playwright (`pip install playwright && playwright install chromium`)
- Notion workspace · an n8n instance (self-hosted or cloud, HTTPS) · Instagram professional account linked to a Facebook Page · a Meta developer app · a Google Cloud project (YouTube Data + Analytics APIs) · S3-compatible bucket with public read (Cloudflare R2 works) · Slack (optional) · GoHighLevel (only for the comment-to-DM leg; swappable)

## Quick start

```bash
git clone <this repo> content-system && cd content-system
./setup/configure.sh          # answers become the values of every [PLACEHOLDER]
```
Then follow `SETUP.md` top to bottom. Budget half a day for accounts and API access, one hour for the rest.

## Placeholders

Every value you must supply is written as `[UPPER_SNAKE_CASE]`. `docs/placeholders.md` lists all of them with where they come from. `setup/configure.sh` replaces them in one go; anything you leave blank stays a placeholder so you can fill it later.

## Security

Nothing in this repo should ever contain a token. `.env*`, cutout photos, profile pictures, and media are git-ignored. Run `./setup/check-secrets.sh` before every push (or install it as a pre-commit hook). See `docs/security.md`.
