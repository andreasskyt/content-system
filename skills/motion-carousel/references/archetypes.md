# Slide archetypes — motion-carousel

Every slide in a motion carousel maps to exactly one archetype. Pick by role in
the arc, not by "what looks cool." One showpiece archetype (terminal-demo,
kinetic-photo, data-flow, code-reveal, or chart-bars) MUST appear in every
carousel — that's the reason this skill exists instead of `carousel-generator`.

Two showpieces max in a 7-slide carousel. Motion fatigue is real.

---

## Standard archetypes (animated versions of carousel-generator layouts)

| slideType  | Role                    | Best surface | When to use |
|------------|-------------------------|--------------|-------------|
| `hero`     | Scroll-stop hook        | gradient     | Slide 1, always. One bold claim. Use `emphasisWord` + `emphasisStyle` ("underline", "highlight", or "circle") for the word that anchors the eye. |
| `problem`  | "The old way" pain list | white/light  | 3-4 short jabs about what's broken. Items get strikethrough animation — use literal short phrases, not full sentences. |
| `shift`    | Pivot / reframe         | gradient     | The one-liner that reframes the problem into a solution. Subhead = uppercase category tag in gold. |
| `feature`  | Proof / mechanism       | light/white  | 3-5 benefits with checkmarks. Crisp, specific, no hedging. |
| `stat`     | One number that wows    | gradient     | A single number the audience will remember. Optional prefix/suffix ($, hrs, %, etc.) and a one-line label. |
| `steps`    | How it works            | white/light  | 3-5 numbered steps. Keep each step ≤ 8 words. |
| `cta`      | One action              | gradient     | Final slide. Usually "Follow for more" or "Comment KEYWORD". Pulses on entrance. |
| `quote`    | Authority / thesis      | any          | Oversized quote marks + short punchy quote + attribution. Best when quoting an expert or [YOUR_NAME] himself. ≤ 14 words. |

---

## Showpiece archetypes (only in motion-carousel)

Every carousel needs at least ONE of these.

### `terminal-demo` — Living Documentation
Prove a technical claim by showing the command run in real time.
```json
{ "slideType": "terminal-demo", "surface": "gradient",
  "headline": "30 seconds to install.",
  "terminal": { "prompt": "~/brand $", "command": "npm install @anthropic-ai/claude-code",
                "durationSec": 2.0, "output": ["added 47 packages in 1.8s"] } }
```
Use when: the claim is about speed/simplicity of a shell command. ≤ 60 chars.

### `code-reveal` — Living Documentation (multi-line)
Syntax-highlighted code block that reveals line-by-line with a scanning bar.
```json
{ "slideType": "code-reveal", "surface": "gradient",
  "headline": "The whole workflow in 14 lines.",
  "code": {
    "language": "tsx",
    "content": "export const agent = ...;\nagent.tool('gmail', ...)\n..."
  } }
```
Use when: you need to SHOW the code structure (not just type a command). Max ~15 lines visible. Prefer for React components, SQL queries, n8n node configs.

### `kinetic-photo` — Personal Masterclass
Full-bleed photo of [YOUR_NAME] + headline writing across the negative space.
```json
{ "slideType": "kinetic-photo", "surface": "gradient",
  "headline": "I stopped hiring editors.",
  "subhead": "Chief of AI",
  "photo": { "src": "/absolute/path/to/[your_name]-studio.jpg", "focus": "right" } }
```
Use when: you have a studio photo AND the slide benefits from [YOUR_NAME]'s presence (hero, shift, or CTA variants). `focus` tells the layout which side the subject is on — text lands opposite.

### `data-flow` — Process Visualization
Nodes connected by an animated rail with a pulse traveling across.
```json
{ "slideType": "data-flow", "surface": "gradient",
  "headline": "One prompt. Three systems.",
  "flow": { "nodes": [{"label":"Notion","emoji":"📝"},{"label":"Claude","emoji":"🤖"},{"label":"Gmail","emoji":"✉️"}],
            "highlight": "Claude" } }
```
Use when: explaining a multi-system automation. Max 4 nodes.

### `chart-bars` — Animated Data
Horizontal bar chart with values that count up as bars grow.
```json
{ "slideType": "chart-bars", "surface": "gradient",
  "headline": "Where the hours went.",
  "chart": { "bars": [
    {"label":"Meetings","value":18,"suffix":"h"},
    {"label":"Editing","value":22,"suffix":"h","highlight":true},
    {"label":"Emails","value":11,"suffix":"h"}
  ] } }
```
Use when: you have 3-5 data points that tell a story together. Use `highlight: true` on the ONE bar you want the eye on.

---

## Supporting archetypes (structural)

