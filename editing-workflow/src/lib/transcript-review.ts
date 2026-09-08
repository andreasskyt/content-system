/**
 * transcript-review — AI proofread of every transcript before it is used.
 *
 * Scribe mishears words (wrong domain terms, misspellings, nonsense-in-context)
 * and those errors get burned verbatim into subtitles. This step has Claude
 * read the full transcript, flag words that cannot be what was said given the
 * surrounding context, and correct them — text only, never timestamps, never
 * adding or removing words, never rephrasing spoken language.
 *
 * Runs once per transcript: the `reviewed` flag persists in transcript.json so
 * cached reuse and restyles don't re-bill the review.
 */

import { askClaude } from "./claude-cli";
import type { ElevenLabsTranscript } from "./types";

const SYSTEM = `You are a transcript QA reviewer for a video subtitle pipeline.
You receive a numbered list of words from an automatic speech-to-text transcript.
Your job is to find TRANSCRIPTION ERRORS ONLY: misheard words, misspellings,
wrong names/brands/technical terms, and words that make no sense in context
(e.g. a term that sounds similar to what was clearly meant).

Rules:
- The speaker's language, dialect, grammar and phrasing are correct by definition.
  Never rephrase, never "improve" grammar, never change style or word order.
- Only correct a word when the context makes the intended word clear.
  When in doubt, leave it alone.
- Pay special attention to acronyms, letter-based terms and technical words:
  spoken letters sound alike, so speech-to-text often lands on a similar-sounding
  but wrong term. If a near-homophone is what the domain context actually calls
  for (file formats, product names, industry terms), prefer the term that makes
  sense in context over the one that was literally heard.
- A correction replaces exactly one numbered word; the replacement may contain
  spaces if one slot was heard as a merged word.

Respond with ONLY a JSON object, no prose:
{"corrections": [{"i": <word index>, "from": "<current text>", "to": "<corrected text>"}]}
Return {"corrections": []} if the transcript is clean.`;

export interface TranscriptCorrection {
  i: number;
  from: string;
  to: string;
}

/**
 * Proofreads and corrects the transcript in place. Returns the (possibly
 * corrected) transcript with `reviewed: true`. A review failure is loud but
 * non-fatal — an unreviewed transcript is better than a dead pipeline.
 */
export async function reviewTranscript(
  transcript: ElevenLabsTranscript,
  log: (msg: string) => void = console.log
): Promise<ElevenLabsTranscript> {
  if (transcript.reviewed) return transcript;

  const words = transcript.words.filter((w) => w.type === "word");
  if (words.length === 0) {
    transcript.reviewed = true;
    return transcript;
  }

  const numbered = words.map((w, i) => `${i}:${w.text}`).join(" ");

  try {
    log("  Reviewing transcript with Claude...");
    const raw = await askClaude({
      system: SYSTEM,
      messages: [{ role: "user", content: numbered }],
      model: "sonnet",
    });

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON in review response");
    const parsed = JSON.parse(match[0]) as { corrections?: TranscriptCorrection[] };
    const corrections = (parsed.corrections ?? []).filter(
      (c) =>
        Number.isInteger(c.i) &&
        c.i >= 0 &&
        c.i < words.length &&
        typeof c.to === "string" &&
        c.to.trim().length > 0 &&
        words[c.i].text === c.from
    );

    for (const c of corrections) {
      words[c.i].text = c.to.trim();
      log(`  ✎ ${c.from} → ${c.to.trim()}`);
    }
    log(
      corrections.length
        ? `✓ Transcript reviewed — ${corrections.length} correction(s) applied`
        : "✓ Transcript reviewed — clean"
    );

    transcript.text = words.map((w) => w.text).join(" ");
    transcript.reviewed = true;
  } catch (err) {
    log(
      `  ⚠ Transcript review failed (${(err as Error).message}) — continuing with UNREVIEWED transcript`
    );
  }

  return transcript;
}
