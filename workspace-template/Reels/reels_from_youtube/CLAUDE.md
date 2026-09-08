# Reels from YouTube — Clipping System

System prompt for turning [YOUR_NAME]'s long-form YouTube videos into 10–60s vertical reels. Any Claude session working in this folder follows this file exactly.

**Toolkit root:** `[EDITING_WORKFLOW_ROOT]`
**Output folder (this folder, FLAT — no subfolders ever):** `[CONTENT_ROOT]/Reels/reels_from_youtube/`

---

## Output convention — ONE flat folder, ONE video per clip

Every source video gets a short slug (e.g. `vibecoded`, `aisystems`). Everything is tied together by that slug — never by subfolders:

```
reels_from_youtube/
  CLAUDE.md
  <slug>_transcript.json          ← full long-form transcript (word timestamps)
  <slug>_plan.md                  ← clip plan for that video
  <slug>_01_<clipslug>.mp4        ← the clip. ONE file. Nothing else.
  <slug>_02_<clipslug>.mp4
```

**Hard rules learned 2026-08-20 ([YOUR_NAME] feedback — do not repeat these mistakes):**
- **NO subfolders.** Not per video, not per clip. Flat folder only.
- **ONE video file per clip.** The trimmed vertical cut, no subtitles, no `raw_`/`final_` pairs, no `tmp_` leftovers, no intermediates. Storage matters.
- **No subtitles, no thumbnails, no music by default.** Deliver the raw clip; [YOUR_NAME] decides per clip whether subs etc. get added afterwards. Only then run `subs-raw.ts` on the clip he names.
- Do NOT run `finalize.ts` in this workflow — it exists to create raw/final pairs, which is exactly what we don't want here.
- Delete every intermediate you create the moment it's superseded (move to `~/.Trash` if `rm` is permission-blocked).

If a slug already exists in the folder, that video has been processed — extend its numbering, never duplicate.

---

## Pipeline (per video)

**PLAN BEFORE CUTTING. Never cut until `<slug>_plan.md` is written.**

### 1. Transcribe

```bash
cd "[EDITING_WORKFLOW_ROOT]"
npx tsx scripts/transcribe-only.ts "<long-form video path>"
```

Writes `Transcript-only.json` NEXT TO THE INPUT — move it to `<slug>_transcript.json` here IMMEDIATELY (parallel transcriptions into the same source folder overwrite each other; this bit us once). Never touch the original long-form video.

### 2. Plan — write `<slug>_plan.md`

For each candidate: rank, grade (A/B), funnel stage (ToFu/MoFu/BoFu), purpose sentence, start/end timestamps (word-level, sentence boundaries, ±0.15s pad), duration (10–60s, sweet spot 20–40s), verbatim hook, why it works, trim notes. Only A-grade gets cut; B-grade is backlog. No minimum count — 0 honest clips beats 2 forced ones.

### 3. Cut — deterministic, one ffmpeg pass per clip

**Keep the original landscape format (1920×1080). NEVER crop to 9:16** — [YOUR_NAME] draws on the iPad overlay and the drawings must stay visible (his call, 2026-08-20; the first batch was wrongly cropped to vertical).

Trims (stutters, false starts, dead air, sentences flagged in the plan) are done deterministically from word timestamps: build keep-segments (squeeze gaps > 0.6s down to ~0.2s, cut flagged ranges), then one `filter_complex` trim/concat pass straight from the source, full frame:

```bash
ffmpeg -i "<source>" -filter_complex "<trim/atrim/concat chain, no crop>" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -preset fast -c:a aac -b:a 192k \
  "reels_from_youtube/<slug>_<nn>_<clipslug>.mp4"
```

