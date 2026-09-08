# editing-workflow

Toolkit of standalone TypeScript scripts under `scripts/` for transcribing, clipping, b-rolling, subtitling, and music-bedding video. The `/editing` skill (defined globally at `~/.claude/skills/editing/SKILL.md`) is the dispatcher — it parses plain-English instructions and calls the right scripts in canonical order: `transcribe → review → clip → zoom → b-roll → matte → depth → subs → sfx → music`. The review step (`src/lib/transcript-review.ts`) is automatic: Claude proofreads every transcript inside `transcribeAudio` (and on cached unreviewed `transcript.json`) and corrects mishearings before anything downstream uses it — text only, never timestamps; marked by `reviewed: true`.

## Conventions

- **Final output path (ABSOLUTE main Content folder — NEVER the repo's local `Content/`):**
  - Short-form (vertical, or landscape reels ≤ ~3 min) → `[CONTENT_ROOT]/Reels/<title>/edited_<original_basename>.mp4`
  - Long-form (YouTube: landscape **and** > 3 min) → `[CONTENT_ROOT]/YouTube/<title>/edited_<original_basename>.mp4`
  Folder names are exactly **"Reels"** / **"YouTube"** (renamed 2026-08-25; the single source of truth is `SHORT_FORM_DIR` / `LONG_FORM_DIR` in `src/lib/constants.ts`). `finalize.ts` promotes the last produced video to `edited_<original_basename>.mp4` (basename = source filename minus extension, verbatim); reveal it with `open -R`. Outputs buried in the repo are invisible to [YOUR_NAME] — always land in the main Content folder. (See memory `feedback-output-location`.)
- **Music files live in:** `[CONTENT_ROOT]/Music for content/`. When the user names a track ("add song.mp3", "everything in its right place"), resolve from this folder. Use a fuzzy match — filenames here are long and decorated (e.g. `Everything In Its Right Place (Instrumental) - Denis Kroitoru (128k).mp3`).
- **The original source video is NEVER touched.** It stays exactly where the user keeps it (e.g. `Content/OBS Recordings/`, `Content/Raw Videos/`) — never moved, never renamed, never deleted.
- **ONE video per folder, always.** Every run ends with `npx tsx scripts/finalize.ts <folder> --basename <title>`, leaving only `edited_<title>.mp4` plus transcripts/`style.json`. Stage outputs (`raw.mp4`, `edit.mp4`, `b-roll.mp4`, `subs.mp4`, `mask.mp4`, `*-music.mp4`) are inputs to the next stage and are all deleted once the chain finishes. Never hand back a folder still holding them. (Set 2026-08-27, replacing the old raw_/final_ two-video convention — the raw copy was doubling storage per video. Legacy `raw_*.mp4`/`final_*.mp4` files in old folders are moved-in originals and must never be auto-deleted.)
- **Env:** `.env.local` holds `ELEVENLABS_API_KEY` and `PEXELS_API_KEY`.
- **Claude runs on the subscription, not the API.** All model calls go through `src/lib/claude-cli.ts` (`askClaude`), which shells out to the Claude Code CLI and bills against the Max plan. `ANTHROPIC_API_KEY` was removed from `.env.local` on purpose — if it comes back, the CLI silently reverts to metered API billing. Never reintroduce `@anthropic-ai/sdk` in `src/lib/`. Requires a signed-in CLI (`claude login`).

## Depth headers (landscape-creator-b)

Text that sits BEHIND the speaker is a two-script stage, not a style flag:

1. `scripts/matte.ts <folder>` — Apple Vision person segmentation (Neural Engine, no model download) → `mask.mp4`, a grayscale silhouette. `--preview` writes three source/mask stills so edge quality can be judged before a full render. Cached during the chain; `finalize.ts` deletes it at the end (regenerate if restyling — one video per folder wins over the cache).
2. `scripts/depth.ts <folder>` — picks header phrases from the transcript, burns them via ASS, composites the matted speaker on top → `depth.mp4`.

Order matters: depth runs BEFORE `subs.ts`, which then draws the ordinary caption tiers on top of `depth.mp4`. That is what keeps lower-third subtitles in FRONT of the speaker while the headers sit behind. `subs.ts` prefers `depth.mp4` over `b-roll.mp4`/`edit.mp4` automatically.

Two things that will bite if changed:
- The mask is stored as grayscale H.264, not an alpha WebM. libvpx in the local ffmpeg build silently drops the alpha channel on both VP8 and VP9 — the file probes as valid and composites as fully opaque.
- The composite filtergraph needs `split` (the source feeds both the text layer and the foreground) and `format=rgba` before `alphamerge` (without it the foreground has no alpha and hides the text entirely).

## landscape-creator-b — the full run

The Creator B look is two presets, `landscape-creator-b` (calm) and
`landscape-creator-b-fast` (one word at a time). They differ in three fields
only; keep them in lockstep. Everything the look consists of lives in the preset
— type, sizes, positions, fades, travel, header layout, shadows, zoom ramps and
the click-track placement.

```bash
V="<original source path — untouched, wherever the user keeps it>"; D="Content/Reels/<title>"
npx tsx scripts/pipeline.ts "$V" --title "<title>"
npx tsx scripts/zoom.ts   "$D" --style landscape-creator-b
npx tsx scripts/matte.ts  "$D"
npx tsx scripts/depth.ts  "$D" --style landscape-creator-b
npx tsx scripts/subs.ts   "$D" --style landscape-creator-b
npx tsx scripts/sfx.ts    "$D" --style landscape-creator-b
npx tsx scripts/finalize.ts "$D" --basename "<title>"
```

Order is not negotiable: zoom before matte (the mask must match the zoomed
frame), depth before subs (headers go under the speaker, captions over), sfx
after subs (it reads `depth.ass` for the header hits).

`scripts/sfx-generate.py` rebuilds the click library. Run once; it is
deterministic and the files are committed.

## Scripts → see `~/.claude/skills/editing/SKILL.md` for the full toolkit table

Don't bypass the skill — even when working directly in this repo, dispatching through `/editing` keeps the canonical order and final-rename step consistent.

## Style library

Scripts are vehicles, styles are drivers. A "style" is a complete preset under `src/styles/<name>.ts` that default-exports an `EditStyle` (see `src/styles/types.ts`). Adding a new creator-named style = drop a new file there, populate fields, done. Loaders: `loadStyle(name)` and `listStyles()` from `src/styles`.

Current styles: `brand` (default), `creator-a`, `creator-c`, `xray-invert`, `landscape-simple`, `landscape-creator-b`, `landscape-creator-b-fast`.

`xray-invert` is the [BRAND] signature x-ray caption look (white Montserrat 900 caps inverted against the footage via `mix-blend-mode: difference`, one word at a time). Its locked defaults — set 2026-06-10 from the approved "Comp.1" ad — are: **words held until the next word (no blinking)**, positioned **40% from the bottom**, **6.4% height (large but fits)**. When the user says "use xray invert", render with `--style xray-invert`. The hold-until-next behavior is the `subs.xray_difference.hold_until_next` flag, honored by `XRayInvertCaptions.tsx`.

**Subtitles consume the style today.** `subs.ts` accepts `--style <name>` (default `brand`):

```bash
npx tsx scripts/subs.ts <content_folder> --style creator-a
```

It loads the preset, runs the keyword tagger (Claude Haiku) when `style.subs.keyword.picking_strategy === "ai-pick"`, and renders the `StyledCaptionedVideo` Remotion composition with the full subs spec passed as a prop. Writes `style.json` snapshot into the content folder for reproducibility.

**Capability matrix — what the style fields actually drive today:**

| Field | Wired? | Notes |
|---|---|---|
| `subs.*` | ✅ fully | font/size/weight/position/case/animation/keyword glass effect |
| `subs.depth.*` | ✅ | `scripts/matte.ts` + `scripts/depth.ts` — headers behind the speaker |
| `subs.keyword.render: "displacement-glass"` | ✅ | SVG `feTurbulence` + `feDisplacementMap` filter |
| `pacing.instructions` | ⚠️ wire to `pipeline.ts` | not yet implemented |
| `broll.palette` / `broll.persona` | ⚠️ wire to `broll.ts` | not yet implemented |
| `grade.*` | ❌ TODO | needs `scripts/grade.ts` (ffmpeg eq + colorbalance) |
| `framing.zoom_punches` | ✅ | `scripts/zoom.ts` — scale + attack/release drive the slow push |
| `post_effects.grain` / `vignette` | ❌ TODO | needs `scripts/post-fx.ts` |
| `sfx.*` | ✅ | `scripts/sfx.ts` + `sfx.placement`; library from `sfx-generate.py` |
| `motion_graphics.*` | ❌ TODO | needs Remotion title-card + callout compositions |
| `broll.sources: ["lifestyle", "stock", ...]` | ❌ TODO | needs footage-library system (parallel to `assets/broll-inspiration/manifest.md`) |

When you add a new capability script, make it read its slice from the style preset — never hardcode look in scripts.
