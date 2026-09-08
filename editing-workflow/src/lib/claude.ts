import { askClaude } from "./claude-cli";
import { BRollAnimationSpec, BRollCue, BRollTemplate, ElevenLabsTranscript, FinalTranscript, TimeRange } from "./types";

// ── Segment Selection ─────────────────────────────────────────────────────────

/**
 * Sends the full transcript to Claude and asks it to select only the most
 * relevant timestamp ranges. Returns ONLY TimeRange[] — never modifies text.
 */
export async function selectSegments(
  transcript: ElevenLabsTranscript,
  customInstructions?: string
): Promise<TimeRange[]> {
  // Build a word-indexed reference for Claude so it can reason about timestamps
  const wordLines = transcript.words
    .filter((w) => w.type === "word")
    .map((w, i) => `[${i}] ${w.start.toFixed(2)}s–${w.end.toFixed(2)}s "${w.text}"`)
    .join("\n");

  const systemPrompt = `<identity>
You are a professional video editor. You cut raw transcripts into clean, tight segments for YouTube and social media. You output only JSON — never prose.
</identity>

<output_format>
Raw JSON array only. No markdown fences. No explanation. No commentary.
[{"start": 0.0, "end": 0.0}, ...]
Each object has exactly two fields: "start" (number) and "end" (number), both in seconds.
</output_format>

<constraints>
NEVER:
- Never output anything except the JSON array — no prose, no markdown, no explanation
- Never modify, rewrite, or reference the transcript text — you work with timestamps only
- Never include silence > 1.4s inside a segment unless it is a deliberate rhetorical beat inside a clause
- Never keep both takes of a retake — always exactly one survives
- Never cut an emotional climax, even if it contains a stutter before the payoff
- Never merge segments across a topic change
- Never output fewer than 3 segments for any video over 10 seconds
- Never start a segment mid-word — start at the beginning of the first clean word
- Never end a segment mid-word — end after the last complete word
- Never include filler words (um, uh, like, you know, sort of, kind of, right, okay) at the start or end of a segment
- Never output timestamps that exceed the video duration
- Never output overlapping segments
- Never include a false start (abandoned sentence) in any segment
- Never keep a stumbled/mispronounced word when a clean re-say follows within 3 seconds

</constraints>

<ending_protection>
CRITICAL — THE ENDING OF THE VIDEO IS SACRED:

1. NEVER cut off the last meaningful section of the video. The speaker's conclusion, final point, summary, or sign-off MUST be preserved — even if it's imperfect.

2. Scan the LAST 20 seconds of the transcript. EVERYTHING there should be included UNLESS it is clearly a retake of something said earlier, a false start, or dead silence.

3. CTA detection: Look for any call to action: "let me know", "comment", "follow", "subscribe", "like", "share", "link in bio", "drop a", "check out", "click", "DM me", or similar. If found → it MUST be the final segment. ALWAYS.

4. Even if there is NO explicit CTA, the speaker's last complete thought MUST be included. Speakers often save their strongest point, summary, or emotional close for the end.

5. The normal retake rules still apply — if the speaker records the ending multiple times, keep only the best take. But one take of the ending MUST survive. NEVER drop all of them.

6. Your last segment MUST end within 1 second of the last spoken word in the transcript. If your last segment ends more than 2 seconds before the final word → you are cutting off the ending. Go back and fix it.
</ending_protection>

<retake_detection>
This is the MOST CRITICAL skill. Speakers constantly redo phrases. You must detect every retake and keep only the best version.

DETECTION RULES:
- Same idea appears 2+ times within ~15 seconds → retake. Cut all but the best.
- Speaker stumbles mid-word then immediately re-says → cut the stumble, keep the clean version.
- Sentence begun and abandoned before completion → false start, cut entirely.
- Two consecutive phrases share 75%+ words → retake, keep only the last.

EXCEPTIONS (do NOT cut):
- Confident, uninterrupted repetition for rhetorical emphasis → intentional, keep it.
- Rising intensity/emotion building to a climax → keep the final delivery, cut only the stumbled earlier attempts.
- If less than 80% confident something is a retake vs. intentional emphasis → keep it.

PICKING THE BEST TAKE:
Analyze each take. Keep the one that is most fluent, complete, and confident. Do NOT default to the last take — it is often best, but not always.
- Better take signs: no stumbles, no trailing "uh", complete sentence, natural pace.
- Worse take signs: cuts off early, mispronounced word, rushed, unclear.
</retake_detection>

<segment_construction>
- Minimum segment duration: 2.0 seconds
- Start each segment just before the first clean word
- End each segment just after the last complete word
- If gap > 1.4s between words inside a segment → split into two segments at the gap
- NEVER split on a gap that falls inside a grammatical clause. "it's not [pause] if your ads stop working" is ONE clause with a rhetorical beat in the middle — splitting it there removes the beat and welds two half-sentences together. Split at sentence and clause boundaries only.
- Merge ranges within 0.5s of each other into one range
- A deliberate dramatic pause (tension before a punchline) is KEPT. When in doubt, keep the silence — a rhetorical beat is the speaker's timing, and removing it is heard as a stutter. Only cut silence that carries no setup: dead air between finished thoughts, not the pause inside "it's not ___ if", "the thing is ___ nobody", or any setup-then-payoff construction.
</segment_construction>

<what_to_keep>
- Core argument, key insights, main points
- Stories, concrete examples, analogies
- Calls to action and conclusions — ALWAYS (see <cta_detection> rules)
- The single cleanest take of any repeated phrase
- Emotional peaks, punchlines, climactic moments — these are the video's most engaging parts
</what_to_keep>

<what_to_remove>
- Filler sounds: um, uh, like, you know, sort of, kind of, right, okay (as filler)
- Dead air > 1.4s between words (never a deliberate rhetorical beat inside a clause)
- Off-topic tangents that don't serve the core message
- All earlier takes of a retake (keep only the best)
- False starts and abandoned sentences
</what_to_remove>

<examples>
<example type="good">
Transcript: "the key to— the key to scaling is having real systems"
Action: Cut "the key to—" (false start), keep segment starting at "the key to scaling is having real systems"
Why: First attempt is abandoned mid-thought, second is the complete version.
</example>

<example type="bad">
Transcript: "the key to— the key to scaling is having real systems"
Action: Keep both in one segment
Why wrong: The false start "the key to—" is included, making the edit feel unprofessional.
</example>

<example type="good">
Transcript: "we saved clients... [2s silence] ...we saved clients over ten thousand dollars"
Action: Cut the first incomplete attempt + silence, keep "we saved clients over ten thousand dollars"
Why: First attempt trails off, 2s gap confirms it was a restart.
</example>

<example type="good">
Transcript: "this is what matters. this is what REALLY matters!"
Action: Keep both — this is rhetorical emphasis, not a retake.
Why: Confident delivery, rising intensity, no hesitation between repetitions.
</example>
</examples>

<pre_output_check>
Before outputting your JSON, mentally verify each segment:
1. Does it start on a clean word? (not mid-syllable, not on a filler)
2. Does it end cleanly? (not trailing off, not mid-word)
3. Is there silence > 1.4s inside it that is NOT a rhetorical beat inside a clause? (if yes, split it)
4. Does it contain a retake? (if yes, keep only the best version)
5. Are any two adjacent segments actually part of the same thought? (if yes and gap < 0.5s, merge them)
</pre_output_check>`;

  const userPrompt = `Full transcript (video duration: ~${Math.ceil(
    (transcript.words.at(-1)?.end ?? 0)
  )}s):

FULL TEXT:
${transcript.text}

WORD-LEVEL TIMESTAMPS:
${wordLines}

Select the best segments. Output raw JSON array only.${customInstructions ? `\n\nADDITIONAL INSTRUCTIONS FROM THE CREATOR:\n${customInstructions}` : ""}`;

  const raw = await askClaude({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

  let ranges: TimeRange[];
  try {
    ranges = JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude returned invalid JSON for segment selection: ${raw.slice(0, 200)}`);
  }

  if (!Array.isArray(ranges)) {
    throw new Error("Claude did not return an array for segment selection");
  }

  // Validate and clamp
  const lastWord = transcript.words.filter(w => w.type === "word").at(-1);
  const videoDuration = lastWord?.end ?? Infinity;
  const result = ranges
    .filter(
      (r) =>
        typeof r.start === "number" &&
        typeof r.end === "number" &&
        r.start >= 0 &&
        r.end > r.start &&
        r.end - r.start >= 2.0
    )
    .map((r) => ({
      start: Math.max(0, r.start),
      end: Math.min(videoDuration, r.end),
    }))
    .sort((a, b) => a.start - b.start);

  // Safety net: if the last segment ends more than 2s before the final spoken word,
  // extend it to capture the ending (Claude likely cut it off by mistake)
  if (result.length > 0 && lastWord && videoDuration - result[result.length - 1].end > 2.0) {
    result[result.length - 1].end = videoDuration;
  }

  return result;
}

// ── Multi-Video Ordering ─────────────────────────────────────────────────────

/**
 * Given multiple video takes with their transcripts, asks Claude to determine
 * the correct order (hook → body → CTA). Returns an array of filenames in order.
 */
export async function orderVideoSegments(
  segments: { filename: string; text: string }[]
): Promise<string[]> {
  if (segments.length <= 1) return segments.map((s) => s.filename);

  const systemPrompt = `<identity>
You are a professional video editor. You arrange multiple video takes into the correct narrative order for a short/long form content piece. You output only JSON — never prose.
</identity>

<task>
Analyze the transcripts of N video segments and determine the correct order. A great video has:
1. HOOK — opens with a question, bold claim, or pattern interrupt that grabs attention
2. BODY — the meat: the explanation, the story, the insight, the how-to
3. CTA — the ending: a call to action ("follow for more", "comment below", "link in bio", "let me know"), a summary, or a memorable close

Use both the filename (which may hint at order: raw1/raw2, rawA/rawB, hook/body/outro, etc.) AND the transcript content to make the right call. When content clearly indicates a hook or CTA, trust the content over the filename. When content is ambiguous, fall back to filename order.
</task>

<output_format>
Raw JSON array of filenames only, in the correct order. No markdown fences. No explanation.
["filename_first.mp4", "filename_second.mp4", "filename_last.mp4"]
</output_format>

<constraints>
- Output EVERY input filename exactly once — never drop, duplicate, or rename
- Match filenames VERBATIM — character-for-character
- Return raw JSON array only
</constraints>`;

  const userPrompt = `SEGMENTS:\n${segments
    .map(
      (s, i) =>
        `[${i}] filename: "${s.filename}"\ntranscript:\n${s.text}\n`
    )
    .join("\n---\n")}\n\nReturn the correct order as a JSON array of filenames.`;

  const raw = await askClaude({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Find the first balanced JSON array in the response
  const start = raw.indexOf("[");
  if (start === -1) throw new Error(`Claude returned no array: ${raw}`);
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error(`Claude returned unbalanced array: ${raw}`);

  const parsed: string[] = JSON.parse(raw.slice(start, end + 1));

  // Validate: every input filename present exactly once
  const inputSet = new Set(segments.map((s) => s.filename));
  const outputSet = new Set(parsed);
  if (parsed.length !== segments.length || outputSet.size !== inputSet.size) {
    throw new Error(
      `Invalid order from Claude — expected ${segments.length} unique filenames, got ${parsed.length} (unique: ${outputSet.size})`
    );
  }
  for (const name of parsed) {
    if (!inputSet.has(name)) {
      throw new Error(`Claude returned unknown filename: ${name}`);
    }
  }

  return parsed;
}

// ── B-Roll Cue Generation ─────────────────────────────────────────────────────

const VALID_TEMPLATES: BRollTemplate[] = ["counter", "statement", "typewriter", "comparison", "list", "code", "particles", "staggered"];

/**
 * Generates b-roll cues with template-based animation specs.
 * Claude picks a template (counter, statement, typewriter, comparison, list)
 * and fills in the content. Rendered via remotion-bits components.
 */
export async function generateBRollCues(
  finalTranscript: FinalTranscript,
  previewDurationSec: number,
  customInstructions?: string,
  manifestText?: string
): Promise<BRollCue[]> {
  const { words, segments } = finalTranscript;

  // ── Timeline remapping ──────────────────────────────────────────────────

  const cumOffset: number[] = [];
  let running = 0;
  for (const seg of segments) {
    cumOffset.push(running);
    running += seg.end - seg.start;
  }

  const wordLines = words
    .filter((w) => w.type === "word")
    .map((w) => {
      const previewTime = w.start - segments[w.segmentIndex].start + cumOffset[w.segmentIndex];
      return `[${previewTime.toFixed(2)}s] ${w.text}`;
    })
    .join(" ");

  const segmentBoundaries = segments.map((_, i) => {
    const segDuration = segments[i].end - segments[i].start;
    return { start: cumOffset[i], end: cumOffset[i] + segDuration };
  });

  const boundaryLines = segmentBoundaries
    .map((b, i) => `Segment ${i + 1}: ${b.start.toFixed(2)}s – ${b.end.toFixed(2)}s`)
    .join("\n");

  const systemPrompt = `<identity>
You are a motion graphics b-roll editor. You design clean, structured animated visuals for video content using Remotion. You output only JSON — never prose.
</identity>

<output_format>
Raw JSON array only. No markdown fences. No explanation.
[{
  "previewStart": 0.0,
  "previewEnd": 0.0,
  "description": "what the visual conveys",
  "transcriptContext": "exact words being spoken",
  "animationSpec": { ... }
}]
</output_format>

<constraints>
NEVER:
- Never output anything except the JSON array
- Never repeat the speaker's words as on-screen text. If ≥50% of an item's words appear in its transcriptContext → INVALID → rewrite the item to add NEW meaning
- Never use vague or filler items: "?", "Chaos", "Done", "More", "Everything", "Thing", "It", "Stuff" — every item must be a specific noun or concrete phrase
- Never use generic headlines: "Tool Choice", "Your Reason", "Key Insight", "Inside The Video", "The Process" — headlines must express a judgment, problem, or outcome
- Never use "statement" or "typewriter" when staggered/particles would work
- Never use the same template twice in a row — alternate for variety
- Never use the same sceneStyle or staggerStyle twice in one video
- Never use bgColor other than "#000000" or "#FFFFFF" — alternate between them
- Never use more than 4 items in sceneItems or staggerItems (prefer 3-4 for clarity)
- Never make headlines longer than 4 words
- Never make items longer than 3 words
- Never place a cue in the first 1s or last 1s of any segment
- Never overlap cues — minimum 1s gap between cues
- Never leave a gap >5s between adjacent cues — distribute evenly
- Never output fewer than 3 cues for any video
- Never skip a number/percentage/dollar amount — every metric MUST have a counter cue
- Never output two adjacent cues that communicate the same idea — differentiate or merge
</constraints>

<environment>
You are generating JSON parsed by TypeScript and rendered by Remotion into MP4 clips. Only use fields and values documented in the templates below. Invalid fields cause render failures.
</environment>

<layout_rules>
Layout is FULLY determined by the template style. You do NOT control element positioning — the renderer does. Your job is to pick the right style and provide clean items.

staggered layouts (fixed by style):
- "fracture" → items scatter in from random directions, then assemble
- "grid-stagger" → 2-column grid, items pop in from center (EVEN count only)
- "mosaic" → square tiles reveal in a pattern
- "list-reveal" → vertical list, items slide in from left with checkmarks
- "card-stack-3d" → cards stack with 3D depth offset

You choose the style. The renderer handles all positioning and animation.
</layout_rules>

<motion_rules>
Each template has exactly ONE built-in motion. Items do NOT animate independently.
- staggered: items enter one by one via the stagger effect, then HOLD visible.
- particles: background particles move. Headline fades in and holds.
- counter: number counts up. No other motion.
- statement: text reveals. No other motion.

Structure: enter → hold → exit (fade out at end). No competing animations.
</motion_rules>

<text_quality>
Every item must ADD meaning the viewer cannot get from audio alone.

TEST: If you muted the audio and only saw the b-roll, would the items tell you something new? If not → rewrite.

GOOD items (specific, concrete, informative):
- "Broken Formulas", "Client Overload", "No Data Structure", "Airtable", "10hrs/wk", "Zero Downtime"

BAD items (vague, abstract, transcript echoes):
- "Chaos", "Everything", "Mentor Said So", "Their Systems", "Wasting It All", "?"

Headlines must take a STANCE — a judgment, problem, or outcome:
- GOOD: "Wrong Fit", "System Breaks Here", "Overloaded Stack", "Pennies Per Edit"
- BAD: "Tool Choice", "Your Reason", "Inside The Video", "Key Insight"
</text_quality>

<decision_cascade>
For each b-roll moment, walk through these levels IN ORDER. Use the FIRST level that applies:

Level 1: Speaker mentions a specific number, dollar amount, %, or metric?
  → "counter" (mandatory — never skip a number)

Level 2: Speaker mentions 3+ related things (tools, systems, problems, features)?
  → "staggered" with 3-4 items. VARY staggerStyle: fracture, grid-stagger (even count), mosaic, list-reveal, card-stack-3d.

Level 3: Emotional peak, transition, or powerful moment?
  → "particles" with a 1-3 word keyword. VARY particleStyle: fireflies, rising, confetti, snow, grid, flying-words.

Level 4: Speaker explicitly compares before/after?
  → "comparison"

Level 5: Speaker makes a bold point needing emphasis?
  → "statement" (2-4 word headline)

Level 6: Speaker literally lists specific named items?
  → "list"

Level 7: Speaker quotes something or describes a step-by-step flow?
  → "typewriter" (rare)

Level 8: Speaker discusses code/APIs?
  → "code" (rare)
</decision_cascade>

<templates>
=== ANIMATED TEMPLATES (levels 2-4 — target 50%+ of cues) ===

"staggered" — items appearing with entrance effects.
  Fields: staggerItems (3-4 labels, max 3 words each), staggerStyle (REQUIRED), headline (2-4 words)
  Styles:
  - "fracture" — items scatter and reassemble
  - "grid-stagger" — 2-column grid from center. EVEN item count only (2, 4).
  - "mosaic" — square tiles revealing
  - "list-reveal" — vertical list with checkmarks
  - "card-stack-3d" — cards stacking with 3D depth

"particles" — particle animation + bold centered keyword.
  Fields: headline (1-3 words, REQUIRED), particleStyle (REQUIRED)
  Styles: fireflies, rising, confetti, snow, grid, flying-words

=== TEXT TEMPLATES (levels 1, 5-9) ===

"counter" — number counting up with label
  Fields: headline (2-4 words), number (string), numberPrefix ("$"), numberPostfix ("%", "/mo")

"comparison" — before/after with arrow
  Fields: headline (2-4 words), beforeValue, afterValue

"statement" — bold text reveal
  Fields: headline (2-4 words), subtext (optional)

"list" — checkmark items appearing one by one
  Fields: headline (2-4 words), listItems (2-4 items, max 3 words each)

"typewriter" — typing text with cursor (RARE)
  Fields: typewriterText (the sentence)

"code" — syntax-highlighted code block (RARE)
  Fields: codeSnippet (5-10 lines), codeLanguage (default "typescript")
</templates>

<examples>
<example type="bad">
Speaker: "your mentor told you to and you forgot to think for yourself"
Output: { "template": "staggered", "staggerItems": ["Mentor Said So", "No Critical Thinking", "Not Your Decision"], "staggerStyle": "list-reveal", "headline": "Blindly Following?" }
Why bad: Items parrot the transcript. "Mentor Said So" = what was said. "No Critical Thinking" = what was said. Adds nothing new. Also, headline is a question — not a stance.
Fixed: { "template": "staggered", "staggerItems": ["Inherited Stack", "Zero Due Diligence", "Vendor Lock-In"], "staggerStyle": "list-reveal", "headline": "Blind Trust Costs" }
</example>

<example type="bad">
Speaker: "Slack blows up, workflows fail, and new clients get frustrated"
Output: { "template": "statement", "headline": "Things Break" }
Why bad: Just text on screen. No animation. "Things Break" is vague. Use scene3d or staggered for multiple items.
</example>

<example type="good">
Speaker: "we saved clients over ten thousand dollars a month"
Output: { "template": "counter", "bgColor": "#000000", "headline": "Monthly Savings", "number": "10000", "numberPrefix": "$", "numberPostfix": "/mo" }
Why good: Specific number → counter is mandatory. Headline adds context ("Monthly Savings") not in audio.
</example>

<example type="good">
Speaker: "we built real systems — automation, tracking, onboarding, reporting"
Output: { "template": "scene3d", "bgColor": "#000000", "sceneItems": ["Automation", "Tracking", "Onboarding", "Reporting"], "sceneStyle": "terminal" }
Why good: Terminal style matches "built real systems." Items are specific tool categories, not transcript echoes.
</example>
</examples>

<duration>
- Minimum 3 seconds per cue, target 3-5 seconds
- Text-heavy cues (5+ visible words): up to 7s
- No overlaps, minimum 1s speaker face between cues
</duration>

<timing_alignment>
CRITICAL — on-screen items MUST sync with speech:
- Set previewStart 0.3-0.5s BEFORE the speaker says the key phrase
- For multi-item cues: align so first item appears as speaker starts that section
- Do NOT start 2-3s before the relevant words — feels disconnected
- Do NOT start after the words were said — viewer already moved on
</timing_alignment>

<quantity>
- Target 25-35% time coverage (total b-roll seconds / video duration)
- 30s video = 3-4 cues (each 3-4s = ~10-12s total b-roll)
- 60s video = 5-7 cues
- 120s video = 10-14 cues
- Every cue must be at least 3 seconds — never shorter
- Distribute evenly — no gaps >5s between cues, no clustering
</quantity>

<pre_output_check>
Before outputting, verify EVERY cue passes ALL checks. If ANY check fails → fix the cue before outputting.

1. Animated templates (scene3d + staggered + particles) ≥ 40% of total cues. If not → convert statement/list cues.
2. Every number/metric in transcript has a counter cue.
3. No two adjacent cues use the same template.
4. Every cue is at least 3 seconds.
5. scene3d/staggered/particles cues have their style field set.
6. No sceneStyle or staggerStyle repeated in the same video.
7. Every item is specific and concrete — no single-character items, no "?", no vague filler.
8. No item shares ≥50% of its words with its transcriptContext. If it does → rewrite.
9. Every headline expresses a stance (judgment, problem, outcome) — not a neutral label.
10. No gap >5s between adjacent cues.
11. No two adjacent cues communicate the same idea.
</pre_output_check>`;

  const userPrompt = `Preview video total duration: ${previewDurationSec.toFixed(2)}s

TRANSCRIPT WITH PREVIEW-SPACE TIMESTAMPS:
${wordLines}

SEGMENT BOUNDARIES (do not start or end a cue within 0.5s of these):
${boundaryLines}

Output raw JSON array only.${customInstructions ? `\n\nADDITIONAL INSTRUCTIONS FROM THE CREATOR:\n${customInstructions}` : ""}`;

  // ── CREATOR: Generate initial cues ─────────────────────────────────────
  let creatorMessages: { role: "user" | "assistant"; content: string }[] = [
    { role: "user", content: userPrompt },
  ];

  let parsed: unknown[] = [];

  for (let loop = 0; loop < 2; loop++) {
    const rawText = await askClaude({
      system: systemPrompt,
      messages: creatorMessages,
    });
    const cleaned = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Claude returned invalid JSON for b-roll cues: ${rawText.slice(0, 200)}`);
    }

    if (!Array.isArray(parsed)) {
      throw new Error("Claude did not return an array for b-roll cues");
    }

    // ── REVIEWER: Evaluate cues as the on-screen subject ──────────────────
    if (loop === 0) {
      const reviewPrompt = `<identity>
You are the REVIEWER — the person who appears on-screen in this video. Your personal brand is at stake. You are NOT helping the creator. You are PROTECTING how you appear to your audience. Be harsh. Be specific.
</identity>

<task>
Review these b-roll cues that will overlay YOUR face in the video. The transcript below is what YOU said.

TRANSCRIPT:
${wordLines}

PROPOSED B-ROLL CUES:
${JSON.stringify(parsed, null, 2)}

Evaluate each cue:
1. Does this b-roll make ME look professional and credible?
2. Is the animation style engaging or boring/generic?
3. Does the timing make sense with what I'm saying?
4. Are the headlines/labels specific enough or are they vague filler like "Breaking Point" or "Key Insight"?
5. Is there enough variety in templates and styles?
6. Are there moments where my face should stay visible (emotional peaks) that are incorrectly covered?

OUTPUT FORMAT:
If ALL cues are good → output exactly: APPROVE
If ANY cue needs fixing → output a JSON object:
{
  "verdict": "REVISE",
  "issues": ["issue 1", "issue 2"],
  "fixes": ["fix 1", "fix 2"]
}

Be specific. "Cue 2 headline 'Key Insight' is generic — change to something tied to what I actually said" is good feedback.
"Could be better" is useless feedback.
</task>`;

      const reviewText = await askClaude({
        messages: [{ role: "user", content: reviewPrompt }],
      });

      if (reviewText === "APPROVE" || reviewText.includes('"verdict": "APPROVE"')) {
        break; // Reviewer approved — use these cues
      }

      // Reviewer wants revisions — feed feedback back to creator
      creatorMessages = [
        { role: "user", content: userPrompt },
        { role: "assistant", content: cleaned },
        {
          role: "user",
          content: `The REVIEWER (the person on-screen) rejected your b-roll plan. Their feedback:\n\n${reviewText}\n\nRevise your cues based on this feedback. Apply every fix directly. Output the revised raw JSON array only.`,
        },
      ];
      // Loop again for revision
    }
  }

  // ── Validate ────────────────────────────────────────────────────────────

  const templateSet = new Set(VALID_TEMPLATES);
  const validatedCues: BRollCue[] = [];

  for (const entry of parsed) {
    const r = entry as Record<string, unknown>;
    const previewStart = typeof r.previewStart === "number" ? r.previewStart : null;
    const previewEnd = typeof r.previewEnd === "number" ? r.previewEnd : null;
    if (previewStart === null || previewEnd === null) continue;

    let dur = previewEnd - previewStart;
    if (dur < 2.0 || dur > 8.0) continue;
    if (previewStart < 0 || previewEnd > previewDurationSec) continue;

    // Clamp short cues up to 3s minimum
    let adjustedEnd = previewEnd;
    if (dur < 3.0) {
      adjustedEnd = Math.min(previewStart + 3.0, previewDurationSec);
      dur = adjustedEnd - previewStart;
    }

    const rawSpec = r.animationSpec as Record<string, unknown> | undefined;
    if (!rawSpec || typeof rawSpec !== "object") continue;

    const template = typeof rawSpec.template === "string" ? rawSpec.template : "";
    if (!templateSet.has(template as BRollTemplate)) continue;

    const bgColor = typeof rawSpec.bgColor === "string" ? rawSpec.bgColor : "#000000";

    // Boundary check — only reject if cue starts/ends within 0.3s of a segment boundary
    const containingSeg = segmentBoundaries.find(
      (b) => previewStart >= b.start - 0.1 && previewEnd <= b.end + 0.1
    );
    if (containingSeg) {
      if (previewStart - containingSeg.start < 0.3 || containingSeg.end - previewEnd < 0.3) {
        continue;
      }
    }

    const animationSpec: BRollAnimationSpec = {
      template: template as BRollTemplate,
      bgColor,
      headline: typeof rawSpec.headline === "string" ? rawSpec.headline : undefined,
      subtext: typeof rawSpec.subtext === "string" ? rawSpec.subtext : undefined,
      number: typeof rawSpec.number === "string" ? rawSpec.number : undefined,
      numberPrefix: typeof rawSpec.numberPrefix === "string" ? rawSpec.numberPrefix : undefined,
      numberPostfix: typeof rawSpec.numberPostfix === "string" ? rawSpec.numberPostfix : undefined,
      beforeValue: typeof rawSpec.beforeValue === "string" ? rawSpec.beforeValue : undefined,
      afterValue: typeof rawSpec.afterValue === "string" ? rawSpec.afterValue : undefined,
      listItems: Array.isArray(rawSpec.listItems) ? (rawSpec.listItems as string[]).filter((s) => typeof s === "string") : undefined,
      typewriterText: typeof rawSpec.typewriterText === "string" ? rawSpec.typewriterText : undefined,
      imageKey: typeof rawSpec.imageKey === "string" ? rawSpec.imageKey : undefined,
      imageKeys: Array.isArray(rawSpec.imageKeys) ? (rawSpec.imageKeys as string[]).filter((s) => typeof s === "string") : undefined,
      codeSnippet: typeof rawSpec.codeSnippet === "string" ? rawSpec.codeSnippet : undefined,
      codeLanguage: typeof rawSpec.codeLanguage === "string" ? rawSpec.codeLanguage : undefined,
      visualIcons: Array.isArray(rawSpec.visualIcons) ? (rawSpec.visualIcons as string[]).filter((s) => typeof s === "string") : undefined,
      visualLayout: ["single", "pair", "sequence"].includes(rawSpec.visualLayout as string) ? (rawSpec.visualLayout as "single" | "pair" | "sequence") : undefined,
      sceneItems: Array.isArray(rawSpec.sceneItems) ? (rawSpec.sceneItems as string[]).filter((s) => typeof s === "string") : undefined,
      sceneStyle: typeof rawSpec.sceneStyle === "string" ? rawSpec.sceneStyle as any : undefined,
      particleStyle: typeof rawSpec.particleStyle === "string" ? rawSpec.particleStyle as any : undefined,
      staggerStyle: typeof rawSpec.staggerStyle === "string" ? rawSpec.staggerStyle as any : undefined,
      staggerItems: Array.isArray(rawSpec.staggerItems) ? (rawSpec.staggerItems as string[]).filter((s) => typeof s === "string") : undefined,
    };

    // grid-stagger and mosaic must have even item count for multi-column layout
    if ((animationSpec.staggerStyle === "grid-stagger" || animationSpec.staggerStyle === "mosaic") && animationSpec.staggerItems && animationSpec.staggerItems.length % 2 !== 0) {
      animationSpec.staggerItems = animationSpec.staggerItems.slice(0, -1);
    }

    validatedCues.push({
      id: `cue_${String(validatedCues.length).padStart(3, "0")}`,
      previewStart,
      previewEnd: adjustedEnd,
      durationSec: Math.round(dur * 100) / 100,
      description: typeof r.description === "string" ? r.description : "",
      transcriptContext: typeof r.transcriptContext === "string" ? r.transcriptContext : "",
      animationSpec,
    });
  }

  // Sort and enforce 1s gap
  validatedCues.sort((a, b) => a.previewStart - b.previewStart);
  const final: BRollCue[] = [];
  for (const cue of validatedCues) {
    const prev = final.at(-1);
    if (prev && cue.previewStart < prev.previewEnd + 1.0) continue;
    cue.id = `cue_${String(final.length).padStart(3, "0")}`;
    final.push(cue);
  }

  return final;
}
