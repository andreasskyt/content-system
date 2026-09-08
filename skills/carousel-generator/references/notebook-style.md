# Notebook style (black, hand-drawn, animated)

Approved by [YOUR_NAME] 2026-09-07 on `Sep Batch/system-matrix/`. Use when a carousel's point IS a drawing (a matrix, a flow, a before/after sketch) and it should feel like looking into his notebook. This is a **motion** style: it renders through `/motion-carousel`, not through this skill's HTML exporter. This file is the style contract; the engine lives in `motion-carousel/remotion/src/components/Sketch.tsx`.

## The look

- **Surface:** black `#0A0A0A` (`surface: "black"`). No lockup, no profile picture. Progress bar stays (gold on black).
- **Drawn things:** gold `#BCAC8B` for shapes and handwritten labels, ink `rgba(255,255,255,0.78)` for axes and neutral labels. Every stroke has a slight bow (never ruler-straight) and runs through the `sketch` displacement filter so the line wobbles like a pen.
- **Handwriting:** Caveat (Google Fonts, 600 for labels, 700 inside shapes). Only for things that belong ON the drawing: axis labels, box labels, notes, the open-loop line under the body.
- **Typeset things use the [WEBSITE_DOMAIN] stack, not Poppins** ([YOUR_NAME], 2026-09-08). Headline: Bricolage Grotesque 700, 64px, caps, centered, `-0.03em`, `text-wrap: balance`. Body: Instrument Sans 400, 30px, centered, max 900px. Emphasis inside typeset copy: Playfair Display italic 400 in gold, 1.06em (the website's signature move; `_word_` in the closer's `subhead`). Handwritten labels stay Caveat. Force headline breaks with `\n` when balance wraps badly (e.g. `There is no\n"do it by hand" box`); never let a quoted phrase split across lines.
- **Constant element:** the drawing sits in the same position on every slide and carries over. Whatever a previous slide drew is already on screen at frame 0 of the next one (`pre: true` / lower `stage`), so the swipe reads as one continuous drawing.

## Motion rules (the part that makes it feel drawn)

1. **Drawn things draw.** Paths animate along their length with an ease-out (the pen slows at the end of a stroke). Handwritten text reveals left to right like it's being written, whatever its anchor. Fills fade in after their outline closes. Nothing drawn ever fades in or pops.
2. **Typeset things fade.** Headline fades up at frame 4. Body fades up after the last pen stroke. Loop line fades up ~22 frames after the body. No per-word kinetic text in this style.
3. **One thing draws per slide.** The hook slide draws the frame (axes, arrows, labels). Every following slide adds exactly one element. The closer either lights everything (glow) or is text only.
4. **Timing per slide, 300 frames (10s at 30fps):** headline 0 to 15 · drawing 15 to ~75 · body ~78 to 110 · hold to 300. The readable state must land by ~3.5s, so an IG viewer who swipes early still gets it, and the loop restart is a hold, not a redraw.
5. **Frame 0 of slide 1 is the Instagram cover.** IG uses the first frame of the first video as the grid thumbnail and there is no API way to set a cover on a carousel child. So slide 1 never starts black: headline fully visible at frame 0 (no fade on that slide) plus the finished drawing blurred as a teaser (`"teaser": true` on `matrix`), which holds 0.6s and dissolves while the real drawing starts. Check the exported `slide_1.png` (rendered at frame 0) before scheduling. Also: carousels with video can't be hidden from the profile grid, so the cover has to hold up there.
6. **Glow only on the payoff.** Gaussian-blur gold wash at 0.3 opacity, breathing ±0.14 on a 3s sine. Never on more than one element.

## Copy rules

- Headline caps, max 6 words. Anything longer moves to the body.
- Body 25 to 45 words, ends with a hanging line (colon, question, or "Notice what's missing:") that the next slide answers. The hanging line is the gold Caveat `subhead`.
- No CTA unless [YOUR_NAME] asks. The matrix carousel shipped with none.
- Handwritten labels are lowercase, 1 to 3 words, wrapped to two lines above ~10 characters.

## How to build one

