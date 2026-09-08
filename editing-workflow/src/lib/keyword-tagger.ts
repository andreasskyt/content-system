/**
 * Keyword tagger — marks 0-1 high-impact words per caption line, plus 0-1
 * "bracketed" footnote words for editorial flair (Creator A's `[first thing]`
 * / `[always]` style). Cheap Haiku pass with strict JSON output.
 *
 * Output schema (per line index):
 *   - null                                     → no annotation
 *   - "scaling"                                 → legacy: keyword only
 *   - { "keyword": "scaling", "bracket": null } → keyword only (rich form)
 *   - { "keyword": null, "bracket": "first" }   → bracket only
 *   - { "keyword": "always", "bracket": "first" } → both
 */

import { askClaude } from "./claude-cli";
import type { CaptionLine } from "./subtitles";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type KeywordKind = "impact" | "warning" | "default";

export interface TaggedWord {
  text: string;
  start: number;
  end: number;
  isKeyword: boolean;
  isBracketed: boolean;
  /**
   * Italic-serif "narrative flair" treatment. For psychological/transition
   * words like "smarter", "discipline", "testing", "possible". Rendered in
   * a classic serif italic when the style enables serif_flair.
   */
  isFlair: boolean;
  /**
   * Semantic classification of the keyword. Drives semantic color picking
   * (e.g. CreatorC: impact → yellow, warning → red, default → white).
   * Only set when isKeyword is true.
   */
  keywordKind?: KeywordKind;
}

export interface TaggedLine {
  words: TaggedWord[];
  start: number;
  end: number;
  /**
   * Render gear for dual-gear styles (Creator A). 1 = rapid-fire single-word
   * mode (default), 2 = whole-sentence compressed-stack mode for hooks,
   * structural transitions, and title phrases. Ignored by non-dual-gear
   * styles. Defaults to 1 when missing.
   */
  gear?: 1 | 2;
}

interface RichTag {
  keyword: string | null;
  bracket: string | null;
  flair: string | null;
  gear: 1 | 2;
  keyword_kind: KeywordKind;
}

