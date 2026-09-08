/**
 * BRAND — current default. Captures the look the toolkit shipped with before
 * the style library existed: gold karaoke subs, Poppins, graphic-template b-roll.
 */

import type { EditStyle } from "./types";

const style: EditStyle = {
  meta: {
    name: "BRAND",
    description:
      "House style. Gold karaoke subs (Poppins), graphic-template b-roll, natural cuts.",
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
    enabled: true,
    sources: ["graphic-template"],
    persona:
      "Premium tech. Bold typography. Confident, founder-energy. Match BRAND brand: deep green + gold accents.",
    palette: { primary_hex: "#BCAC8B", accent_hex: "#FFFFFF", bg_hex: "#000000" },
    transition_in: "hard-cut",
    transition_out: "hard-cut",
    color_match_to_a_roll: false,
    speed_ramps: { enabled: false },
  },
  subs: {
    enabled: true,
    font_family: "Poppins",
    font_family_fallbacks: "system-ui, sans-serif",
    font_weight_standard: 700,
    font_size_pct_height: 3.8,
    letter_spacing: "0",
    line_height: 1.3,
    case_standard: "sentence",
    max_words_per_line: 3,
    max_chars_per_line: 18,
    max_lines_on_screen: 1,
    pause_threshold_sec: 0.3,
    punctuation_included: true,
    emoji_usage: false,
    color_standard_hex: "#FFFFFF",
    vertical_position_pct_from_top: 88,
    max_width_pct: 95,
    horizontal_alignment: "center",
    animation_in_standard: "karaoke",
    animation_in_duration_ms: 200,
    animation_in_easing: "ease-out",
    animation_out: "fade",
    animation_out_duration_ms: 200,
    per_word_timing: "word-synced",
    keyword: {
      enabled: true,
      picking_strategy: "off",
      render: "color-swap",
      font_weight: 700,
      font_size_pct_height: 3.8,
      case: "sentence",
      tint_hex: "#BCAC8B",
      tint_opacity: 1,
      edge_specular_hex: "#BCAC8B",
      bevel_alpha: 0,
      refraction_amount: 0,
      drop_shadow: {
        enabled: true,
        color_hex: "#000000",
        opacity: 0.8,
        blur_px: 6,
        offset_y_px: 2,
      },
      animation_in: "scale-pop",
      animation_in_duration_ms: 150,
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
        carrier_size_pct_height: 3.8,
        carrier_font_weight: 500,
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
