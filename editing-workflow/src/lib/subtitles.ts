import type { FinalTranscript, EditTimelineWord } from "./types";
import { CLIP_PRE_ROLL_SEC } from "./constants";

// ── Time Remapping ───────────────────────────────────────────────────────────

/**
 * Maps source-timeline word timestamps onto the edit timeline.
 *
 * Each clip in pipeline.ts is cut from `seg.start - CLIP_PRE_ROLL_SEC` to
 * `seg.end`, so each clip is up to CLIP_PRE_ROLL_SEC seconds longer than the
 * raw segment span. Without accounting for this, captions drift earlier by
 * CLIP_PRE_ROLL_SEC × segmentIndex — a 0.15s × N drift that compounds.
 */
export function remapWordsToEditTimeline(
  finalTranscript: FinalTranscript
): EditTimelineWord[] {
  const { words, segments } = finalTranscript;

  // For each segment i:
  //   clipStartSourceTime[i] = max(0, seg[i].start - PRE_ROLL)
  //   clipDuration[i]        = seg[i].end - clipStartSourceTime[i]
  //   editStartTime[i]       = sum(clipDuration[0..i-1])
  //   word at source time S in seg i → edit time = editStartTime[i] + (S - clipStartSourceTime[i])
  //                                              = S + (editStartTime[i] - clipStartSourceTime[i])
  //   so segmentOffsets[i] = editStartTime[i] - clipStartSourceTime[i]
  const segmentOffsets: number[] = [];
  let cumulativeEditTime = 0;
  for (const seg of segments) {
    const clipStartSourceTime = Math.max(0, seg.start - CLIP_PRE_ROLL_SEC);
    const clipDuration = seg.end - clipStartSourceTime;
    segmentOffsets.push(cumulativeEditTime - clipStartSourceTime);
    cumulativeEditTime += clipDuration;
  }

  return words
    .filter((w) => w.type === "word")
    .map((w) => ({
      text: w.text,
      start: Math.max(0, w.start + segmentOffsets[w.segmentIndex]),
      end: w.end + segmentOffsets[w.segmentIndex],
    }));
}

// ── Line Grouping ────────────────────────────────────────────────────────────

export interface CaptionLine {
  words: EditTimelineWord[];
  start: number;
  end: number;
}

export interface ChunkOptions {
  maxWordsPerLine?: number;
  maxCharsPerLine?: number;
  pauseThresholdSec?: number;
  /** When false, punctuation is stripped from words and doesn't trigger line breaks. */
  punctuationIncluded?: boolean;
}

const DEFAULTS: Required<ChunkOptions> = {
  maxWordsPerLine: 3,
  maxCharsPerLine: 18,
  pauseThresholdSec: 0.3,
  punctuationIncluded: true,
};

const SENTENCE_ENDERS = /[.!?]$/;
// Only punctuation at a word's EDGES is decoration. Stripping it everywhere
// also eats the apostrophe in "it's" and the hyphens in "nice-to-have",
// producing "its" and "nicetohave" — which read as spelling errors on screen.
const EDGE_PUNCTUATION = /^[.,!?;:"'„""''«»…—–-]+|[.,!?;:"'„""''«»…—–-]+$/g;

function currentCharCount(words: EditTimelineWord[]): number {
  // Sum of word lengths + spaces between them
  return words.reduce((acc, w) => acc + w.text.length, 0) + Math.max(0, words.length - 1);
}

export function groupWordsIntoLines(
  words: EditTimelineWord[],
  opts: ChunkOptions = {}
): CaptionLine[] {
  const cfg = { ...DEFAULTS, ...opts };

  const stripped: EditTimelineWord[] = cfg.punctuationIncluded
    ? words
    : words.map((w) => ({ ...w, text: w.text.replace(EDGE_PUNCTUATION, "") }))
        .filter((w) => w.text.length > 0);

  const lines: CaptionLine[] = [];
  let current: EditTimelineWord[] = [];

  const flush = () => {
    if (current.length === 0) return;
    lines.push({
      words: [...current],
      start: current[0].start,
      end: current[current.length - 1].end,
    });
    current = [];
  };

  for (let i = 0; i < stripped.length; i++) {
    const word = stripped[i];

    // If adding this word would exceed char limit, flush first (unless current is empty)
    if (current.length > 0 && currentCharCount([...current, word]) > cfg.maxCharsPerLine) {
      flush();
    }

    current.push(word);

    const atMaxWords = current.length >= cfg.maxWordsPerLine;
    const atMaxChars = currentCharCount(current) >= cfg.maxCharsPerLine;
    const nextWord = stripped[i + 1];
    const hasPause = nextWord && nextWord.start - word.end > cfg.pauseThresholdSec;
    const endsWithPunctuation = cfg.punctuationIncluded && SENTENCE_ENDERS.test(word.text);

    if (atMaxWords || atMaxChars || hasPause || endsWithPunctuation || !nextWord) {
      flush();
    }
  }

  return lines;
}

// ── B-Roll Filtering ─────────────────────────────────────────────────────────

export function filterBrollOverlaps(
  lines: CaptionLine[],
  brollWindows: { start: number; end: number }[]
): CaptionLine[] {
  return lines.filter((line) => {
    const lineDur = line.end - line.start;
    if (lineDur <= 0) return false;

    return !brollWindows.some((w) => {
      const overlapStart = Math.max(line.start, w.start);
      const overlapEnd = Math.min(line.end, w.end);
      const overlap = Math.max(0, overlapEnd - overlapStart);
      return overlap / lineDur > 0.5;
    });
  });
}