### `comparison` — Before / After split
Two columns side-by-side: "before" (beige, red X's, strikethroughs) vs "after" (gradient card, gold checkmarks). Divider draws in first.
```json
{ "slideType": "comparison", "surface": "light",
  "headline": "The old way vs the AIOS way.",
  "comparison": {
    "beforeLabel": "The old way",
    "beforeItems": ["Hire 5 editors", "Pay $12k/mo", "3-day turnaround"],
    "afterLabel": "Now",
    "afterItems": ["One Claude agent", "Pay $200/mo", "4-hour turnaround"]
  } }
```

### `timeline` — Horizontal progression
Horizontal rail with milestone dots. Labels alternate above/below. Rail draws in, dots scale-in with stagger.
```json
{ "slideType": "timeline", "surface": "gradient",
  "headline": "How I built it in a weekend.",
  "timeline": { "milestones": [
    {"time":"Fri 8pm","label":"Draft spec"},
    {"time":"Sat 2pm","label":"Wire Claude agent"},
    {"time":"Sun 4pm","label":"Ship v1"}
  ] } }
```
Use when: showing a sequence of events with time anchors (hours, days, Q1-Q4, etc.). 3-5 milestones.

---

## Effects (opt-in on ANY slide)

Add `"effects": { "particles": "confetti" | "sparkle" | "grain" }` to any slide spec.

- **`confetti`** — Gold/white flakes falling from the top. Use sparingly: CTA climax slides, stat slides with a "win" number.
- **`sparkle`** — Gold dots twinkling across the slide. Use on quote slides with an aspirational line, or a hero slide.
- **`grain`** — Subtle film grain texture. Use on `kinetic-photo` or any gradient slide for editorial feel.

Never stack two effects. Never use confetti on more than one slide per carousel.

---

## Emphasis variants (hero + shift)

`emphasisStyle` on `emphasisWord` — the mark that draws around a key word:

- **`underline`** (default) — Red pen stroke under the word. Use when the emphasized word is the claim itself ("poor", "wrong", "now").
- **`highlight`** — Yellow marker stroke behind the word. Use when emphasizing a noun phrase or named thing ("Claude Code", "$200").
- **`circle`** — Gold hand-drawn circle around the word. Use for strong personal assertions or numbers ("1 person", "30 seconds").

---

## Decision tree

1. **Slide 1 is always `hero` or `kinetic-photo`.** Never start with a list or a stat.
2. **Slide N (last) is always `cta`.** One action, one handle, one keyword max.
3. **At least ONE showpiece between hero and CTA.** Pick by topic:
   - Technical install / command → `terminal-demo`
   - Multi-line code / config → `code-reveal`
   - Personal story / authority → `kinetic-photo`
   - Automation / pipeline → `data-flow`
   - Numeric argument with 3+ data points → `chart-bars`
4. **At most 2 showpieces** in a 7-slide carousel. More = motion fatigue.
5. **Structural slides (`comparison`, `timeline`, `quote`)** count as standard archetypes, not showpieces — they can be used freely.
6. **Surface rhythm**: never two `light` or two `white` in a row. Alternate against gradient.
7. **Effects**: confetti/sparkle at most ONCE per carousel. Grain can be on multiple slides if it fits the aesthetic.

---

## Notebook style archetypes (surface "black" only)

Approved 2026-09-07 (`Sep Batch/system-matrix/`). Full style contract, timing and spec examples: `~/.claude/skills/carousel-generator/references/notebook-style.md`. Short version: drawn things draw in like a pen (paths along their length, handwriting left to right), typeset things fade, one new element per slide, 300 frames per slide, no lockup, no CTA unless asked.

### `matrix` — hand-drawn 2x2 that builds across the carousel
```json
{ "slideType": "matrix", "surface": "black", "showLockup": false, "durationFrames": 300,
  "headline": "Every task gets a system", "subhead": "Two axes tell you which shape:",
  "matrix": { "stage": 0, "axisX": ["you start it","it starts itself"], "axisY": ["same every time","different every time"],
              "labels": ["on demand","automate it","AI assists, you decide","AI decides, you check"] } }
```
`stage` 0 = axes draw · 1..4 = one quadrant each (BL, BR, TL, TR), earlier ones pre-drawn · 5 = all lit + top-right glow · `textOnly: true` = closer with `body` + `items` ("Label: text") + `subhead` (`*gold*`, `_italic_`, `\n`).

### `sketch` — any drawing, from JSON
Strokes (`line`, `rect`, `arrow`, raw `d`) draw in on `start`/`dur`, handwritten `texts` write in, gold `fills` fade after. `pre: true` carries an element over from the previous slide. Keep the drawing inside y 280..900. Body fades in after the last pen stroke automatically.
