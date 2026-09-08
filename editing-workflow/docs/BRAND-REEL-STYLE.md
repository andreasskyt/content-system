# [BRAND] Reel Style — locked recipe (v1, 2026-06-16)

The look we built for [YOUR_NAME]'s agency reels — the 6 in
`Content/Short Form/8 Landscape Reels/` (landscape, already scheduled on IG) and
`…/8 Landscape Reels/Claude Code Vertical/` (9:16 reels). This is the FAST path:
`subs.py` (libass) + `html-card.py` (Chrome motion graphics) + `broll-stock.py`
(Pexels) + ffmpeg. NOT the Remotion/EditStyle `.ts` path.

The 6 topics: Centralised Client Database, Client Reporting Dashboards, Client Wins
Mechanism, Competitor Research Agent, "I used to tell people I build custom", The VA Myth.

---

## The non-negotiable rules (each one cost a feedback round — don't relearn)

1. **B-roll is FULL-SCREEN, never glued over his face.** A motion graphic replaces the
   talking head for its window, sitting on a full-screen background of its OWN bg colour
   (or a rounded card on black). Overlaying a card on top of his video = amateur, rejected.
2. **Every graphic is TAILORED to the exact spoken line — do NOT reuse a generic template
   library.** When he says "an automated Slack ping is sent to the community group," BUILD
   a Slack-ping graphic for that sentence (a nicely formatted win message). When he says
   "automated tracking for all of your clients," build the 10-clients-sliding-in graphic.
   Reusing the same dashboard/form twice in adjacent videos was rejected as unprofessional.
   The components are vocabulary; the *composition + data + idea* must be invented per line.
3. **Music NEVER replaces the original voice.** Always mix UNDER the voice at 15%:
   `[1:a]volume=0.15[m];[0:a][m]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]`
   map `[0:v]` (or `-c:v copy`) + `[a]`. Voice is always the primary track.
4. **Headlines on graphics are UPPERCASE** (`.header` text-transform:uppercase) so they read
   as headlines, not subtitles.
5. **Captions never wrap a phrase to a second line** (see Captions below).
6. **A graphic window must NOT exceed the graphic mp4's duration** or its baked out-blur
   freezes and looks glitchy (see Glitch fixes).
7. **Trim the first/last ~0.2–0.5s of OBS recordings** — they start/end on a glitch frame
   or a stop-recording motion / mic blow. Also remove dead-air leads (start on the first word).

---

## Format A — Landscape 16:9 (YouTube/IG, the "perfect" approved versions)

