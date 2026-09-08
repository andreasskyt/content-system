---
name: editing
description: >
  Dispatcher for the [BRAND] video editing toolkit. Reads plain-English instructions
  ("clip silences, add subs, mix in song.mp3"), picks the right subset of scripts
  in `editing-workflow/scripts/`, runs them in canonical order (transcribe → clip →
  b-roll → subs → music), and lands the final video at
  `Marketing/{Short Form|Long Form YouTube}/<title>/edited_<original_basename>.mp4`. Use whenever the user
  says "/editing", "edit this video", "add subs to...", "transcribe...", "mix music
  under...", "add b-roll", or any combination thereof.
---

# /editing — [BRAND] Editing Workflow Dispatcher

**Trigger:** `/editing <free-form instructions, with one or more video paths>`. Also fires on phrases like "edit this video", "clip silences and add subs", "transcribe reel.mp4", "add music to the edit", "burn subtitles onto raw.mp4", "two takes — merge and edit".

You are the orchestrator. The toolkit below is yours; the user describes the outcome and you choose which scripts to run, in what order, with what flags. **Never run more than the user asked for.** If they only said "transcribe", do not also clip or add subs.

---

## Project root

```
[EDITING_WORKFLOW_ROOT]
```

All script paths below are relative to this root. Always invoke with `npx tsx "<absolute path>"` from that directory or with absolute paths.

---

## Toolkit inventory

| Step | Script | Signature | Produces |
|---|---|---|---|
| Transcribe in place (no folder) | `scripts/transcribe-only.ts` | `<video>` | `Transcript-only.json` next to input |
| Transcribe + create content folder | `scripts/transcribe.ts` | `<video> [--title]` | `Marketing/<fmt>/<title>/transcript.json` + `raw.mp4` |
| Clip / edit (single video) | `scripts/pipeline.ts` | `<video> [--title] [--instructions]` | `Marketing/<fmt>/<title>/edit.mp4` + `final_transcript.json` |
| Clip / edit (multiple takes) | `scripts/multi-pipeline.ts` | `<v1> <v2> [...] [--title] [--instructions] [--broll\|--subs\|--full]` | content folder + chained outputs |
| B-roll | `scripts/broll.ts` | `<content_folder> [--instructions]` | `b-roll.mp4` in folder |
| Slow push-ins | `scripts/zoom.ts` | `<content_folder> [--style <name>] [--regions "s-e\|s-e"] [--amount] [--ramp-in] [--ramp-out]` | `zoom.mp4` |
| Person mask (depth headers) | `scripts/matte.ts` | `<content_folder> [--quality accurate\|balanced\|fast] [--preview] [--force]` | `mask.mp4` (cached during the chain; finalize deletes it) |
| Depth headers behind speaker | `scripts/depth.ts` | `<content_folder> [--style <name>] [--headers "TEXT@start-end\|..."]` | `depth.mp4` |
| Karaoke subs (Remotion, content folder) | `scripts/subs.ts` | `<content_folder>` | `subs.mp4` in folder |
| Subs (standalone burn-in) | `scripts/subs-raw.ts` | `<video> [--style <name>]` | new content folder + `subs.mp4` |
| UI click track | `scripts/sfx.ts` | `<content_folder> [--style <name>] [--dry]` | `sfx.mp4` |
| Click library (one-off) | `scripts/sfx-generate.py` | `[out_dir]` | 10 synthesised wavs in `assets/sfx/clicks/` |
| Music bed | `scripts/add-music.ts` | `<video> <music_mp3> [--volume 0.10]` | `<basename>-music.mp4` next to input |
| Prep manually-edited video for b-roll | `scripts/prep-for-broll.ts` | `<content_folder>` | `final_transcript.json` |
| **Finalize (MANDATORY last step)** | `scripts/finalize.ts` | `<content_folder> --basename <name>` | `edited_<name>.mp4`, deletes ALL intermediates, original source untouched |
| **Thumbnail (MANDATORY, Short Form only)** | `scripts/thumbnail.py` | `--headline '<html>' --out Marketing/Reels/IG_grid_thumbnails/img<N>` | `thumb_dark.png` + `thumb_light.png` (1080×1920) |

