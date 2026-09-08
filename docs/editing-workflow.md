# Editing engine (`editing-workflow/`)

Local, deterministic video toolkit. Claude Code (via the `/editing` skill) is the dispatcher: it parses "cut silences, add subs in the x-ray style, mix in track.mp3" and runs the right scripts in canonical order:

```
transcribe → review → clip → zoom → b-roll → matte → depth → subs → sfx → music → finalize
```

## Install

```bash
cd editing-workflow
npm install
cp .env.example .env.local        # ELEVENLABS_API_KEY (word-level transcription) · PEXELS_API_KEY (stock b-roll)
brew install ffmpeg               # with libass (default Homebrew build has it)
swiftc -O -o scripts/matte/PersonMatte scripts/matte/PersonMatte.swift    # person segmentation (macOS)
pip3 install playwright faster-whisper && playwright install chromium      # html cards, local transcription fallback
claude login                      # model calls go through the Claude Code CLI (src/lib/claude-cli.ts)
```

Set the content root in the repo's `CLAUDE.md` and `bin/*` (`[CONTENT_ROOT]`, done by `setup/configure.sh`). Optional: `ln -s "$(pwd)/bin/edit" /usr/local/bin/edit` for the interactive terminal menu (`edit`, `edit-menu`, `subs-menu`, `music-menu`).

`bin/ffmpeg-libass` is not shipped (80 MB binary). The scripts fall back to `ffmpeg` on PATH; if your ffmpeg lacks libass, build or download one and drop it there.

## Scripts (all `npx tsx scripts/<name>.ts …` unless `.py`)

| Script | Does |
|---|---|
| `transcribe-only.ts <video>` | word-level transcript next to the file |
| `transcribe.ts <video> [--title]` | transcript + creates the content folder |
| `pipeline.ts <video> [--title] [--instructions]` | Claude picks segments (cuts silences, ums, retakes) → ffmpeg cuts → `edit.mp4` |
| `multi-pipeline.ts <v1> <v2>…` | same for several takes |
| `broll.ts <folder> [--instructions]` | Remotion motion-graphic b-roll composited on cue points (creator/reviewer loop) |
| `broll-stock.py` | Pexels stock b-roll variant |
| `zoom.ts <folder> --style <name>` | slow push-ins |
| `matte.ts <folder>` + `depth.ts <folder> --style` | headers rendered BEHIND the speaker (Apple Vision mask) |
| `subs.ts <folder> --style <name>` | Remotion karaoke captions; `subs-raw.ts <video>` standalone |
| `subs.py`, `subs-pop.py`, `subs-karaoke.py`, `subs-emphasis.py`, `xray-burn.py` | fast ffmpeg/libass caption burners (specific looks) |
| `sfx.ts <folder>` | UI click track on header hits |
| `add-music.ts <video> <mp3> [--volume]` | music bed with ducking |
| `compile-testimonial.ts` | clips.json → compilation with headline, x-ray subs, end card |
| `html-card.py`, `motion-card.py`, `counter-overlay.py` | brand motion-graphic cards |
| `finalize.ts <folder> --basename <name>` | **mandatory last step**: promotes the last stage to `edited_<name>.mp4`, deletes every intermediate |

## Styles

`src/styles/<name>.ts` exports an `EditStyle` (see `types.ts`). Shipped: `brand` (default, deep-green/gold example), `brand-white`, `xray-invert` (white caps inverted via mix-blend-mode difference, held word by word), `creator-a` (Nordic editorial, sentence-case body with glass keywords), `creator-c` (horizontal flow), `landscape-simple`, `landscape-creator-b` / `-fast` (depth headers), `youtube`, `youtube-clean`, `youtube-boxed`, `youtube-soft`, `call-clip`, `call-clip-916`. Add a file, it's discoverable. Never hardcode a look in a script; read it from the style.

Brand tokens: `assets/brand.json` (fonts, colours), `src/motion/tokens.css` (motion-graphic design tokens), `src/motion/components.css`. Fonts in `assets/fonts/` (Jost, Montserrat, Poppins: OFL licensed).

## Conventions (enforced by the skill)

- Output path: short-form (vertical or ≤3 min landscape) → `[CONTENT_ROOT]/Reels/<title>/edited_<basename>.mp4`; long-form → `[CONTENT_ROOT]/YouTube/<title>/…`. Names are set in `src/lib/constants.ts`.
- The original source video is never moved, renamed, or deleted.
- One video per folder. Stage files (`raw.mp4`, `edit.mp4`, `b-roll.mp4`, `subs.mp4`, `mask.mp4`, `*-music.mp4`) are deleted by `finalize.ts`.
- Clips from long recordings keep `cuts.json` + transcript, never a raw duplicate.
- Music resolves by fuzzy name from `[CONTENT_ROOT]/Music for content/`.

## The Next.js UI

`npm run dev` starts a small drag-and-drop web UI (`src/app`) over the same pipeline (upload → transcribe → segment select → b-roll → download). Optional; the CLI/skill path is primary.

## Docs inside the repo

`docs/BRAND-REEL-STYLE.md` (the locked reel recipe), `docs/broll-prompt-review.md`, `docs/video-use-learnings.md`, `assets/approved-animations.md`, `assets/broll-inspiration/manifest.md`.
