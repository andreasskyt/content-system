/**
 * Shared constants. Importing from here keeps pipeline.ts and the subtitle
 * remapper in lockstep — if pre-roll padding ever changes, both stay correct.
 */

/**
 * Seconds of audio prepended to each cut clip in pipeline.ts. Without this,
 * fast cuts swallow the first syllable. The subtitle timeline remapper MUST
 * account for the same value when mapping word timestamps from the source
 * timeline to the edit timeline — otherwise captions drift earlier by
 * PRE_ROLL_SEC × (segment index).
 */
export const CLIP_PRE_ROLL_SEC = 0.15;

/**
 * Seconds of audio kept AFTER a segment's last word. Word end timestamps land
 * on the vowel, not on the consonant's release — cutting exactly there turns
 * "not" into "no" and "stop" into "sto". The pre-roll above has always existed;
 * the absence of its mirror is why segment boundaries clicked.
 */
export const CLIP_TAIL_SEC = 0.14;

/**
 * Content folder names, by format. Renamed 2026-08-25 from "Short Form" /
 * "Long Form" to match how the Content tree is actually organised — keep these
 * as the single source of truth so a future rename is one edit, not six.
 */
export const SHORT_FORM_DIR = "Reels";
export const LONG_FORM_DIR = "YouTube";
