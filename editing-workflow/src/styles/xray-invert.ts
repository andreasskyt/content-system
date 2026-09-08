/**
 * XRayInvert — composition style.
 *
 * Not a monolith. This preset is the composition of three orthogonal
 * components from src/styles/components/ plus the typography choices that
 * are specific to this look:
 *
 *   XRAY_DIFFERENCE_TREATMENT  — white text + mix-blend-mode: difference
 *   CENTER_STACKED_LAYOUT      — every word pinned at canvas center
 *   ONE_WORD_AT_A_TIME         — strict single-word strobe (1 word, 12 chars, 0.2s)
 *   + Montserrat 900 ALL CAPS, tight tracking
 *
 * To build a new style that shares any subset, import the same components
 * and spread them. Example — "5 words per line, normal-phrase chunking,
 * same xray color, different font":
 *
 *   const subs: SubsSpec = {
 *     enabled: true,
 *     ...XRAY_DIFFERENCE_TREATMENT,
 *     ...CENTER_STACKED_LAYOUT,
 *     ...NORMAL_PHRASE,
 *     font_family: "Geist",
 *     font_weight_standard: 700,
 *     // ...remaining required fields
 *   };
 *
 * Spread order = override precedence. Later spreads win; per-style
 * overrides come after the components.
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

  // ── BRAND-tuned defaults (locked 2026-06-10 from the "Comp. 1" ad) ──
  // This is the look [YOUR_NAME] approved: held words (no blink), 40% from the
  // bottom, large-but-fits sizing. Overrides the component spreads above.
  vertical_position_pct_from_top: 60, // 40% from the bottom
  xray_difference: {
    inactive_opacity: 0.0,
    blend_mode: "difference",
    // Hold each word until the next begins — kills the inter-word "blinking"
    // on fast speech. One word always on screen, swapping instantly.
    hold_until_next: true,
  },

  // ── Typography (style-specific) ───────────────────────────────────
  font_family: "Montserrat",
  font_family_fallbacks: "Helvetica Neue, Arial, sans-serif",
  font_weight_standard: 900,
  font_size_pct_height: 6.4, // large but long words still fit the frame width
  letter_spacing: "-0.03em",
  line_height: 1.05,
  case_standard: "upper",
  emoji_usage: false,

  // ── Entry/exit (style-specific) ───────────────────────────────────
  animation_in_standard: "none",
  animation_in_duration_ms: 0,
  animation_in_easing: "linear",
  animation_out: "instant",
  animation_out_duration_ms: 0,
  per_word_timing: "word-synced",

  // ── Keyword block (unused by xray-difference renderer, kept for type) ─
  keyword: {
    enabled: false,
    picking_strategy: "off",
    render: "color-swap",
    font_weight: 900,
    font_size_pct_height: 5.5,
    case: "upper",
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
    name: "XRayInvert",
    description:
      "BRAND default x-ray captions: white Montserrat 900 ALL CAPS inverted against the video (mix-blend-mode: difference), one word at a time, held until the next word (no blinking), large (6.4% height), positioned 40% from the bottom. Approved look from the Comp.1 ad, 2026-06-10.",
  },
  canvas: { mode: "fullscreen" },
  pacing: {
    instructions: "",
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
