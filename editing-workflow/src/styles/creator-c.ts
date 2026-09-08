/**
 * CreatorC — Bezel-framed vertical with refractive uppercase keywords.
 *
 * Defining feature: the entire video plays inside a centered, drop-shadowed
 * 1:1 square (squarcle) floating on a pure black 9:16 canvas. Subtitles sit
 * at 70% from canvas top — that lands just inside the bottom of the square.
 * Standard subs are bold lowercase Montserrat; keyword subs are massive
 * uppercase with the same SVG-displacement glass effect Creator A uses
 * (turned up to 18).
 *
 * Capability today (2026-05): subs + canvas framing render fully.
 * Pending: zoom punches (1.1x on structural markers), pop-culture movie
 * b-roll inserts (needs footage-library system), color-swap keyword
 * alternatives (yellow/red/green for "narrative flair" words), grade,
 * vignette. Fields populated regardless so the spec is the source of truth.
 *
 * Note on font: spec asks for Helvetica Neue (system-only on macOS). We
 * use Montserrat as the primary (closest open-source equivalent, listed
 * as alternative in the spec) and keep Helvetica Neue + Arial in the CSS
 * fallback chain for machines that have them installed.
 */

import type { EditStyle } from "./types";

const style: EditStyle = {
  meta: {
    name: "CreatorC",
    description:
      "Bezel-framed vertical. Centered 4:5 squarcle on black 9:16 canvas, rapid 1-2 word lowercase subs with massive uppercase glass-refracting keywords. Hard cuts, beat-synced, high-energy music bed.",
  },

  canvas: {
    mode: "framed",
    background_hex: "#000000",
    // 9:16 vertical canvas — Rob's defining format. Forces output to 1080×1920
    // regardless of source aspect; landscape sources get cropped via cover into
    // the inner squarcle (preserves a centered talking head).
    output_width: 1080,
    output_height: 1920,
    frame: {
      shape: "squarcle",
      // 86% width = ~929px on a 1080 canvas → ~76px black gutter on each side.
      // 1:1 aspect → exactly square (929×929), centered vertically in the 1920
      // canvas (~496px black above + below). Visually balanced.
      width_pct: 86,
      aspect_ratio: "1:1",
      // 48px target border radius on a 929px-wide frame → 48/929 ≈ 5.17%
      border_radius_pct_of_frame_width: 5.17,
      vertical_alignment: "center",
      drop_shadow: {
        color_hex: "#000000",
        opacity: 0.4,
        blur_px: 30,
        offset_y_px: 15,
      },
    },
  },

  pacing: {
    instructions:
      "Cut RUTHLESSLY tight — Rob The Bank pacing. Target ~50 cuts per minute, average shot ~1.2 seconds. Hard cuts only, beat-synced to a high-energy music bed. Kill every filler word, every breath, every dead frame. Cut on emphasis syllables. When the speaker hits a strong noun or verb, that's a cut point. CRITICAL: ALWAYS preserve the speaker's opening hook (the FIRST complete spoken thought in the source video) — this is the attention-grabber that makes a short-form video work. The first segment of the final edit MUST start at or very near the source video's beginning, capturing the opener verbatim. Only after the hook is locked in should you ruthlessly cut down the middle.",
    cut_aggression: "tight",
    target_avg_shot_seconds: 1.2,
    target_cuts_per_minute: 50.0,
    beat_synced: true,
  },

  framing: {
    // TODO: needs scripts/zoom-punch.ts — 1.1x digital zooms locked to keyword frames.
    // Attack/release tuned for the snap-in feel: 80ms ramp-in lands inside the keyword's
    // refractive-bounce window; 140ms ramp-out coasts back out across the next syllable.
    zoom_punches: {
      enabled: true,
      scale: 1.1,
      trigger: "keyword",
      attack_ms: 80,
      release_ms: 140,
    },
    speaker_framing_target: "MCU",
  },

  grade: {
    // TODO: needs scripts/grade.ts — high-contrast tropical-warm
    enabled: true,
    saturation_pct: 110,
    contrast: "high",
    black_point: "neutral",
    white_point: "neutral",
    highlight_tint_hex: "#FFFFF2",
    shadow_tint_hex: "#050608",
    skin_tone_warmth: "very-warm",
  },

  broll: {
    // TODO: needs footage-library system to render movie inserts
    enabled: true,
    sources: ["lifestyle", "stock"],
    persona:
      "High-gloss personal lifestyle b-roll mixed with recognizable cinematic movie clips (Wolf of Wall Street, House of Gucci energy). Hard cuts in/out, no fades. ~38 cuts per minute, ~1.1s per clip. Premium, aspirational, status-coded. All footage must be CROPPED to fit the central 4:5 squarcle — no full-frame replacements.",
    target_cuts_per_minute: 38.5,
    avg_clip_seconds: 1.1,
    transition_in: "hard-cut",
    transition_out: "hard-cut",
    color_match_to_a_roll: false,
    speed_ramps: { enabled: false },
  },

  subs: {
    enabled: true,
    font_family: "Montserrat",
    font_family_fallbacks: '"Helvetica Neue", "Arial Bold", Arial, system-ui, sans-serif',
    font_weight_standard: 800,
    font_size_pct_height: 4.8,
    letter_spacing: "-0.04em",
    line_height: 1.05,
    case_standard: "lower",
    // 3-word max keeps standard chunks tight (per spec). When a chunk also
    // contains a keyword, that's 2 carriers + 1 keyword in the lockup. Char
    // ceiling tuned so a "the feeling of" / "SCALING" bundle fits in one chunk.
    max_words_per_line: 3,
    max_chars_per_line: 22,
    max_lines_on_screen: 2,
    pause_threshold_sec: 0.2,
    punctuation_included: false,
    emoji_usage: false,
    color_standard_hex: "#FFFFFF",
    // MID-LANE (Y: 58%) — the default standard narrative position. Lines
    // without a keyword anchor here. Carrier+keyword lockups use the lane
    // positions in carrier_lockup below.
    vertical_position_pct_from_top: 58,
    max_width_pct: 82,
    horizontal_alignment: "center",
    animation_in_standard: "pop",
    animation_in_duration_ms: 120,
    animation_in_easing: "cubic-bezier(0.165, 0.84, 0.44, 1)",
    animation_out: "instant",
    animation_out_duration_ms: 0,
    per_word_timing: "word-synced",
    keyword: {
      enabled: true,
      picking_strategy: "ai-pick",
      render: "displacement-glass",
      font_weight: 900,
      // Bumped to 8.0% per spec — massive vs the 4.5% carrier creates the
      // extreme scale contrast Rob calls for.
      font_size_pct_height: 8.0,
      case: "upper",
      tint_hex: "#9CE9F5",
      tint_opacity: 0.35,
      edge_specular_hex: "#D8F3FF",
      bevel_alpha: 0.55,
      refraction_amount: 18,
      drop_shadow: {
        enabled: true,
        color_hex: "#000000",
        // Bolder shadow for the lower-lane keyword ("bold drop shadow" per spec)
        opacity: 0.45,
        blur_px: 22,
        offset_y_px: 8,
      },
      animation_in: "refractive-bounce",
      animation_in_duration_ms: 180,
      // Semantic color coding — meaning beats randomness. The AI tagger
      // classifies each keyword as impact / warning / default; the renderer
      // pulls the matching color. No more sequential cycling.
      color_strategy: "semantic",
      color_by_kind: {
        impact: "#FFF200", // high-status, growth, achievement, momentum
        warning: "#FF2A2A", // breakage, transition, danger, numbers of change
        default: "#FFFFFF", // fallback for keywords that don't classify cleanly
      },
      // X-Ray glass: difference-blend the keyword body against the underlying
      // video, exposing inverted warm tones through the glyphs. Routes through
      // the shared <XRayWord /> shader; refraction_scale overrides the legacy
      // refraction_amount when the xray path is active.
      xray_enabled: true,
      xray_refraction_scale: 18,
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
      // No spatial drift — captions snap to a stable 3-lane Y grid via
      // vertical_position_pct_from_top (mid-lane) and carrier_lockup lane
      // anchors below. Eliminates the chaotic per-line hop.
      spatial_positions: [],
      // Carrier+keyword vertical lockup with explicit 3-lane snapping.
      // Mid-lane (58%) holds the carrier row ("the feeling of").
      // Lower-lane (70%) holds the massive keyword ("SCALING").
      // Solo-keyword line snaps to the lower-lane too.
      carrier_lockup: {
        enabled: true,
        carrier_size_pct_height: 4.5,
        carrier_font_weight: 600,
        carrier_case: "lower",
        row_gap_pct: 0, // unused when *_y_pct are set
        carrier_y_pct: 58,
        keyword_y_pct: 70,
      },
      // Rapid-fire word reveal for non-keyword lines. words_visible: 2 lets
      // tight semantic pairs ("the feeling", "and so") read as one beat while
      // still sliding the older word out as the next pair lands. Keyword-
      // bearing lines still use the lockup.
      rapid_fire: {
        enabled: true,
        words_visible: 2,
      },
    },
    // Italic Playfair flair for narrative/transition words.
    serif_flair: {
      enabled: true,
      font_family: "Playfair Display",
      font_family_fallbacks: '"Times New Roman", Georgia, serif',
      font_weight: 700,
      italic: true,
      font_size_pct_height: 6.5,
      case: "lower",
      color_hex: "#FFF200",
    },
  },

  motion_graphics: {
    title_cards: { enabled: false },
    callouts: { enabled: false, style: "off" },
    lower_thirds: false,
    logo_bug: false,
    number_counters: false,
    easing_curve: "cubic-bezier(0.165, 0.84, 0.44, 1)",
  },

  sfx: {
    // TODO: needs scripts/sfx.ts — high-impact whooshes on movie cuts, bass drops on keywords
    enabled: true,
    triggers: ["hard-cut", "keyword-sub"],
  },

  music: {
    default_vibe: "high-energy-rhythmic",
    volume: 0.18,
    ducking: true,
  },

  post_effects: {
    // TODO: needs scripts/post-fx.ts — vignette only, no grain
    grain: { enabled: false },
    vignette: { enabled: true, strength: "medium" },
    depth_of_field: true,
    frame_within_frame: true,
  },
};

export default style;
