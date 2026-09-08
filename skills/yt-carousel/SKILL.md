---
name: yt-carousel
description: One-shot YouTube → [BRAND] carousel pipeline. Paste one or more YouTube URLs (with optional per-URL custom instructions), get fully-built on-brand [BRAND] carousels waiting for review in /Marketing/Carousels/{video title}/, marked yellow in Finder. Folder is named exactly like the YouTube video title so it's obvious at a glance which videos already have carousels — if a folder with that title already exists, the skill stops rather than creating a duplicate. Supports parallel processing (N URLs → N sub-agents). Auto-detects whether the video is from [YOUR_NAME]'s own channel (@[YOUR_NAME][Brand]) and, if so, deterministically builds a YouTube-thumbnail CTA slide with a unique ManyChat keyword. Trigger when the user pastes a YouTube link asking for a carousel, says "/yt-carousel <url>", "make a carousel from this video", "turn this YouTube into a carousel", or similar.
---

# /yt-carousel — YouTube → [BRAND] Carousel pipeline

Trigger: `/yt-carousel <youtube-url> [custom instructions]`, multi-line `/yt-carousel` with several URLs, or any "make a carousel from this YouTube video" intent.

## What this skill does

End-to-end:
1. Parse the argument string into a list of `(url, custom_instructions)` jobs
2. For N jobs where N > 1: dispatch N sub-agents in parallel, each runs steps 3-10 on its URL, reports back
3. Fetch metadata via YouTube Data API v3 (also determines if this is [YOUR_NAME]'s own channel)
4. Fetch the transcript (existing captions, Whisper fallback)
5. Create a folder under `/Marketing/Carousels/` named exactly like the video title, copy `profile.png` in, mark folder **Yellow** in Finder. If a folder with that title already exists, stop — this video already has a carousel.
6. Two-phase Claude AI: digest transcript → write a 6-slide [BRAND] carousel in [YOUR_NAME]'s voice, factoring in custom instructions
7. If own channel: pick an unused keyword from `used_keywords.json`, build the YouTube-thumbnail CTA slide deterministically; otherwise use the standard CTA
8. Show the draft copy. **Wait for [YOUR_NAME] to approve.**
9. Build the HTML using carousel-generator's scaffold, render PNGs via Playwright, record the keyword in `used_keywords.json`
10. Auto-open `carousel.html` in the browser, print summary + `/schedule-content` command

This skill does NOT schedule to Notion. [YOUR_NAME] reviews → he runs `/schedule-content` → that skill flips the folder color to Green.

## Routing reminder (Tool Selection Framework)

- **Quadrant**: hybrid. Deterministic plumbing wraps AI-judgment middle steps (digest + copywriting). [YOUR_NAME]-attended.
- **AI step runs inline** for single-URL mode. For multi-URL mode, each URL runs in a Sonnet sub-agent (per global model-usage feedback — never Opus for worker agents).
- **Deterministic steps shell out** to existing scripts in `~/.claude/skills/carousel-generator/scripts/`.

## Input parsing

Accept URL forms:
- `https://www.youtube.com/watch?v=...`
- `https://youtu.be/...`
- `https://www.youtube.com/shorts/...`
- `https://www.youtube.com/embed/...`
- `https://www.youtube.com/live/...`
- bare 11-char ID

**Parse the full argument string into jobs:**

- **Single URL, no extras** → one job, no custom instructions.
- **Single URL + trailing/leading text** → one job; the text is the custom instructions.
  ```
  /yt-carousel https://youtu.be/abc123defgh make the hook more contrarian and lead with the ROI
  ```
- **Multiple URLs** → one job per URL. If the input is multi-line, each line's URL owns that line's text as its custom instructions (text after the URL, or on the next line if the URL is alone). If the input is single-line with multiple URLs, any shared text applies to all jobs.
  ```
  /yt-carousel
  https://youtu.be/abc Focus on the ROI angle, be punchy
  https://youtu.be/def Lead with the client story
  https://youtu.be/ghi
  https://youtu.be/jkl
  ```
  → 4 parallel jobs; jobs 3 and 4 have no custom instructions.

If no URL is detected, stop and ask: "What YouTube URL?"

## Dispatch decision

After parsing jobs:

- **N == 1**: run steps 1-10 inline in the main conversation (interactive approval gate included).
- **N > 1**: spawn N sub-agents in parallel (single message, multiple `Agent` tool calls), each with `subagent_type: "general-purpose"` and `model: "sonnet"`. Each sub-agent runs steps 1-7 for its URL and reports back a compact result envelope (see § "Sub-agent result envelope"). The main agent aggregates, presents all drafts to [YOUR_NAME], awaits approval per draft, then runs step 8-10 for each approved draft inline (fast — it's just templating + Playwright + `open`).

Why sub-agents stop at step 7 instead of going all the way through: the approval gate requires [YOUR_NAME], and sub-agents can't interact with him. Isolating them to fetch+draft protects the main context from 4× transcripts and keeps the approval flow centralized.

## Step-by-step (single job — and inside each sub-agent)

### Step 1 — Fetch metadata

```bash
META=$(python3 ~/.claude/skills/carousel-generator/scripts/fetch_youtube_metadata.py "<URL>")
```

Capture `title`, `description`, `channel_title`, `channel_id`, `duration_seconds`, `video_url`, `thumbnail_url`.

**Own-channel check.** [YOUR_NAME]'s channel:
- `channel_id`: `[YT_CHANNEL_ID]`
- `channel_title`: `[YOUR_NAME]` (handle `@[YOUR_NAME][Brand]`)

Set `IS_OWN_VIDEO = (channel_id == "[YT_CHANNEL_ID]")`. channel_id is authoritative; don't rely on the title alone (it's mutable).

Metadata errors:
- "YOUTUBE_API_KEY not in env..." → key missing from `[WORKSPACE_ROOT]/Code Projects/ceo-dashboard/.env.local`. Stop.
- "Video not found or unavailable" → stop, surface the message.
- HTTP 403 quota error → stop, tell [YOUR_NAME] to check the key's daily quota in Google Cloud Console.

### Step 2 — Fetch transcript

Write to a URL-specific tmp path so parallel sub-agents don't clobber each other:
```bash
TRANSCRIPT_PATH="/tmp/yt_transcript_${VIDEO_ID}.txt"
python3 ~/.claude/skills/carousel-generator/scripts/fetch_youtube_transcript.py "<URL>" > "$TRANSCRIPT_PATH" 2>/dev/null
```

If exit != 0, retry once with `--whisper`. If Whisper isn't installed, surface install hint and stop this job (in multi-URL mode the sub-agent returns a failure envelope; other jobs continue).

### Step 3 — Folder + Finder color

**Folder name = the video title verbatim.** Exact case, full length, punctuation preserved. The point of this naming scheme is that a glance at `[CONTENT_ROOT]/Carousels/` shows at a glance which YouTube videos already have carousels — so no one accidentally builds a second carousel for the same video.

Only transformation: replace `/` and `:` with `-` (both break macOS paths) and trim surrounding whitespace. Do NOT slug, lowercase, or truncate.

**Collision = stop.** If the folder already exists, this video already has a carousel. Surface it to [YOUR_NAME] and stop the pipeline — don't append `-2`, don't overwrite. If he wants a fresh draft, he renames or deletes the existing folder first.

```bash
# Pass the title via an env var — keeps apostrophes, quotes, ampersands, emoji all intact.
export YT_TITLE='<TITLE>'                              # claude substitutes the exact title here
FOLDER=$(python3 -c "import os; t=os.environ['YT_TITLE'].strip(); print(t.replace('/','-').replace(':','-'))")
CAROUSEL_DIR="[CONTENT_ROOT]/Carousels/$FOLDER"

if [ -d "$CAROUSEL_DIR" ]; then
  echo "✗ A carousel already exists for this video:"
  echo "    $CAROUSEL_DIR"
  echo "  Rename or delete it first if you want a fresh draft."
  exit 1
fi

mkdir -p "$CAROUSEL_DIR"
cp "~/.claude/skills/carousel-generator/assets/profile.png" "$CAROUSEL_DIR/profile.png"
osascript -e "tell application \"Finder\" to set label index of (POSIX file \"$CAROUSEL_DIR\" as alias) to 3" >/dev/null 2>&1 || true
```

All downstream steps use `"$CAROUSEL_DIR"` (double-quoted) so spaces, `&`, and other special chars in folder names work with `open`, `cp`, `mkdir`, the export script, and osascript. Never strip the quotes.

In multi-URL mode, a collision on one URL fails that sub-agent only — other sub-agents continue. The main agent surfaces the collision as part of the batch summary.

### Step 4 — AI Phase A: digest

Read these references (only at this step, not upfront):
- `~/.claude/skills/carousel-generator/references/copy-patterns.md`
- `[CONTENT_ROOT]/Ideal Client Profile/icp.md`
- `~/.claude/skills/carousel-generator/references/brand.md`

Extract 8-10 distinct insights, claims, mechanisms, contrarian takes, specific numbers, or quotable moments that would resonate with the [BRAND] ICP (agency owners $50K-$200K MRR, systems thinkers). Numbered list, no commentary.

If transcript > 30,000 chars: chunk into ~10-min segments, summarize each, then combine.

### Step 5 — AI Phase B: draft 6 slides

Using the digest, draft a 6-slide [BRAND] carousel. **Respect custom instructions** if they were passed with the URL — they override the default arc/hook style, not the brand rules (first-person, surface rhythm, banned patterns, etc.).

Hard rules (unchanged from brand):
- First-person singular always: "I" not "we"
- Short sentences. Fragments are fine
- Specifics over abstractions
- Contrast creates attention
- Surface arc default: gradient → beige → gradient → white → beige → gradient (slide 1 is ALWAYS gradient; see brand.md "Visual rhythm rule"). Never break this unless the video's shape demands it.
- Slide arc may flex if the video's shape demands it (see copy-patterns.md)
- Hero hook: bold claim / contrarian take / pattern interrupt / direct call-out / stat that sounds wrong
- Banned: "Here's how to…", "In this post I'll…", "unlock", "transform", yes/no questions
- Green on beige/white; gold ONLY on gradient

### Step 6 — CTA slide selection

**If `IS_OWN_VIDEO == true`:**

1. Read `~/.claude/skills/yt-carousel/used_keywords.json`.
2. Pick a keyword that fits the video's topic AND is NOT in `used[]`. Rules: ONE uppercase word, ≤10 chars, easy to spell. There is NO fixed pool — every own-video carousel gets its own ManyChat automation because the DM payload (the YouTube link) is different per video, so each keyword is disposable and video-specific. Just don't reuse a keyword that's already wired to a different video's automation.
3. Draft the CTA slide with:
   - 15-min deep-dive framing, like: "I recorded the full breakdown on YouTube." or "I made a video going over this in more detail." Keep it first-person and specific.
   - YouTube thumbnail embedded (base64 — fetched in step 8) with the play-button overlay.
   - `Comment <KEYWORD> and I'll DM you the link.` — keyword in gold (`var(--brand-accent-gold)`).
   - `@[IG_HANDLE]` visibly beneath the CTA headline.
4. Hold off on writing to `used_keywords.json` until after [YOUR_NAME] approves (step 7.5).

Visual reference for the CTA slide layout: see `references/components.md` § YouTube thumbnail CTA slide. The thumbnail card sits centered, slightly above the CTA headline; the keyword is gold; the rest is white.

**If `IS_OWN_VIDEO == false`:**

Use the standard follow/DM CTA — a single action, `@[IG_HANDLE]` visible. Do NOT embed a thumbnail (that framing implies "my video, go watch it" and only makes sense for [YOUR_NAME]'s own uploads). Default CTA for third-party videos: `Follow @[IG_HANDLE] for more systems like this.`

### Step 7 — Output drafts for approval

Show all 6 slides to [YOUR_NAME] as plain markdown:

```
**Slide 1 (Hero, beige)**
> <hook>

…

Keyword (unused, own video): SYSTEM
Source video: <title> — <video_url>
Channel: <channel_title> (own=<true|false>)
Custom instructions applied: <none | the user's text>

Approve as-is, or tell me what to change before I build the HTML.
```

**In multi-URL mode**, the sub-agent does NOT wait. It returns the draft envelope to the main agent (see § "Sub-agent result envelope"), which aggregates all drafts and presents them together to [YOUR_NAME] for batch approval.

### Step 7.5 — Wait for approval (main-agent-only)

Main agent only. Do NOT proceed to HTML until [YOUR_NAME] approves. If he edits a slide or keyword, apply, re-show, wait again.

On approval of a keyword for an own-video carousel: append the keyword + folder + video_url to `used_keywords.json` (both `used[]` and `history[]`). Use `python3` with `json.load` / `json.dump` so you don't corrupt the file:

```bash
python3 <<'PY'
import json, datetime
p = "~/.claude/skills/yt-carousel/used_keywords.json"
with open(p) as f: data = json.load(f)
kw = "<KEYWORD>"
if kw not in data["used"]:
    data["used"].append(kw)
data["history"].append({
  "keyword": kw,
  "folder": "<FOLDER>",
  "video_url": "<VIDEO_URL>",
  "approved_at": datetime.date.today().isoformat(),
})
with open(p, "w") as f: json.dump(data, f, indent=2)
PY
```

### Step 8 — Build the carousel HTML

Use `~/.claude/skills/carousel-generator/assets/template.html` as the scaffold. Populate per `references/components.md`.

For own-video carousels, fetch the thumbnail as a base64 data URI (so it survives the Playwright export):

```bash
THUMB=$(python3 ~/.claude/skills/carousel-generator/scripts/fetch_youtube_thumbnail.py "<URL>")
```

Embed as the `src` of the thumbnail `<img>` on the CTA slide.

Write to `$CAROUSEL_DIR/carousel.html`.

### Step 9 — Render PNGs

```bash
python3 ~/.claude/skills/carousel-generator/scripts/export_carousel.py \
  --html "$CAROUSEL_DIR/carousel.html" \
  --out  "$CAROUSEL_DIR" \
  --slides <N>
```

### Step 10 — Open in browser + print summary

```bash
open "$CAROUSEL_DIR/carousel.html"
```

Summary (own-video carousel):
```
✓ Carousel ready for review.
  Folder:        [CONTENT_ROOT]/Carousels/<folder>/
  Slides:        N PNGs (1080×1350)
  Source video:  <title>
                 <video_url>
  Own channel:   yes
  Keyword:       <KEYWORD>
  Status:        Yellow (pending review)

  ⚠️  ManyChat reminder:
      Set up a new automation that triggers on comment keyword "<KEYWORD>"
      and DMs the link: <video_url>
      (Each own-video carousel gets its own automation — the keyword only
       exists to route back to THIS video.)

  When you're happy, schedule it:
    /schedule-content "<folder>"          ← quotes required; folder names have spaces
```

Summary (third-party video):
```
✓ Carousel ready for review.
  Folder:        [CONTENT_ROOT]/Carousels/<folder>/
  Slides:        N PNGs (1080×1350)
  Source video:  <title>
                 <video_url>
  Own channel:   no
  Status:        Yellow (pending review)

  (No ManyChat setup needed — third-party CTA is a plain follow.)

    /schedule-content "<folder>"          ← quotes required; folder names have spaces
```

## Sub-agent prompt template (multi-URL mode)

When spawning each sub-agent, send a self-contained prompt like:

```
You are running ONE iteration of the yt-carousel skill for a single YouTube URL.

URL: <url>
Custom instructions (may be empty): <text>

Follow ~/.claude/skills/yt-carousel/SKILL.md steps 1 through 7 exactly, inline. Do NOT do step 7.5 (approval), step 8, step 9, or step 10 — those are the main agent's job. Read the brand/copy/icp references when you reach Phase A; don't load them upfront.

Use model: sonnet. Use file paths unique to this video so parallel jobs don't collide (transcript at /tmp/yt_transcript_<VIDEO_ID>.txt, etc.).

When you're done, return ONE message with this JSON envelope and nothing else:

{
  "status": "ok" | "failed",
  "video_id": "...",
  "video_url": "...",
  "title": "...",
  "channel_title": "...",
  "is_own_video": true | false,
  "folder": "...",
  "carousel_dir": "/absolute/path",
  "proposed_keyword": "SYSTEM" | null,          // only when is_own_video is true
  "slides": [
    { "n": 1, "surface": "light" | "white" | "gradient", "role": "hero" | "problem" | ... , "copy": "…markdown…" },
    …6 entries total
  ],
  "notes": "anything the main agent should know (short)",
  "error": "..."                                 // present iff status == "failed"
}
```

Do not include any commentary around the JSON. The main agent parses it.

## Main-agent aggregation (multi-URL mode)

After all sub-agents return:

1. Surface a compact table to [YOUR_NAME]: video title / own? / proposed keyword / folder. Also flag any sub-agents that failed on folder collision (video already has a carousel) so they don't get mixed in with real drafts.
2. Show each set of 6 slides, one carousel at a time.
3. Await approval per carousel. [YOUR_NAME] may approve all at once ("approve all"), approve individually, or request edits on specific slides of specific carousels.
4. For each approved carousel: run steps 7.5 (write keyword), 8 (build HTML — inline in the main agent is fine), 9 (export PNGs), 10 (open + summary).
5. When picking keywords across a parallel batch, ensure uniqueness *within the batch too* — if two sub-agents independently propose the same keyword, the main agent re-picks one of them to a different unused keyword before writing either to `used_keywords.json`.

## Keyword tracker (`used_keywords.json`)

Path: `~/.claude/skills/yt-carousel/used_keywords.json`

Schema:
```json
{
  "used":    ["SYSTEM"],
  "history": [
    { "keyword": "SYSTEM", "folder": "…", "video_url": "…", "approved_at": "2026-04-20" }
  ]
}
```

Rules:
- No fixed pool. Each own-video carousel gets its own ManyChat automation (keyword → DM the specific YouTube link). Keywords are picked per-video to fit the topic.
- Exclude everything in `used[]` when picking — never reuse, because a keyword that's already wired to video A's DM flow would ambiguously fire for video B too.
- Only append to `used[]` and `history[]` — never rewrite or remove entries. Past keywords stay tied to their live automations forever.
- Only write after [YOUR_NAME] approves the carousel copy. An abandoned draft should not reserve a keyword.
- Each `history[]` entry records the folder + video URL so [YOUR_NAME] can trace back which ManyChat automation points to which video.

## Folder color reference (macOS Finder)

| Index | Color  |
|------:|--------|
|     0 | None   |
|     1 | Orange |
|     2 | Red    |
|     3 | Yellow |
|     4 | Blue   |
|     5 | Purple |
|     6 | Green  |
|     7 | Gray   |

This skill sets index `3` (Yellow). `/schedule-content` flips it to `6` (Green) on success.

## Failure modes

| Failure | Behavior |
|---|---|
| YT API key missing | Stop. Surface the missing-key message pointing to ceo-dashboard/.env.local |
| Video not found / private | Stop. Surface the API error |
| Transcript unavailable, no `--whisper` | Auto-retry with `--whisper`. If yt-dlp/whisper not installed, surface install hint and stop |
| Folder already exists | **Stop.** This video already has a carousel. Surface the path; [YOUR_NAME] renames or deletes it first if he wants a fresh draft. |
| osascript can't tag folder | Continue (non-fatal) |
| Playwright not installed | Surface install command from export_carousel.py and stop |
| [YOUR_NAME] asks for slide edits | Apply edits, re-show, wait again |
| Sub-agent fails in multi-URL mode | Surface the failure for that video, continue with the others |
| `used_keywords.json` missing/corrupt | Recreate from the seed `{ "used": [], "history": [] }` and flag it to [YOUR_NAME] |

## Out of scope

- Notion scheduling (handled by `/schedule-content`)
- IG caption tuning (handled by `/schedule-content`)
- ManyChat keyword automation setup in the ManyChat dashboard (manual — [YOUR_NAME] wires each approved keyword to a DM-trigger workflow)
- ceo-dashboard form integration (v2)

## Examples

**Single URL, no custom instructions (own channel):**
```
User: /yt-carousel https://youtu.be/<video_id>
Claude: [fetches metadata, sees channel_id = UCd1…, picks unused keyword from used_keywords.json, drafts 6 slides with YT thumbnail CTA, asks for approval]
User: approve
Claude: [writes keyword to JSON, builds HTML, exports PNGs, opens browser, prints summary]
```

**Single URL + custom instructions:**
```
User: /yt-carousel https://youtu.be/abc123 make the hook a contrarian take on agency hiring
Claude: [applies the custom instruction to the hook, standard flow otherwise]
```

**Multiple URLs — 4 in parallel:**
```
User: /yt-carousel
https://youtu.be/aaa Focus on the ROI angle
https://youtu.be/bbb Lead with the client story
https://youtu.be/ccc
https://youtu.be/ddd
Claude: [spawns 4 sonnet sub-agents in one message, each returns a JSON envelope, main agent presents 4 draft carousels, awaits approval, builds each approved carousel]
```

**Third-party video (not [YOUR_NAME]'s channel):**
```
User: /yt-carousel https://youtu.be/someoneelse
Claude: [channel_id != UCd1…, uses standard "Follow @[IG_HANDLE]" CTA, no thumbnail on last slide, no keyword]
```
