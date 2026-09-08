/**
 * LandscapeSimple — clean lowercase captions for 16:9 talking-head footage.
 *
 * The whole look is one phrase at a time, centered just below the middle of
 * the frame: white Poppins Bold, lowercase, tracking pulled slightly
 * tight so short chunks read as one solid mass rather than spaced-out words.
 * No keyword coloring, no outline, no karaoke recolor — every word is
 * identical, which is what makes it read as typography instead of subtitles.
 *
 * Two deliberate choices worth keeping:
 *  - Chunks are 2-3 words and appear whole (`per_word_timing: "line-only"`).
 *    A word-by-word build re-centers the line on every word and destroys the
 *    stillness this look depends on.
 *  - The soft dark halo comes from `text_shadow`, not an outline. An outline
 *    traces the glyph and reads as a sticker; a blurred shadow sits behind
 *    the text and only shows up where the footage is bright.
 *
 * Capability today: subs render fully. Pacing is advisory until it's wired
 * into pipeline.ts.
 */

import type { EditStyle } from "./types";

const style: EditStyle = {
  meta: {
    name: "LandscapeSimple",
    description:
      "Lowercase white Poppins Bold, 2-3 word chunks centered mid-frame with a soft blurred shadow. Built for 16:9 talking-head.",
  },

  canvas: { mode: "fullscreen" },

  pacing: {
    instructions:
      "Cut filler words, dead air and false starts. Keep natural breathing pauses between thoughts — this look depends on the viewer sitting with each phrase, so don't compress the speech into a wall of sound.",
    cut_aggression: "natural",
  },

  framing: {
    zoom_punches: { enabled: false, scale: 1, trigger: "off" },
  },

  grade: { enabled: false },

  broll: {
    enabled: false,
    sources: [],
    persona: "",
    transition_in: "hard-cut",
    transition_out: "hard-cut",
  },

  subs: {
    enabled: true,
    font_family: "Poppins",
    font_family_fallbacks:
      '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
    // 700, not 800: Poppins-Bold is the only weight bundled in assets/fonts,
    // and the ASS path can only render what's on disk. Drop
    // Poppins-ExtraBold.ttf in there and this can go to 800.
    font_weight_standard: 700,
    // ~6.2% of a 1080-tall frame ≈ 67px. Large enough to carry the frame,
    // small enough that a 3-word chunk never approaches the edges at
    // max_width_pct 80.
    font_size_pct_height: 6.2,
    letter_spacing: "-0.025em",
    line_height: 1.15,
    case_standard: "lower",
    max_words_per_line: 3,
    max_chars_per_line: 24,
    max_lines_on_screen: 1,
    pause_threshold_sec: 0.35,
    punctuation_included: false,
    emoji_usage: false,
    color_standard_hex: "#FFFFFF",
    // Just below center — sits under the speaker's eyeline in a standard MCU
    // instead of down in the lower-third furniture.
    vertical_position_pct_from_top: 58,
    max_width_pct: 80,
    horizontal_alignment: "center",
    animation_in_standard: "fade",
    animation_in_duration_ms: 90,
    animation_in_easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    animation_out: "instant",
    animation_out_duration_ms: 0,
    // Whole chunk at once — see the note in the header comment.
    per_word_timing: "line-only",
    text_shadow: {
      color_hex: "#000000",
      opacity: 0.26,
      blur_px: 24,
      offset_y_px: 2,
    },
    outline: { width_pct_of_font: 0, shadow_pct_of_font: 0, color_hex: "#000000" },
    keyword: {
      enabled: false,
      picking_strategy: "off",
      render: "color-swap",
      font_weight: 700,
      font_size_pct_height: 6.2,
      case: "lower",
      tint_hex: "#FFFFFF",
      tint_opacity: 1,
      edge_specular_hex: "#FFFFFF",
      bevel_alpha: 0,
      refraction_amount: 0,
      drop_shadow: {
        enabled: false,
        color_hex: "#000000",
        opacity: 0,
        blur_px: 0,
        offset_y_px: 0,
      },
      animation_in: "fade",
      animation_in_duration_ms: 0,
    },
    layout: {
      word_arrangement: "horizontal",
      step_shift_pct: [],
      single_keyword_scale_multiplier: 1,
      sequential_reveal: false,
      per_word_y_step_pct: 0,
      helper_words: [],
      helper_word_size_pct_height: 0,
      bracket_word_size_pct_height: 0,
      bracket_offset_y_pct: 0,
      carrier_lockup: {
        enabled: false,
        carrier_size_pct_height: 6.2,
        carrier_font_weight: 700,
        carrier_case: "lower",
        row_gap_pct: 0,
      },
    },
  },

  motion_graphics: {
    title_cards: { enabled: false },
    callouts: { enabled: false, style: "off" },
    lower_thirds: false,
    logo_bug: false,
    number_counters: false,
  },

  sfx: { enabled: false, triggers: [] },

  music: { volume: 0.1, ducking: false },

  post_effects: {
    grain: { enabled: false },
    vignette: { enabled: false },
  },
};

export default style;