```bash
SLUG="my-drawing"
DIR="[CONTENT_ROOT]/Carousels/$(date +%b) Batch/$SLUG"
mkdir -p "$DIR" && cp ~/.claude/skills/motion-carousel/assets/profile.png "$DIR/profile.png"
# write specs JSON (below) to /tmp/specs_$SLUG.json and $DIR/specs.json
python3 ~/.claude/skills/motion-carousel/scripts/render_carousel.py --spec-file /tmp/specs_$SLUG.json --out-dir "$DIR" --slug $SLUG --mode draft   # then --mode final
python3 ~/.claude/skills/motion-carousel/scripts/build_preview_html.py --out-dir "$DIR"
```

Output per slide: `slide_N.mp4` (1080x1350, 30fps, 10s) + `slide_N.png` (5s frame, fully drawn). For slide 1 re-render the PNG at `--frame=0`: that is what Instagram shows in the grid. `carousel.html` is the swipe preview with autoplaying MP4s.

### Spec, two slide types

**`matrix`** (the 2x2, fixed layout, `stage` 0..5):

```json
{"slideType":"matrix","surface":"black","showLockup":false,"durationFrames":300,
 "headline":"Every task gets a system","subhead":"Two axes tell you which shape:",
 "matrix":{"stage":0,
   "axisX":["you start it","it starts itself"],"axisY":["same every time","different every time"],
   "labels":["on demand","automate it","AI assists, you decide","AI decides, you check"]}}
```
stage 0 = axes draw (add `"teaser": true` on slide 1 for the blurred-cover thumbnail) · 1..4 = one quadrant each (BL, BR, TL, TR) · 5 = all lit, top-right glows · `"textOnly": true` = closer without the drawing, uses `body` + `items` ("Label: text" rows) + `subhead` (supports `*gold*` and `_italic_`, newline = new line).

**`sketch`** (any drawing, all data). Coordinates are in the 1080x1350 frame, keep the drawing inside y 280..900:

```json
{"slideType":"sketch","surface":"black","showLockup":false,"durationFrames":300,
 "headline":"Messy in. Clean out.","body":"...","subhead":"Now automate it:",
 "sketch":{
   "strokes":[
     {"line":[140,420,420,600,2],"start":14,"dur":30},
     {"rect":[470,520,180,160,5],"start":70,"dur":40,"stroke":"gold"},
     {"arrow":[770,600,"right"],"start":126,"dur":8},
     {"d":"M 100 300 Q 200 250 300 300","start":20,"dur":30,"pre":true}
   ],
   "fills":[{"rect":[790,520,180,160,7],"start":170,"dur":24,"glow":true}],
   "texts":[{"x":880,"y":600,"text":"booked","anchor":"middle","start":178,"dur":22,"color":"gold","size":44}]}}
```
- `line` = [x1,y1,x2,y2,seed] bowed line · `rect` = [x,y,w,h,seed] wobbly box · `arrow` = [tipX,tipY,dir] arrowhead · `d` = raw SVG path.
- `seed` changes the wobble so repeated shapes are not copies. Use a different seed per shape.
- `start`/`dur` in frames. `pre: true` = already drawn at frame 0 (carry-over from the previous slide). `stroke`/`color`: `"ink"` (default), `"gold"`, or any CSS color.
- `text` accepts a string or an array of lines. Reveal is always left to right.
- Body fades in 6 frames after the last non-pre stroke or text finishes. Override nothing, just set the drawing's timing.

## Posting

Video slides go to Notion as MP4s through the public File Upload API (`$NOTION_TOKEN`), `content_type: video/mp4`, attached to `Carousel Images` on the CPP row. Notion MCP attachments are invisible to n8n.

**The unified auto-poster (`[N8N_WF_AUTOPOSTER_ID]`) supports video slides since 2026-09-08.** Its carousel branch keeps each file's real extension on S3, creates `VIDEO` child containers for mp4/mov and `IMAGE` for png/jpg, and polls every child until `FINISHED` before building the carousel container. Mixed carousels work.

**Incident 2026-09-08:** before that fix, a row with MP4s was posted by the image-only branch and Instagram rendered still frames on every slide. [YOUR_NAME] deleted the post. Rule: never leave a video-carousel row on `Ready` unless the poster's video path has been verified on the live workflow. If in doubt, keep the row on `To Review`.

## Reference build

`Marketing/Carousels/Sep Batch/system-matrix/` — six slides, `specs.json` is reusable as a template.
