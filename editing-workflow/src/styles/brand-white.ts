/**
 * BrandWhite — flat-white sibling of xray-invert.
 *
 * Same motion and layout as the x-ray look — every word pinned at one anchor,
 * one word at a time, held until the next word begins — but the words paint as
 * plain white instead of inverting against the footage, in lowercase Poppins
 * Bold rather than Montserrat 900 caps, and sit in the upper half.
 *
 * It still composes XRAY_DIFFERENCE_TREATMENT because that treatment is what
 * routes rendering to XRayInvertCaptions (the only component that knows the
 * stacked-anchor layout). `blend_mode: "normal"` is what drops the inversion —
 * the treatment supplies the machinery, not the color math.
 *
 * Built 2026-08-11 for the "caffein command" short and its 9 siblings.
 */

import type { EditStyle, SubsSpec } from "./types";
import {
  XRAY_DIFFERENCE_TREATMENT,
  CENTER_STACKED_LAYOUT,
  ONE_WORD_AT_A_TIME,
} from "./components";

const subs: SubsSpec = {
  enabled: true,

  // ── Composed components ───────────────────────────────────────────
  ...XRAY_DIFFERENCE_TREATMENT,
  ...CENTER_STACKED_LAYOUT,
  ...ONE_WORD_AT_A_TIME,

  // ── BrandWhite overrides ───────────────────────────────────────────
  vertical_position_pct_from_top: 30, // upper half — clear of the speaker's head
  color_standard_hex: "#FFFFFF",
  xray_difference: {
    inactive_opacity: 0.0,
    // "normal" = no inversion. Words paint flat white over the footage.
    blend_mode: "normal",
    // Hold each word until the next begins — kills inter-word blinking.
    hold_until_next: true,
  },

  // ── Typography ────────────────────────────────────────────────────
  font_family: "Poppins",
  font_family_fallbacks: "Helvetica Neue, Arial, sans-serif",
  font_weight_standard: 700,
  font_size_pct_height: 6.4,
  letter_spacing: "-0.03em",
  line_height: 1.05,
  case_standard: "lower",
  emoji_usage: false,

  // ── Entry/exit ────────────────────────────────────────────────────
  animation_in_standard: "none",
  animation_in_duration_ms: 0,
  animation_in_easing: "linear",
  animation_out: "instant",
  animation_out_duration_ms: 0,
  per_word_timing: "word-synced",

  // ── Keyword block (unused by this renderer, kept for type) ────────
  keyword: {
    enabled: false,
    picking_strategy: "off",
    render: "color-swap",
    font_weight: 700,
    font_size_pct_height: 5.5,
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
};

const style: EditStyle = {
  meta: {
    name: "BrandWhite",
    description:
      "Flat white lowercase Poppins Bold captions, one word at a time held until the next, large (6.4% height), positioned 30% from the top. Same motion as xray-invert without the inversion.",
  },
  canvas: { mode: "fullscreen" },
  pacing: {
    instructions:
      "Cut silences, dead air, filler words and false starts. Keep natural breathing pauses — clean but not over-cut.",
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
  },
  subs,
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
