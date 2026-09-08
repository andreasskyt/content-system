# Architectural learnings from browser-use/video-use (audit 2026-09-07)

Reference clone: `Code Projects/video-use/` (MIT, commit 9575612, 2026-08-30).
Its five helpers (`helpers/render.py`, `timeline_view.py`, `transcribe.py`, `pack_transcripts.py`, `grade.py`) are the read-worthy part. The skill doc is worth reading once for the hard-rules pattern.

## Verdict

Keep editing-workflow. It has the brand layer (16 style presets, x-ray subs, zoom, depth headers, cards, testimonial compile, Claude on subscription) that video-use does not. Adopt video-use's rendering architecture and its verification loop. Delete the dead half of the repo.

## What is wrong today (verified in code)

| # | Finding | Where | Cost |
|---|---|---|---|
| 1 | Every clip is re-encoded on cut, then re-encoded again on concat, then again by zoom, depth, subs, music. 6 to 7 x264 generations per finished video. | `src/lib/ffmpeg.ts` cutClip + concatClips, every stage script | Slow chain, softening every pass, first thing a viewer reads as "cheap" |
| 2 | No audio fade at cut edges. Only ab-hooks fades the hook seam. | `cutClip` has no `afade` | Audible pops at jump cuts |
| 3 | No padding around word boundaries. Claude's start/end go straight to ffmpeg. Scribe drifts 50 to 100 ms. | `cutClip`, `claude.ts` | Clipped first syllables (TAKE-REVIEW already notes "first words may clip") |
| 4 | Every encode forces `-r 30` regardless of source. Ad footage is 23.976. | `cutClip`, `concatClips` | Frame duplication judder on 24p sources |
| 5 | No loudness normalisation. No HDR tone-mapping for iPhone HLG sources. | nowhere | Quiet or blown-out uploads, inconsistent across ads |
| 6 | Stage ordering is implicit through file existence (`subs.ts` picks `depth.mp4` over `b-roll.mp4` over `edit.mp4`). No single description of the edit exists. | every stage script | Fragile, unrepeatable, cannot re-render one layer without re-running the chain |
| 7 | Nothing looks at the rendered pixels before [YOUR_NAME] does. Only b-roll has a creator/reviewer loop. | `/editing` skill | Every mistake costs a human review round |
| 8 | No per-project memory. Each session re-derives context. | content folders | Repeated questions, drift between sessions |
| 9 | Dead weight: Next.js app with 12 API routes + `jobStore` (April UI), `uploads/` 1.1 GB, `_backup_cli_workflow/`, `wf2.raw`, 7 subtitle burners (4 unreferenced), 4 unreferenced cut/join helpers. 12 of 30 scripts are not referenced by the skill, CLAUDE.md, or the ads playbook. | repo root, `scripts/` | Every session pays tokens to read a toolkit that is 40 percent noise |

## What video-use does right, and what to copy

1. **EDL as the single contract.** One JSON: sources, ranges with beat and reason, grade, overlays with output-timeline offsets, subtitles path, expected duration. Reasoning writes it, rendering executes it, nothing else touches ffmpeg. Copy this shape verbatim and extend it with `zoom`, `music`, `cards`, `style`.
2. **Two encodes, not seven.** Per-segment extract (one encode, with grade, fades, fps unification), lossless `-c copy` concat, one final composite pass with overlays PTS-shifted and subtitles applied last. Copy `render.py` sections "Per-segment extraction", "Lossless concat", "Final compositing".
3. **Hard rules encoded as code, not prose.** 30 ms afade both edges. Word-boundary snapping plus 30 to 200 ms handles. Subtitles last in the filter chain. Overlays `setpts=PTS-STARTPTS+T/TB`. Master SRT rebuilt on output timeline. One fps for the whole render, taken from the first source. HDR detect via `color_transfer` and tonemap to Rec.709. Two-pass loudnorm to -14 LUFS, -1 dBTP.
4. **timeline_view for self-eval.** Filmstrip plus waveform plus word labels PNG for any range. Run on the rendered output at every cut boundary, plus first 2 s, last 2 s, and three midpoints, before showing the user. Cap at three fix passes. This replaces the human as first reviewer.
5. **project.md per content folder.** Strategy, decisions, reasoning log, outstanding. Appended every session, read on startup.
6. **Packed phrase-level transcript** (~12 KB) as the reading view for take selection. Cheaper than the per-word list `claude.ts` sends now, and it keeps silence gaps as cut candidates.

## What NOT to copy

- Its subtitle style (Helvetica two-word uppercase). Ours are presets in `src/styles/`. Keep.
- "Artistic freedom" as default. Brand consistency needs presets. Keep the dispatcher's preset-first behaviour, add reasoning only where the preset leaves a choice.
- Python-only. Vendor `render.py` and `timeline_view.py` as-is (MIT), call them from TypeScript. Do not rewrite in TS for purity.
- Its animation engines (HyperFrames, Manim). Remotion and html-card already cover our needs.

## Refactor plan (needs a yes before any code moves)

**Phase 1, render core (1 to 2 days).**
Vendor `render.py` + `timeline_view.py` into `scripts/core/`. Define `edl.json` v1 with our extensions. Rewrite `pipeline.ts` to emit an EDL and call the renderer. Delete `cutClip`/`concatClips`. Result: one edit is one JSON plus one render, two encodes, fades, handles, fps preserved, loudnorm.

**Phase 2, layers become EDL fields (1 day).**
zoom, depth, subs, music, cards, b-roll stop being stage scripts that read and write mp4s. Each becomes a function that contributes filters or overlays to the final composite. Re-rendering with a different sub style is a field change, not a chain re-run. `finalize.ts` shrinks to "rename output".

**Phase 3, self-eval + memory (half a day).**
`/editing` skill gains: render preview, timeline_view at every cut boundary, fix and re-render up to three times, then present. `project.md` per content folder.

**Phase 4, delete (half a day, after [YOUR_NAME] confirms the list).**
`src/app/`, `src/lib/jobStore.ts`, `uploads/` (1.1 GB, check nothing irreplaceable first), `_backup_cli_workflow/`, `wf2.raw`, `subs.py`, `subs-karaoke.py`, `cut-silence.py`, `detect-gaps.py`, `join-clips.py`, `local-whisper.py` (unless kept as the offline fallback), `set-folder-view.*`. Fold `subs-pop.py`, `subs-emphasis.py`, `xray-burn.py` into one burner with a `--style` flag or into the Remotion preset system. Next.js deps leave `package.json` if nothing else imports them.

**Order matters:** Phase 1 before Phase 4. Deleting first breaks the ads playbook (`compile-testimonial`, `xray-burn`, `ab-hooks`, `html-card` are live in `/ads-creative` even though the `/editing` skill never mentions them).

## Cheap experiment before committing to Phase 1

Register video-use as a skill next to `/editing`, point it at the raw headtalk `.mov` takes, let it pick takes and render a rough cut with its default subs. One Scribe call, about an hour. Compare cut cleanliness and take choice against `pipeline.ts` on the same footage. If it wins, Phase 1 is justified by evidence. If it does not, we still take items 2 to 5 above.