`<fmt>` = `Short Form` (height > width) or `Long Form YouTube` (otherwise). Auto-detected by ffprobe inside the scripts.

---

## Instruction parsing playbook

Parse the user's natural-language request into an ordered list of steps. Map phrases to scripts:

| Phrase pattern in the user's message | Step to run | How |
|---|---|---|
| "edit", "clip", "cut filler/silences/retakes/dead air", "remove the part where I say X" | `pipeline.ts` | Pass everything verbal as `--instructions "..."`. Title from filename unless user gave one. |
| 2+ video paths in one request | `multi-pipeline.ts` | Replaces `pipeline.ts`. Use `--broll`/`--subs`/`--full` only if the user explicitly asks to chain. |
| "transcribe", "just the transcript", "no editing" | `transcribe-only.ts` (default) or `transcribe.ts` (if they want a content folder) | In-place by default; folder version only if subs/b-roll likely to follow. |
| "b-roll", "add b-roll" | `broll.ts` | Needs an existing content folder with `final_transcript.json` + an `edit.mp4`. If video was edited manually outside the pipeline, run `prep-for-broll.ts` first. |
| "subtitles", "subs", "captions", "karaoke" | `subs.ts` if a content folder with `final_transcript.json` exists; else `subs-raw.ts` (standalone) | See limitation note on colors. |
| "music", "song", "audio bed", a `.mp3` path | `add-music.ts` | Always last. Input video = whatever the previous step produced. |
| "no clipping", "skip the cut", "already edited" | Skip `pipeline.ts` | Use `subs-raw.ts` for standalone subs, or `prep-for-broll.ts` then `subs.ts`. |

If the user names a specific phrase to cut (e.g. *cut the part where I say "history" twice*), include that verbatim inside `--instructions` for `pipeline.ts`.

If the user names a music file (e.g. `song.mp3`), resolve its full path from `[CONTENT_ROOT]/Music for content/` before invoking `add-music.ts`. Filenames in that folder are long and decorated (artist/version suffixes, e.g. `Everything In Its Right Place (Instrumental) - Denis Kroitoru (128k).mp3`) — do a fuzzy match on the user's track name, don't assume a tidy filename.

---

## Canonical execution order

When multiple steps fire, always run them in this order:

```
transcribe → review → clip → zoom → b-roll → matte → depth → subs → sfx → music
```

- Review is built-in: every transcript is proofread by Claude (`src/lib/transcript-review.ts`) right after transcription — misheard words, misspellings, and nonsense-in-context terms are corrected before the edit plan or any subtitles consume the transcript. It runs automatically inside `transcribeAudio` and on cached unreviewed transcripts; corrections are logged with `✎`. If the log shows "review failed — continuing with UNREVIEWED transcript", surface that to [YOUR_NAME] before burning subs.
- Music is **always last** — it mixes under whatever video came out of the previous step.
- B-roll always before subs, so subs can filter overlapping word lines.
- Matte and depth only run for styles with an enabled `subs.depth` block (today: `landscape-creator-b` and its `-fast` sibling). They must come before subs: depth composites headers UNDER the speaker, then subs draws the ordinary tiers on top, which is what keeps lower-third captions in front.
- Zoom runs BEFORE matte — the mask has to be computed on the zoomed footage or the silhouette won't line up.
- Sfx runs after subs, because it reads `depth.ass` for header hits and needs the finished picture to mux against.
- Clip always before b-roll, so the content folder + `final_transcript.json` exist.

Run each step, surface its output, then run the next. Don't batch invisibly.

---

## Output convention

