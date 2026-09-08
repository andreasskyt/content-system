/**
 * LandscapeCamEnglandFast — the quick sibling of landscape-creator-b.
 *
 * Same frame, same colour, same fade-and-travel mechanics, same depth-header
 * tier. The only difference is cadence: ONE word on screen at a time, swapping
 * as the speaker advances, a half-step lighter and quicker.
 *
 * Three fields differ — font_weight_standard, animation_in_duration_ms and
 * layout.rapid_fire — so the two can be intercut inside one video without the
 * frame appearing to change. Keep them in lockstep when either is edited.
 */

import type { EditStyle } from "./types";

const style: EditStyle = {
  meta: {
    name: "LandscapeCamEnglandFast",
    description:
      "Fast variant: one lowercase Inter word at a time, a half-step lighter and quicker. Same fade-and-travel mechanics and depth-header tier as landscape-creator-b.",
  },

  canvas: { mode: "fullscreen" },

  pacing: {
    instructions:
      "Cut filler words, dead air and false starts, but keep the sentence rhythm intact — this style depends on ordinary speech running underneath so the keyword hits land as a break in the pattern. Don't compress everything into highlights; a video that's all payoff has no payoff.",
    cut_aggression: "natural",
  },

  framing: {
    // A slow push, not a punch. attack/release are the ramp durations for the
    // drift in and out; scale is how far it travels. Consumed by scripts/zoom.ts.
    zoom_punches: {
      enabled: true,
      scale: 1.08,
      trigger: "topic-change",
      attack_ms: 2200,
      release_ms: 1200,
    },
    speaker_framing_target: "MCU",
  },

  grade: { enabled: false },

  broll: {
    // TODO: LIST_REVEALS from the spec (large left-aligned numeral, ALL-CAPS
    // items popping in line-by-line on the right) maps onto the existing
    // "staggered"/"list" Remotion templates, but broll.ts does not yet read
    // template restrictions or palette from a style preset.
    enabled: false,
    sources: ["graphic-template", "lifestyle"],
    allowed_templates: ["list", "staggered", "counter"],
    avg_clip_seconds: 1.5,
    palette: { primary_hex: "#FFFFFF", accent_hex: "#FFFFFF", bg_hex: "#000000" },
    persona:
      "Two things only. (1) Numbered list reveals: large primary numeral on the left of the torso, ALL-CAPS bulleted sub-points popping in line-by-line on the right. (2) Hard cuts to 1-2s cinematic wide shots — walking a balcony, working on a laptop in headphones. Golden-hour, shallow depth of field, luxury exterior. Lower-third subtitles stay live over these cutaways so the narrative never breaks.",
    transition_in: "hard-cut",
    transition_out: "hard-cut",
  },

  subs: {
    enabled: true,
    font_family: "Inter",
    font_family_fallbacks:
      '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif',
    // A half-step under the calm preset: a single word carries more visual
    // mass than the same word inside a line, so it needs less weight to match.
    font_weight_standard: 600,
    // The reference measures 35-45px at 1080p; 5.2% ≈ 56px sits deliberately
    // above that, because at 40px the line disappears on a phone screen.
    font_size_pct_height: 5.2,
    letter_spacing: "-0.035em",
    line_height: 1.2,
    case_standard: "lower",
    // The line is a WIDTH budget, not a word count: words land one at a time
    // until the row is full, then the next row starts.
    max_words_per_line: 5,
    max_chars_per_line: 30,
    max_lines_on_screen: 1,
    pause_threshold_sec: 0.3,
    punctuation_included: false,
    emoji_usage: false,
    color_standard_hex: "#FFFFFF",
    // Chest / lower-third lane for speech that carries no keyword.
    // Lower chest, ~72% down. The top half is reserved for depth headers.
    vertical_position_pct_from_top: 72,
    max_width_pct: 80,
    horizontal_alignment: "center",
    // "none" keeps the LINE container instant — it never fades as a block.
    // animation_in_duration_ms drives the per-WORD reveal instead: each word
    // fades up from transparent and travels a short distance into place.
    animation_in_standard: "none",
    animation_in_duration_ms: 150,
    animation_in_easing: "linear",
    animation_out: "fade",
    animation_out_duration_ms: 220,
    // Word by word, left to right. Every word of the line is laid out from the
    // start and only fades and travels into place, so words already on screen
    // never shift when the next one lands.
    per_word_timing: "word-synced",
    reveal: "cumulative",
    word_rise_direction: "up",
    // 0.24em ≈ 13px at this size. Enough travel to read as a move rather than
    // a blink, without the line appearing to bounce.
    word_rise_em: 0.24,
    // Subtle — enough to lift the line off a busy background, not enough to
    // read as a shadow. CSS text-shadow follows the glyphs, so this is never
    // a box behind the text.
    text_shadow: {
      color_hex: "#000000",
      opacity: 0.28,
      blur_px: 14,
      offset_y_px: 2,
    },
    outline: { width_pct_of_font: 0, shadow_pct_of_font: 0, color_hex: "#000000" },
    // Tier 3. Rendered by scripts/depth.ts, not by StyledCaptions — the header
    // is composited under the speaker before Remotion ever sees the video.
    depth: {
      enabled: true,
      // Montserrat Black, not Inter: this tier goes through libass, where the
      // installed Inter is a variable font and renders as Regular.
      font_family: "Montserrat Black",
      // Starting size only — depth.ts scales each header to span
      // target_width_pct of the frame, within min/max below. 12% ≈ 130px sits
      // in the reference's 100-140pt band.
      font_size_pct_height: 12,
      min_font_size_pct_height: 10,
      max_font_size_pct_height: 20,
      // The header must run nearly the full frame so its letters emerge on
      // BOTH sides of the speaker. Narrower and it just disappears behind him.
      target_width_pct: 88,
      // Top third. The speaker's head and shoulders cut into it from below.
      vertical_position_pct_from_top: 30,
      case: "upper",
      font_weight: 900,
      letter_spacing: "-0.045em",
      color_hex: "#FFFFFF",
      // Arrives and leaves under its own power. At 130px a hard cut on and off
      // reads as a glitch; a short fade with a little travel reads as intent.
      fade_in_ms: 340,
      fade_out_ms: 340,
      rise_em: 0.16,
      // Heavier than the caption tier on purpose: at 200px the header should
      // feel like it has weight sitting in the room, not like a flat overlay.
      shadow: {
        enabled: true,
        color_hex: "#000000",
        opacity: 0.55,
        blur_px: 26,
        offset_x_px: 0,
        offset_y_px: 10,
      },
      // Staggered two-line block. Each line is short, so the type runs much
      // larger than a single line of the same total width — taller, not wider.
      two_line: {
        enabled: true,
        overlap_pct: 0.12,
        line_gap_em: 0.92,
        line_width_pct: 58,
      },
      // Sparingly. Every header competes with the speaker for the frame, and
      // the effect stops reading as deliberate if it fires constantly.
      max_per_minute: 5,
      max_words: 6,
    },
    keyword: {
      // Off by design — see the note at the top of this file. Turning this on
      // reintroduces ALL-CAPS words inside the subtitle line.
      enabled: false,
      picking_strategy: "off",
      render: "scale-pop",
      font_weight: 900,
      // Emphasis, not headline. 4.3% vs the 3.7% body is a deliberate half-step:
      // the ALL-CAPS conversion is what marks the word, and a big size jump here
      // would compete with the depth-header tier instead of supporting it.
      font_size_pct_height: 4.3,
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
      animation_in: "scale-pop",
      animation_in_duration_ms: 0,
      // Every word is #FFFFFF. Scale and casing carry the emphasis on their
      // own — no accent color, in any tier.
      color_strategy: "static",
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
      // One word on screen, swapping as the speaker advances.
      rapid_fire: { enabled: true, words_visible: 1 },
      // Off on purpose. The lockup lifts keywords into their own lane, but
      // emphasis words belong INSIDE the sentence — "and even a majority of
      // what i do NOW". Lifting them out would turn every emphasis into a
      // pseudo-headline and leave nothing for the depth-header tier to be.
      carrier_lockup: {
        enabled: false,
        carrier_size_pct_height: 3.7,
        carrier_font_weight: 900,
        carrier_case: "lower",
        row_gap_pct: 0,
      },
    },
  },

  motion_graphics: {
    library: "remotion-bits",
    // TODO: UI_CARDS from the spec (0.1s scale-in for scorecards, icons,
    // diagrams) needs a Remotion overlay composition. No renderer today.
    title_cards: { enabled: false },
    callouts: { enabled: false, style: "off" },
    lower_thirds: false,
    logo_bug: false,
    number_counters: true,
    easing_curve: "cubic-bezier(0.16, 1, 0.3, 1)",
  },

  sfx: {
    enabled: true,
    library_path: "assets/sfx/clicks",
    triggers: ["keyword-sub", "title-card"],
    volume_db: -19,
    placement: {
      // Seven words is roughly the first two seconds — long enough to establish
      // a rhythm, short enough that it reads as an opening flourish rather than
      // a tic that runs all video.
      opening_word_count: 7,
      line_start_clicks: true,
      header_sound: "thud",
      cut_ticks: true,
      opening_gain: 1.0,
      line_gain: 0.62,
      header_gain: 1.0,
      cut_gain: 0.4,
    },
  },

  music: {
    default_vibe: "high-energy-rhythmic",
    volume: 0.12,
    ducking: true,
  },

  post_effects: {
    grain: { enabled: false },
    vignette: { enabled: false },
  },
};

