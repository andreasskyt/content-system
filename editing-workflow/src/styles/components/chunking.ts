/**
 * Chunking components — how many words fit on screen at once.
 *
 * These knobs are read by `scripts/subs.ts` and fed into
 * `groupWordsIntoLines()` BEFORE rendering. They decide where one
 * `StyledCaptionLine` ends and the next begins.
 *
 * Adding a new chunking preset is just a new named const — no schema
 * changes required.
 */

import type { SubsSpec } from "../types";

type ChunkingComponent = Pick<
  SubsSpec,
  | "max_words_per_line"
  | "max_chars_per_line"
  | "max_lines_on_screen"
  | "pause_threshold_sec"
  | "punctuation_included"
>;

/**
 * Strict 1-word-at-a-time strobe. The 12-char cap clips long words to
 * their own line; 0.2s pause threshold flushes on natural beats.
 *
 * Pairs with CENTER_STACKED_LAYOUT for the X-ray strobe look — only one
 * word ever occupies the anchor point at a time.
 */
export const ONE_WORD_AT_A_TIME: ChunkingComponent = {
  max_words_per_line: 1,
  max_chars_per_line: 12,
  max_lines_on_screen: 1,
  pause_threshold_sec: 0.2,
  punctuation_included: false,
};

/**
 * 2-3 word rapid-fire. Tight pacing for short-form punch without going
 * full single-word strobe.
 */
export const RAPID_FIRE: ChunkingComponent = {
  max_words_per_line: 3,
  max_chars_per_line: 22,
  max_lines_on_screen: 1,
  pause_threshold_sec: 0.25,
  punctuation_included: false,
};

/**
 * Normal phrase-length captions. Comfortable reading without forcing the
 * eye to chase a strobe.
 */
export const NORMAL_PHRASE: ChunkingComponent = {
  max_words_per_line: 5,
  max_chars_per_line: 36,
  max_lines_on_screen: 1,
  pause_threshold_sec: 0.35,
  punctuation_included: true,
};