- Content folder: `Marketing/Short Form/<title>/` or `Marketing/Long Form YouTube/<title>/` (auto-detected).
- Title defaults to the source filename minus extension; override with `--title` if the user gave one.
- Intermediate files: `raw.mp4`, `edit.mp4`, `b-roll.mp4`, `subs.mp4`, `subs-music.mp4` (or similar `<basename>-music.mp4`), `transcript.json`, `final_transcript.json`.
- **ALWAYS end every run with `scripts/finalize.ts`. No exceptions, no matter which steps ran.** It promotes the last stage output to `edited_<original_basename>.mp4` and deletes every intermediate video (`raw.mp4`, `edit.mp4`, `subs.mp4`, `mask.mp4`, ...). **The user's original source file is NEVER touched — never moved, renamed, or deleted.**

  ```bash
  npx tsx scripts/finalize.ts "Marketing/<fmt>/<title>" --basename "<original_basename>"
  ```

  `<original_basename>` is the source video filename with the extension stripped, preserved verbatim (spaces, underscores, casing — leave them). For multi-take inputs use the first source's basename.

  **A finished content folder contains exactly ONE video — `edited_<name>.mp4`.** Never leave `raw.mp4`, `subs.mp4`, `edit.mp4`, `b-roll.mp4`, `subs-music.mp4`, or any other stage output behind; at 60–150MB each they burn storage fast across a batch. Transcripts and `style.json` stay — they're kilobytes and let a restyle skip paid transcription. (Legacy `raw_*.mp4`/`final_*.mp4` in old folders are moved-in originals — never auto-delete them.)

## Thumbnail — mandatory for every Short Form video

**Every reel gets a thumbnail. Always, by default, without being asked.** Run it right after `finalize.ts`, before reporting back. Short Form only — skip for Long Form YouTube, which has its own packaging skill (`/youtube-packaging`).

**Output location (non-negotiable):** every IG grid thumbnail goes to
`Marketing/Reels/IG_grid_thumbnails/img<N>/` — numbered sequentially, never in the video's own content folder and never anywhere else. Check the folder first and continue from the highest existing number.

```bash
python3 scripts/thumbnail.py \
  --headline 'the <em>real reason</em><br>your vibe coded<br>dashboards<br>never <em>work</em>' \
  --out "[CONTENT_ROOT]/Reels/IG_grid_thumbnails/img7"
```

Writes `thumb_dark.png`, `thumb_light.png` (1080×1920) and the `thumbnail.html` source into that folder. Show [YOUR_NAME] both and let him pick — dark usually wins on the grid, since light loses its edges against Instagram's white UI.

Rules that make or break it:

- **9:16 canvas, 4:5 safe area.** The file is 1080×1920, but the profile grid shows only the centre 1080×1350. The template already insets the kicker and handle to survive that crop — don't move them to the frame edges.
- **The headline comes from the video's actual hook**, in [YOUR_NAME]'s words from the transcript, not a summary of the topic. Lowercase, 3–5 short lines, broken by hand with `<br>`. Never auto-wrap.
- **Italics go where the pressure lies** — the promise and the verdict — never on the topic word or the buzzword. One or two `<em>` runs, placed at the start or end of a line where the eye already lands. "the *real reason* … never *work*", not "*vibe coded* … *never*".
- No emoji, no exclamation marks, no arrows or play buttons.

Design source is `assets/reel-thumbnail.html` — [BRAND] website tokens (olive `#0D130B`, sand `#BBAC8B`, Bricolage / Playfair / JetBrains Mono) with an orange bloom bottom-left. Edit that file to change the look for all future thumbnails.

---

Report the `edited_<original_basename>.mp4` absolute path and both thumbnail paths back to the user when done.

---

## Worked examples

**Edit + subs + music (the full chain):**
> "/editing edit reel.mp4, clip silences and the duplicate 'history' line, add subtitles, then mix in song.mp3 as music"
```bash
npx tsx scripts/pipeline.ts "reel.mp4" --instructions "cut silences and remove the duplicate 'history' phrase"
npx tsx scripts/subs.ts "Marketing/Short Form/reel/"
npx tsx scripts/add-music.ts "Marketing/Short Form/reel/subs.mp4" "/path/to/song.mp3"
npx tsx scripts/finalize.ts "Marketing/Short Form/reel" --basename "reel"
```