export async function tagKeywords(
  lines: CaptionLine[]
): Promise<TaggedLine[]> {
  if (lines.length === 0) return [];

  const numbered = lines
    .map(
      (l, i) =>
        `${i}: ${l.words.map((w) => w.text).join(" ")}`
    )
    .join("\n");

  const responseText = await askClaude({
    model: "haiku",
    messages: [
      {
        role: "user",
        content: `For each numbered subtitle line below, pick FIVE things:

1. "gear" (REQUIRED, 1 or 2):
   - 1 = standard narrative line — flowing speech, mid-sentence continuation, descriptive detail, examples, supporting clauses.
   - 2 = high-value structural beat. Show as an entire-sentence compressed stack. Actively LOOK for these — TARGET 25-35% of lines as Gear 2 (roughly 1 in 3 or 1 in 4). Strong Gear-2 triggers:
     • Opening hooks / cold opens ("the first thing I do is always X", "one of the coolest things about X is Y")
     • Thesis statements & declarative claims ("the secret is X", "X always wins", "you have to X")
     • Bold comparative or contrast statements ("X is better than Y", "this changes everything", "from X to Y")
     • Structural setup lines that frame what's coming next ("here's what happened next", "here's the thing", "let me explain")
     • Punchlines and big payoff statements
     • Summary / takeaway lines ("never ever take X for granted", "the lesson is X")
     • Semantic transition points where the speaker shifts topic, mood, or argument direction
   Err on the side of MORE Gear 2, not less. If a line could plausibly land as a "title card" in a polished YouTube short, it's Gear 2. Across a 15-line transcript, expect 4-5 Gear 2 lines, not 1.

2. "keyword" (optional) — the SINGLE most physically/emotionally impactful word in the line: a vivid noun, action verb, or emphasis adjective that would pop with a glass-refraction highlight. Strong examples: "broken", "scale", "faster", "bigger", "destroyed", "exploded", "money", "fortune", "killer", "obsessed", "raw", "brutal", "momentum", "scaling", "coolest". Skip if nothing stands out. NEVER pick fillers ("the", "and", "but"), generic verbs ("is", "was", "have"), or transitions ("so", "now", "then").

3. "keyword_kind" (REQUIRED when keyword is set; otherwise "default"):
   - "impact" = high-status, achievement, growth, momentum, success, intensity. Examples: momentum, scaling, success, faster, bigger, killer, exploded, fortune, money, win, build.
   - "warning" = breakage, danger, transition, decline, problem state, OR any number that signals change/scale (counts, percentages, ages). Examples: broken, break, destroyed, south, fail, drop, crash, dead, 60, 23, 30.
   - "default" = any keyword that fits neither bucket cleanly.

4. "bracket" (optional) — at most ONE word that reads like an editorial footnote / parenthetical aside — a short qualifier or modifier that adds nuance. Examples: in "the first thing I do", "first" is a good bracket. Skip almost always — only pick when there's a genuinely punchy aside word. NEVER pick prepositions or articles. Must differ from keyword.

5. "flair" (optional) — at most ONE narrative/psychological/transition word that benefits from an italic-serif treatment. Strong examples: "smarter", "discipline", "testing", "possible", "wisdom", "patience", "trust", "clarity", "focus", "intention", "balance", "purpose", "courage", "granted". Skip unless the line genuinely contains a reflective abstract concept. Must differ from keyword and bracket.

Output ONLY a JSON object mapping line index → { "gear": 1|2, "keyword": <word|null>, "keyword_kind": "impact"|"warning"|"default", "bracket": <word|null>, "flair": <word|null> }. Every line MUST have gear and keyword_kind. Use null for keyword/bracket/flair when nothing applies. No prose, no markdown.

Example:
{"0": {"gear": 2, "keyword": "scaling", "keyword_kind": "impact", "bracket": "first", "flair": null}, "1": {"gear": 1, "keyword": null, "keyword_kind": "default", "bracket": null, "flair": null}, "2": {"gear": 1, "keyword": "broken", "keyword_kind": "warning", "bracket": null, "flair": null}, "3": {"gear": 2, "keyword": null, "keyword_kind": "default", "bracket": null, "flair": "discipline"}}

Lines:
${numbered}`,
      },
    ],
  });

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return passthroughNoKeywords(lines);

  let rawMap: Record<string, unknown>;
  try {
    rawMap = JSON.parse(jsonMatch[0]);
  } catch {
    return passthroughNoKeywords(lines);
  }

  return lines.map((line, idx) => {
    const tag = parseTag(rawMap[String(idx)]);
    const normalizedKeyword = tag.keyword ? normalize(tag.keyword) : null;
    const normalizedBracket = tag.bracket ? normalize(tag.bracket) : null;
    const normalizedFlair = tag.flair ? normalize(tag.flair) : null;

    // Track claimed words so a single token can't pick up multiple roles
    // (defensive; the prompt says they should differ but Haiku can slip).
    let keywordClaimed = false;
    let bracketClaimed = false;

    return {
      start: line.start,
      end: line.end,
      gear: tag.gear,
      words: line.words.map((w) => {
        const norm = normalize(w.text);
        const matchesKeyword =
          normalizedKeyword !== null && norm === normalizedKeyword;
        const isKeyword = matchesKeyword && !keywordClaimed;
        if (isKeyword) keywordClaimed = true;
        const matchesBracket =
          normalizedBracket !== null && norm === normalizedBracket;
        const isBracketed =
          matchesBracket && !isKeyword && !bracketClaimed;
        if (isBracketed) bracketClaimed = true;
        const matchesFlair =
          normalizedFlair !== null && norm === normalizedFlair;
        const isFlair = matchesFlair && !isKeyword && !isBracketed;
        return {
          text: w.text,
          start: w.start,
          end: w.end,
          isKeyword,
          isBracketed,
          isFlair,
          keywordKind: isKeyword ? tag.keyword_kind : undefined,
        };
      }),
    };
  });
}

function parseTag(raw: unknown): RichTag {
  if (raw === null || raw === undefined)
    return { keyword: null, bracket: null, flair: null, gear: 1, keyword_kind: "default" };
  // Legacy: "scaling" → keyword only, gear=1, default kind
  if (typeof raw === "string")
    return { keyword: raw, bracket: null, flair: null, gear: 1, keyword_kind: "default" };
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const kw = typeof obj.keyword === "string" ? obj.keyword : null;
    const br = typeof obj.bracket === "string" ? obj.bracket : null;
    const fl = typeof obj.flair === "string" ? obj.flair : null;
    const gearRaw = obj.gear;
    const gear: 1 | 2 = gearRaw === 2 || gearRaw === "2" ? 2 : 1;
    const kindRaw = obj.keyword_kind;
    const keyword_kind: KeywordKind =
      kindRaw === "impact" || kindRaw === "warning" ? kindRaw : "default";
    return { keyword: kw, bracket: br, flair: fl, gear, keyword_kind };
  }
  return { keyword: null, bracket: null, flair: null, gear: 1, keyword_kind: "default" };
}

function passthroughNoKeywords(lines: CaptionLine[]): TaggedLine[] {
  return lines.map((line) => ({
    start: line.start,
    end: line.end,
    gear: 1,
    words: line.words.map((w) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      isKeyword: false,
      isBracketed: false,
      isFlair: false,
    })),
  }));
}

export function passthroughNoKeywordsFn(lines: CaptionLine[]): TaggedLine[] {
  return passthroughNoKeywords(lines);
}