export default style;

/**
 * NOT YET IMPLEMENTABLE — recorded so the spec isn't lost.
 *
 * TIER 3, DEPTH HEADERS. Massive ALL-CAPS text in the TOP HALF of the frame,
 * rendered between the background and the speaker's head and shoulders via a
 * subject segmentation mask ("WHEN I FIRST", "I DONT HEAR ENOUGH"). Needs a
 * per-frame alpha matte of the speaker plus a three-layer composite in
 * StyledCaptionedVideo: full frame, then text, then the matted subject on top.
 * That is a new script (scripts/matte.ts producing a VP9/yuva420p matte.webm),
 * not a config flag, so no field is declared for it here — a switch with no
 * renderer would only make the preset lie.
 *
 * The constraint that makes or breaks it: the header must be WIDER than the
 * speaker's silhouette, or it reads as a bug rather than depth. Enough of the
 * line has to survive on both sides of the head for the eye to complete it.
 * This tier is exactly why emphasis (tier 2) stays small and inline — the two
 * would compete for the same role otherwise.
 *
 * NUMBERED LIST SCAFFOLDING. Large numeral left of the torso, ALL-CAPS bullets
 * popping in line-by-line on the right. Maps onto the existing "list" and
 * "staggered" Remotion templates, but broll.ts does not yet read
 * allowed_templates or palette from a style preset.
 *
 * DARK-MODE UI CARDS. Full-screen #000000 at ~85% with glassmorphism dashboard
 * cards, white metric text, accent badges. Needs a Remotion overlay
 * composition; motion_graphics.callouts has no renderer.
 *
 * ABSTRACT VECTOR GRAPHICS. Radar rings / dartboard targets around background
 * objects, spiral dot clusters expanding into a word. Needs both a composition
 * and a way to anchor a graphic to a point in the footage.
 */