Source stays 16:9 (he's centre-frame). Pipeline:
`trim glitches → silence-cut → full-frame motion-graphic + Pexels cutaways (replace him) →
captions (creator-a) → music 15%`. Graphics rendered at 1920×1080. This format is locked &
scheduled — only touch on explicit request.

## Format B — Vertical 9:16 reel (the "Claude Code Vertical" set)

Reframe the landscape talking head to 9:16, centre-crop on him:
```
crop=608:1080:656:0,scale=1080:1920,setsar=1
```
Then full-screen b-roll cutaways + captions + music. Build order per reel:

1. **Reframe** edit.mp4 → vertical talking head (`v?v_edit.mp4`). Trim leads here with `-ss`.
2. **Pexels** (if any) — `broll-stock.py <edit> cues.json out.mp4 --mode card --bg black`.
   Card mode = full-frame black + centred rounded footage card (already replaces him). ✔
3. **Motion graphics** — overlay each as FULL-SCREEN on its own bg colour, hard-cut at end:
   ```
   [g:v]scale=1080:-2,pad=1080:1920:0:(1920-ih)/2:color=0x<CORNERHEX>,
        setpts=PTS-STARTPTS+START/TB[gN];
   [base][gN]overlay=0:0:enable='between(t,START,CUT)'
   ```
   `<CORNERHEX>` = the graphic's own top-left pixel (sample with PIL `getpixel((8,8))`) so the
   pad is seamless — dark graphics ≈ `090b08`, light/cream ≈ `fafaf7`.
   For held-clean (window > graphic duration), insert before scale:
   `trim=0:<dur-0.55>,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=10,`
   → plays the in-animation, holds the last CLEAN frame, hard-cuts at `CUT` (no out-blur).
4. **Captions** — `subs.py` (below).
5. **Music** — mux 15% under voice (rule 3). Output to the `Claude Code Vertical/` folder as
   `final_<title> (Vertical).mp4`.

---

## Captions (`scripts/subs.py`, style=creator-a)

White Poppins-Bold, build-on word-by-word (each word fades in at its spoken time on ONE
libass event per phrase). Emphasis "keywords" render BIGGER (×1.6) + **x-ray inverted**
(`blend=difference` two-layer trick). Locked params for vertical reels:

- `--y 60` → captions sit **40% from the bottom**.
- **No-wrap:** `units_creator-a` breaks build-units on PIXEL WIDTH (PIL advance width, 0.90·W
  budget) and the ASS uses `WrapStyle: 2`, so a phrase is ALWAYS one line; when the next word
  won't fit, a fresh line starts and the build keeps going smoothly. Never a mid-phrase wrap.
- **More xray keywords:** ~15–22 emphasis indices per reel (generous — indices inside a
  graphic skip-window are auto-skipped). Pick meaningful nouns/verbs, not filler.
- `--skip-windows "a-b,c-d"` over every graphic window (graphics carry their own text/bg).
- Auto-size: vertical fs ≈ 138 / emphasis 221 (7.2% of 1920, ×1.6). ACRONYMS dict keeps
  AI/API/CRM/DM/KPI/ICP/VA uppercase.

```
python3 scripts/subs.py <broll.mp4> <final_transcript.json> <out.mp4> \
   --style creator-a --y 60 --emphasis "8,26,27,…" --skip-windows "14-17,34.5-40"
```

---

## Motion-graphic engine (`scripts/html-card.py`)

HTML/CSS → Chrome (Playwright, `channel:'chrome'`) → PNG/mp4. Components: node-flow, kpi-row,
chart, checklist, kinetic, icon-grid, form (`theme:dark`), dashboard (`theme:light`, `wide`,
`bar_labels`), hub, feed, sheets (+red X), slack, image. Declarative anim: `data-in`
(slide-up/left/right/drop/scale/scale-blur/draw) + `data-ease` + `data-delay/dur/dist`.

- Render clean (NO `--out-type`) so the last frame holds clean — avoids the freeze-blur.
- `--animate-seq <sec>` ≈ window length so it animates in then holds.
- 1964 Lucide icons via `node_modules/lucide-static/icons/<name>.svg`.

**Two graphics invented today (good references for "build it for the exact line"):**
- `g_clients` — white screen, 10 client rows sliding in from the side (checklist, bg light)
  for "automated tracking for all of your clients."
- `g_slackwin` — Slack #wins thread, a member closing an $8.4k deal + a Wins-bot celebration
  (slack component, bg dark) for "an automated Slack ping is sent to the community group."

---

## Per-reel reference (vertical set)

| Reel | Tailored graphics (window) | Pexels | Music |
|---|---|---|---|
| Client Wins | form 4–9 · **slack-win 9.8–13.5** · feed 19.5–24 | — | Now or Never |
| I used to build custom | chatbot icon-grid 14–17 · checklist 34.5–40 | angry phone 19–21 | Echo Sax |
| The VA Myth | build-systems flow 18–21 (held-clean) | chaos 2.6–5.5 · cash 9.8–12.5 | Echo Sax |
| Competitor | research flow 5.8–10 (held-clean) | recording cam 20.6–23.5 | Now or Never |
| Client Reporting | their-dashboard 4–8 · master-dashboard 22.8–26.8 | — (trim 0.45 lead) | Now or Never |
| Centralised | hub 4.5–7.6 (held) · sheets 7.6–9.4 · slack 9.4–11.5 · form 13.2–16 · **10-clients 29.5–33** · tracking-dash 35.8–38.8 | — | Now or Never |

All music @ 15% under voice. Landscape Centralised + Client Reporting use Echo Sax @15%.

---

## Open improvements for next time
- Sample graphic durations up-front and set windows ≤ duration (avoid held-clean patches).
- Build a per-reel "graphic plan" JSON (windows + specs) so re-edits are one source of truth.
- Idle motion in graphics (count-ups, camera push) for more life.
- The graphics are still recognisably "[BRAND] green UI" — push more visual variety per video.