This needs no Claude CLI and produces the final deliverable directly. (`pipeline.ts` does AI segment selection but requires a signed-in Claude CLI and creates content-folder structure we'd have to clean up — the deterministic cut is the default here.)

### 4. Verify + report

ffprobe the duration (must be 10–60s), extract one frame to confirm framing, send the clips to [YOUR_NAME] with slug, funnel stage, length, and hook. List skipped candidates and why.

---

## On-request extras (only when [YOUR_NAME] says so)

- **Subtitles (LOCKED style 2026-08-21, replaced youtube-boxed):** `npx tsx scripts/subs-raw.ts "<clip>.mp4" --style youtube-clean` — sooweigoh-look: whole 2-3 word phrases popping on at once, white Poppins Bold 7.8% height, bottom center (93% from top), minimal blurred shadow (16%/16px), no box/outline. Preset: `src/styles/youtube-clean.ts`. ALWAYS review the generated `subs.ass` for ElevenLabs mishears before burning (recurring: "noddle"→"nod", "Cloud Code"→"Claude Code", "WAP/Warp"→"Whop", trailing next-sentence words at clip end) — fix with sed on the ASS, re-burn with `/usr/local/opt/ffmpeg-full/bin/ffmpeg -i raw.mp4 -vf "subtitles=subs.ass:fontsdir='<toolkit>/assets/fonts'" ...` (must be ffmpeg-full; quote fontsdir).
- **CTA overlay (LOCKED 2026-08-21, on every reel):** last 5s, fades in 700ms over a 55% black full-frame scrim: `comment "video"` in Bricolage Grotesque ExtraBold 120px white (ASS family name: `Bricolage Grotesque 96pt ExtraBold ExtraBold`, spacing -6, pos 960,480) + `and i'll send you the full video` in Playfair Display Italic 68px beige &H008BACBB (pos 960,565). Both fonts live in the toolkit's `assets/fonts/`. Appended as ASS styles+events (CTAScrim/CTAMain/CTASub) before the burn — see `deploy.sh` pattern in session scratch or regenerate from this spec. The caption in Notion carries the matching line: `Comment "VIDEO" and I'll send you the full video.` before the hashtags.
- The script creates a content folder in `Content/Short Form/` — move `subs.mp4` back here REPLACING the clip file (same name, still one file per clip) and trash the folder. If the clip is already scheduled, also re-upload to its existing Drive file id (`PATCH https://www.googleapis.com/upload/drive/v3/files/<id>?uploadType=media`) so the Notion row keeps working.
- **Thumbnail:** `scripts/thumbnail.py` referenced by the editing skill does NOT exist (verified 2026-08-20). Working method: copy the newest `img<N>.html` in `Content/Reels/IG_grid_thumbnails/` as template, swap the `<h1>` in dark+light divs, split into dark-only/light-only temp HTMLs, render each with `node scripts/render-shot.cjs <html> <png> 1080 1920 1`. Flat naming: `img<N>.html`, `img<N>_dark.png`, `img<N>_light.png`. Headline = the clip's hook, lowercase, 3–5 hand-broken lines, `<em>` on the pressure words, no emoji.

---

## Clip selection rules — what makes a good reel

A clip earns its place only if it stands **completely alone** AND serves a deliberate funnel purpose for the ICP (business owners with messy data/ops, agency owners, [ICP_QUALIFIER] operators). No random clips. Every clip in the plan declares its funnel stage — if it can't be tagged, it doesn't get cut.

### Funnel stages — every clip gets exactly one tag

**ToFu — make them problem-aware.** Hidden costs ("silently costing you $X/year"), broken common behavior called out, hype punctured ("AI on messy data is noise"), "looked fine until we opened the data" stories.

**MoFu — make them solution-aware.** The sequence argument (structure data → visibility → automate → AI), client-fix walkthroughs with the mechanism visible, one sharp tactic fully explained, cheap-way-vs-proper-way comparisons.

**BoFu — make them want to buy.** Real client results with numbers, proof-of-work moments (actual builds running), positioning lines (who [BRAND] is for / not for), guarantee/offer mentions said naturally.

Aim ToFu-heavy but never manufacture a stage — tag what the material actually is.

### Raw material worth hunting for (priority order)

1. **Contrarian claims with the why attached** — tension in sentence one, resolution inside the clip.
2. **Specific numbers and receipts** — real revenue, costs, timelines. Proof destroys scroll AND price objections.
3. **Complete micro-stories** — setup, turn, payoff inside 10–60s. Client stories are the strongest BoFu material.
4. **Punchy verbatim lines** — the hook is [YOUR_NAME]'s actual words; if a segment starts weak, start the clip at its strongest sentence.
5. **One-tactic how-tos** — a single mechanism fully explained, no "step 2 of 5" dependency.
6. **Frameworks stated in one breath** — 2–4 part models get saved and shared.
7. **Hot takes on tools/trends** — timely, and filters for the right audience.

### Reject — hard filter, no exceptions

- Needs prior context ("as I said earlier…", "this second step…")
- Setup without payoff inside the clip window
- Rambling, hedged, or low-energy delivery — a strong point delivered flat is still a reject
- Generic advice any creator could have said — no [BRAND] edge, no clip
- Only works with the video title attached
- Aimed at the wrong audience (consumers, broke startups, chatbot shoppers)
- "Interesting but pointless" — can't write one sentence on what the ICP viewer should think/feel/do → reject

### Quality bar — only the very best

- **Hook test (first 2s):** cold ICP viewer stops scrolling on the first spoken line alone, no title card. If not: move the start or reject.
- **Point test:** one clip = one point. Two points → cut to the stronger or split.
- **Payoff test:** last line resolves the tension the first line opened. Ending mid-thought is a reject, not a trim job.
- **Ratio discipline:** rejecting most of a video is the expected outcome. 2 excellent beats 6 decent.

---

## Hard rules

- Plan first, always. `<slug>_plan.md` exists before any cut.
- Original long-form videos are untouchable — never move, delete, or overwrite them.
- One flat folder, one file per clip, zero intermediates left behind.
- Multiple videos → parallel background jobs are fine, but move each `Transcript-only.json` out immediately (overwrite race).
- On any script failure: stop that video's chain, report stderr, don't improvise silently — say what fallback was used.