**Transcribe only, no folder:**
> "/editing transcribe reel.mp4"
```bash
npx tsx scripts/transcribe-only.ts "reel.mp4"
```

**Two takes, full pipeline:**
> "/editing merge raw1.mp4 and raw2.mp4 then full pipeline"
```bash
npx tsx scripts/multi-pipeline.ts "raw1.mp4" "raw2.mp4" --full
```

**Already-edited video, just b-roll:**
> "/editing add b-roll to my hand-edited Marketing/Short Form/myvid/edit.mp4"
```bash
npx tsx scripts/prep-for-broll.ts "Marketing/Short Form/myvid/"
npx tsx scripts/broll.ts "Marketing/Short Form/myvid/"
npx tsx scripts/finalize.ts "Marketing/Short Form/myvid" --basename "myvid"
```

**Subs + music only on a raw clip (no clipping):**
> "/editing burn karaoke subs onto raw.mp4 and add song.mp3"
```bash
npx tsx scripts/subs-raw.ts "raw.mp4"     # creates content folder, transcribes, burns subs
npx tsx scripts/add-music.ts "<that folder>/subs.mp4" "/path/to/song.mp3"
npx tsx scripts/finalize.ts "<that folder>" --basename "raw"   # <original_basename> = "raw"
```

**Color request hits a limitation:**
> "/editing burn BLACK karaoke subs onto raw.mp4"

Stop before running. Reply: `subs-raw.ts has ACTIVE_HEX=#BCAC8B (gold) and INACTIVE_HEX=#FFFFFF (white) hardcoded at scripts/subs-raw.ts:28-29. Want me to make a one-off edit to those constants before running, or ship the gold/white default?`

---

## Known limitations (surface up front)

- **`subs-raw.ts` reads its whole look from a style preset** (`--style <name>`, default `youtube`). `youtube` = pure white Poppins, one line, cumulative word-by-word build, no outline, standard 16:9 caption height. `brand` = the old gold karaoke look. Never hardcode a look in the script — add or edit a preset in `src/styles/`.
- **`subs.ts` requires a content folder** with `final_transcript.json`. For raw clips, prefer `subs-raw.ts`.
- **`broll.ts` requires** `assets/broll-inspiration/manifest.md` with image descriptions.
- **`multi-pipeline.ts --subs` implies `--broll`** (subs runs after b-roll in that script).
- **`add-music.ts`** writes next to the input — keep inputs inside the content folder so the output also lands there.
- **Env:** `.env.local` must define `ELEVENLABS_API_KEY` and `PEXELS_API_KEY`. Claude calls run on the subscription via the Claude Code CLI (`src/lib/claude-cli.ts`), not a metered API key — they need a signed-in CLI (`claude login`), and `ANTHROPIC_API_KEY` must stay OUT of `.env.local` or billing reverts to metered.

---

## Error handling

On any non-zero exit:
1. Show the last 20 lines of stderr.
2. Match against common errors:
   - `ELEVENLABS_API_KEY not set` → add to `.env.local`
   - `Claude CLI is not signed in` → run `claude login` in a terminal ([YOUR_NAME] must do this himself — it's an interactive OAuth flow)
   - `ffmpeg not found` → `brew install ffmpeg`
   - `final_transcript.json not found` → run `pipeline.ts` first, or `prep-for-broll.ts` if manually edited
   - `manifest.md not found` → create one in `assets/broll-inspiration/`
   - `File not found` → check the video / music path
3. Don't continue the chain on failure — report and wait for the user.

---

## Multiple videos

When the user gives multiple raw video paths in one dispatch:
- 2+ takes of the **same** clip → `multi-pipeline.ts` with optional chain flags.
- 2+ **independent** videos to process in parallel → run separate dispatches, one Bash call per video, all `run_in_background: true`.
