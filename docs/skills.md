# Skills

Copy `skills/*` to `~/.claude/skills/`. Each folder has a `SKILL.md` (the instructions Claude follows) plus `references/`, `scripts/`, `assets/`, `templates/`. Placeholders inside are filled by `setup/configure.sh`.

| Skill | Trigger | Does | Depends on |
|---|---|---|---|
| **editing** | `/editing <instructions> <video>` | Dispatcher for the editing engine. Canonical order, one output file, thumbnail for reels. | `editing-workflow/`, ffmpeg, ElevenLabs or local whisper |
| **carousel-generator** | `/carousel-generator` | One on-brand 1080×1350 carousel: copy → HTML template → Playwright PNGs. Two styles: real photo + text overlay, or coded branded slides. Scripts to pull a YouTube transcript/metadata as source. | Playwright, `_photo-library`, `assets/profile.png` |
| **carousel-batch** | `/carousel-batch` | A month of carousels in four gated phases: ideas → scripts → styles → generate. Copy locked before rendering. `scripts/batch.py`. | carousel-generator |
| **yt-carousel** | `/yt-carousel <youtube url>` | Carousel derived from one of your YouTube videos, with a comment-keyword CTA; keeps `used_keywords.json` so keywords never repeat. | carousel-generator, Comments to DM Config |
| **motion-reel-carousel** | `/motion-reel-carousel` | Turns a carousel into an animated 9:16 reel (HTML/CSS motion, Playwright frame capture, ffmpeg). Archetypes + motion principles in `references/`. | Playwright, ffmpeg |
| **motion-carousel** | `/motion-carousel` | Remotion-based version with richer slide components (`remotion/src/slides`). `scripts/install_remotion.sh`. | Node, Remotion |
| **youtube-packaging** | `/youtube-packaging <transcript>` | 5 titles + description with chapters + tags + 5 coded thumbnails (HTML → headless Chromium, real cut-out photos). Also the mandatory publish gate. | Playwright, `Thumbnails/_cutouts` + `assets/cutouts-index.json`, fonts in `assets/fonts` |
| **thumbnail-prompter** | `/thumbnail-prompter` | Writes image-generation prompts for thumbnails (Pikzels, Nano Banana, GPT-Image, Midjourney). Prompts only. | none |
| **schedule-content** | `/schedule-content` | The bridge to Notion: uploads media (File Upload API / Google Drive), fills Caption/Platforms/Upload Date, sets Status=Ready, picks the next slot, can fire the instant-post webhook. `reauth-drive.sh` for Google OAuth. | `NOTION_TOKEN`, Google OAuth (Drive), n8n webhooks |
| **shortform-content** | `/shortform-content` | Reels/Shorts strategy + scripts (hook, problem, value, proof, CTA), pushes to CPP. | Notion |
| **longform-content** | `/longform-content` | YouTube topic architecture, outlines, full scripts, metadata. | Notion |
| **fathom-content-ideas** | `/fathom-content-ideas <fathom urls>` | Mines call transcripts for pains, objections, verbatim quotes → format-tagged content ideas. | Fathom API key (`FATHOM_API_KEY`) |

## Format rule files (not skills, but read automatically)

`workspace-template/*/CLAUDE.md`: Marketing-wide rules, Reels, YouTube, Stories, `Reels/reels_from_youtube` (clipping long-form into reels). Plus `Reels/_reference-reel-templates.md`, `YouTube/_reference-youtube-formula.md`.

## Stories kit (`workspace-template/Stories/styles/`)

Four style sheets replicating native Instagram text (Classic pills, plain Classic, serif proof, YouTube promo), `base.css`, and `render.py` (HTML 540×960 → 1080×1920 PNG via Playwright). Workflow and hard rules in `Stories/CLAUDE.md`. Stories are scheduled in the CPP as `Type=Story` and posted by workflow 02.

## Things to personalise after install

- Brand references: `carousel-generator/references/brand.md`, `carousel-batch/references/brand2.md`, `photo-style.md`, `brand-website.md`, `niksetting_brand.md` (an analysed third-party editorial style, kept as an alternative look), `motion-*/references/brand.md`.
- `youtube-packaging/references/strategy.md`, `titles.md`, `thumbnail-craft.md`: general craft, keep.
- `yt-carousel/used_keywords.json` starts empty.
- Any skill that says "read `TONE-OF-VOICE.md`" expects that file in `[CONTENT_ROOT]`.

## Not included on purpose

Skills that were tied to the original owner's CRM, ads accounts, or personal knowledge base (ads creative/manager, LinkedIn library, DM setters, persona wrappers). The system works without them.
