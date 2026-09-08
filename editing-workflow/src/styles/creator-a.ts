/**
 * Creator A — Nordic-cozy editorial talking-head. Creator A is its own
 * style, COMPLETELY separate from BRAND. It does NOT share BRAND's deep-green/
 * beige brand palette, BRAND's graphic-template b-roll, or any other BRAND
 * element. Creator A's signature is silver-blue refractive-glass keywords on a
 * white sentence-case body in Poppins, run through the dual-gear engine:
 * Gear 1 = single-word rapid-fire (zero overlap), Gear 2 = compressed 3x3
 * billboard for hooks/transitions. Bracketed phrases split to a smaller row
 * beneath the Gear-2 stack.
 *
 * Capability today (2026-05): hybrid subs render fully (3-5 word horizontal
 * anchor rows, keyword drops to its own row, sequential per-word reveal,
 * bracketed footnotes, displacement-glass keywords with silver-blue rim).
 * Pending: footage-library b-roll, color grade, grain/vignette, zoom punches,
 * sfx, motion-graphics title cards from remotion-bits.
 */

import type { EditStyle } from "./types";

const style: EditStyle = {
  meta: {
    name: "Creator A",
    description:
      "Nordic-cozy editorial. Tight cuts, MCU framing, white sentence-case body subs with silver-blue refractive-glass keywords. Independent style — not affiliated with BRAND brand colors.",
  },

  canvas: { mode: "fullscreen" },

  pacing: {
    instructions:
      "Cut tight — Creator A pacing. Target ~28 cuts per minute, average shot ~2 seconds. Hard cuts only, no fades. Beat-synced with the music bed where possible. Cut filler aggressively (um, uh, like, you know). Keep emphatic pauses on key statements but kill all dead air. When the speaker changes topic or makes a strong claim, cut on the beat.",
    cut_aggression: "tight",
    target_avg_shot_seconds: 2.1,
    target_cuts_per_minute: 28.5,
    beat_synced: true,
  },

  framing: {
    // TODO: needs scripts/zoom-punch.ts to actually render
    zoom_punches: {
      enabled: true,
      scale: 1.05,
      trigger: "keyword",
    },
    speaker_framing_target: "MCU",
  },

  grade: {
    // TODO: needs scripts/grade.ts
    enabled: true,
    saturation_pct: 92,
    contrast: "medium-high",
    black_point: "crushed",
    white_point: "soft",
    highlight_tint_hex: "#FFFDF9",
    shadow_tint_hex: "#0C0E12",
    skin_tone_warmth: "warm",
  },

  broll: {
    // TODO: needs footage-library system to drive these sources. Until that
    // exists, Creator A renders should skip broll.ts and run subs directly on
    // edit.mp4.
    enabled: true,
    sources: ["lifestyle", "stock", "screen-rec", "paper-anim"],
    persona:
      "High-production-value original lifestyle footage, minimalist screen recordings, sleek 2D paper-cut animations, occasional curated stock. Hard cuts in/out. Color-match to A-roll (warm filmic). Speed-ramp slider movements with smooth ease-in-out.",
    target_cuts_per_minute: 14.2,
    avg_clip_seconds: 1.8,
    transition_in: "hard-cut",
    transition_out: "hard-cut",
    color_match_to_a_roll: true,
    speed_ramps: { enabled: true, curve: "ease-in-out" },
  },

  subs: {
    enabled: true,
    font_family: "Poppins",
    font_family_fallbacks: "Inter, Geist, Roboto, system-ui, sans-serif",
    font_weight_standard: 800,
    font_size_pct_height: 5.5,
    letter_spacing: "-0.05em",
    line_height: 1.1,
    case_standard: "sentence",
    // Dual-gear: chunker can produce up to 9-word lines so Gear-2 hooks can
    // fill a 3x3 stack. Gear-1 lines run word-by-word inside whatever the
    // chunker emits.
    max_words_per_line: 9,
    max_chars_per_line: 50,
    max_lines_on_screen: 1,
    pause_threshold_sec: 0.25,
    punctuation_included: false,
    emoji_usage: false,
    color_standard_hex: "#FFFFFF",
    vertical_position_pct_from_top: 60,
    max_width_pct: 80,
    horizontal_alignment: "center",
    animation_in_standard: "pop",
    animation_in_duration_ms: 150,
    animation_in_easing: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    animation_out: "instant",
    animation_out_duration_ms: 0,
    per_word_timing: "line-only",
    keyword: {
      enabled: true,
      picking_strategy: "ai-pick",
      render: "displacement-glass",
      font_weight: 900,
      font_size_pct_height: 8.5,
      case: "lower",
      // Silver-blue refractive-glass: cyan-tinted body + bright silver-blue
      // rim, black drop shadow. This is Creator A's own palette; it has nothing
      // to do with the BRAND brand colors.
      tint_hex: "#9CE9F5",
      tint_opacity: 0.32,
      edge_specular_hex: "#D8F3FF",
      bevel_alpha: 0.55,
      refraction_amount: 15,
      drop_shadow: {
        enabled: true,
        color_hex: "#000000",
        opacity: 0.30,
        blur_px: 18,
        offset_y_px: 4,
      },
      animation_in: "refractive-bounce",
      animation_in_duration_ms: 280,
      // X-Ray glass: route keywords through the shared <XRayWord /> shader so
      // the difference-blend body inverts the underlying footage and the
      // silver-blue tint paints back over the inversion. Creator A uses a softer
      // refraction (15) than Rob (18) — editorial, not chaotic.
      xray_enabled: true,
      xray_refraction_scale: 15,
    },
    layout: {
      // Dual-gear: AI tags each line as Gear 1 (rapid-fire single words)
      // or Gear 2 (compressed-stack key sentence).
      word_arrangement: "dual-gear",
      step_shift_pct: [],
      single_keyword_scale_multiplier: 1.0,
      sequential_reveal: true,
      per_word_y_step_pct: 0,
      helper_words: [],
      helper_word_size_pct_height: 0,
      bracket_word_size_pct_height: 4.5,
      bracket_offset_y_pct: 0,
      carrier_lockup: {
        enabled: false,
        carrier_size_pct_height: 4.0,
        carrier_font_weight: 500,
        carrier_case: "sentence",
        row_gap_pct: 0,
      },
      gear1: {
        // Center-locked rapid-fire: ONE word at a time. The previous word
        // vanishes the exact frame the next one pops in. Zero overlap.
        position_y_pct: 58,
        max_words_visible: 1,
        font_weight: 800,
      },
      gear2: {
        // Compressed key-sentence stack: tight tracking + crushed line-height
        // so a 3x3 grid feels like one cinematic block.
        position_y_pct: 55,
        max_words_per_row: 3,
        max_rows: 3,
        letter_spacing: "-0.05em",
        line_height: 0.85,
      },
      // Vertical white→off-white gradient on standard body text + soft
      // black drop-shadow for legibility against any background.
      body_text_gradient: { top_hex: "#FFFFFF", bottom_hex: "#F3F3F3" },
      body_drop_shadow: {
        enabled: true,
        color_hex: "#000000",
        opacity: 0.30,
        blur_px: 15,
        offset_y_px: 4,
      },
    },
  },

  motion_graphics: {
    // Creator A pulls title-card / callout animations from the remotion-bits
    // library (text animations, gradient transitions, particle effects).
    library: "remotion-bits",
    // TODO: needs Remotion title-card composition wired to remotion-bits
    title_cards: {
      enabled: true,
      font: "Poppins",
      style: "Minimalist overlay on warm filmic background",
      animation: "Soft fade-in via remotion-bits",
    },
    // TODO: needs Remotion overlay composition
    callouts: {
      enabled: true,
      style: "red-circle-pointer",
    },
    lower_thirds: false,
    logo_bug: false,
    number_counters: false,
    easing_curve: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },

  sfx: {
    // TODO: needs scripts/sfx.ts + a Creator A sfx pack (glass tinks, paper tears, key clicks)
    enabled: true,
    triggers: ["keyword-sub", "hard-cut"],
  },

  music: {
    default_vibe: "lo-fi-hip-hop",
    volume: 0.12,
    ducking: true,
  },

  post_effects: {
    // TODO: needs scripts/post-fx.ts
    grain: { enabled: true, intensity: "light" },
    vignette: { enabled: true, strength: "subtle" },
    depth_of_field: true,
    frame_within_frame: true,
  },
};

export default style;
