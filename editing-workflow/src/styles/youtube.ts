/**
 * YouTube — plain long-form caption look. No decoration: pure white Poppins,
 * one line at a time, no outline or shadow, sitting where standard 16:9
 * YouTube subtitles sit. The line builds word by word as it's spoken and
 * holds complete until the next line takes over.
 */

import type { EditStyle } from "./types";

const style: EditStyle = {
  meta: {
    name: "YouTube",
    description:
      "Plain white Poppins subtitles, single line, cumulative word-by-word build, no outline. Default for long-form YouTube.",
  },
  canvas: { mode: "fullscreen" },
  pacing: {
    instructions:
      "Cut filler words and dead air. Keep natural breathing pauses. Don't over-cut.",
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
    font_family_fallbacks: "system-ui, sans-serif",
    font_weight_standard: 700,
    font_size_pct_height: 4.6,
    letter_spacing: "0",
    line_height: 1.3,
    case_standard: "sentence",
    // 6 words / 32 chars keeps the built-up line inside frame on 16:9 without
    // ever needing a second row.
    max_words_per_line: 6,
    max_chars_per_line: 32,
    max_lines_on_screen: 1,
    pause_threshold_sec: 0.4,
    punctuation_included: true,
    emoji_usage: false,
    color_standard_hex: "#FFFFFF",
    vertical_position_pct_from_top: 94,
    max_width_pct: 90,
    horizontal_alignment: "center",
    // Each new word fades up in its own slot — the line is pre-allocated so
    // words already on screen never shift. Snapping words on read as jerky.
    animation_in_standard: "fade",
    animation_in_duration_ms: 140,
    animation_in_easing: "linear",
    animation_out: "instant",
    animation_out_duration_ms: 0,
    per_word_timing: "word-synced",
    reveal: "cumulative",
    outline: { width_pct_of_font: 0, shadow_pct_of_font: 0, color_hex: "#000000" },
    keyword: {
      enabled: false,
      picking_strategy: "off",
      render: "color-swap",
      font_weight: 700,
      font_size_pct_height: 4.6,
      case: "sentence",
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
      sequential_reveal: true,
      per_word_y_step_pct: 0,
      helper_words: [],
      helper_word_size_pct_height: 0,
      bracket_word_size_pct_height: 0,
      bracket_offset_y_pct: 0,
      carrier_lockup: {
        enabled: false,
        carrier_size_pct_height: 4.6,
        carrier_font_weight: 700,
        carrier_case: "sentence",
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
  sfx: {
    enabled: false,
    triggers: [],
  },
  music: {
    volume: 0.1,
    ducking: false,
  },
  post_effects: {
    grain: { enabled: false },
    vignette: { enabled: false },
  },
};

export default style;
