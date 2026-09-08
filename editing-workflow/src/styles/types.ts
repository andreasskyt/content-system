/**
 * EditStyle — the full vocabulary a creator-named style can express.
 *
 * Scripts consume only the slice they care about (subs.ts reads `subs`,
 * pipeline.ts reads `pacing`, etc). Fields that aren't yet wired into a
 * script still belong here so the spec stays the source of truth and reveals
 * exactly which capabilities are missing — see capability matrix in CLAUDE.md.
 */

// ── Canvas / frame layout ────────────────────────────────────────────────────

export interface FrameDropShadow {
  color_hex: string;
  opacity: number;
  blur_px: number;
  offset_y_px: number;
}

export interface FrameSpec {
  /** "squarcle" = rounded rectangle. Reserve room for circle/square if needed later. */
  shape: "squarcle";
  /** Width of the inner frame as % of canvas width. */
  width_pct: number;
  /** Aspect ratio string, e.g. "4:5". Height is derived from this and width_pct. */
  aspect_ratio: string;
  /** Border radius as % of frame width — scales with resolution. */
  border_radius_pct_of_frame_width: number;
  vertical_alignment: "top" | "center" | "bottom";
  drop_shadow?: FrameDropShadow;
}

export interface CanvasSpec {
  /** "fullscreen" = video fills canvas (default). "framed" = video is masked into a smaller shape. */
  mode: "fullscreen" | "framed";
  /** Background color around the frame (only visible when mode === "framed"). */
  background_hex?: string;
  frame?: FrameSpec;
  /**
   * Force the render output to these dimensions regardless of source video size.
   * Use when the style's layout depends on a specific aspect (e.g. CreatorC
   * needs a 9:16 vertical canvas even when the source is landscape — the
   * source video is then cropped via objectFit:cover into the inner frame).
   * When undefined, scripts use the source video's dimensions.
   */
  output_width?: number;
  output_height?: number;
}

// ── Pacing / cutting ─────────────────────────────────────────────────────────

export interface PacingSpec {
  /** Free-text instructions appended to pipeline.ts --instructions. The CLI's --instructions are appended after this. */
  instructions: string;
  cut_aggression: "tight" | "natural" | "loose";
  /** Targets are advisory — the editor LLM uses them as soft constraints. */
  target_avg_shot_seconds?: number;
  target_cuts_per_minute?: number;
  beat_synced?: boolean;
}

// ── Framing / camera moves ───────────────────────────────────────────────────

export interface FramingSpec {
  /** TODO: needs scripts/zoom-punch.ts */
  zoom_punches: {
    enabled: boolean;
    scale: number;
    trigger: "keyword" | "topic-change" | "off";
    /** Ramp-in duration of the zoom in milliseconds. */
    attack_ms?: number;
    /** Ramp-out duration in milliseconds. */
    release_ms?: number;
  };
  speaker_framing_target?: "MCU" | "MS" | "CU";
}

// ── Color grade ──────────────────────────────────────────────────────────────

export interface GradeSpec {
  /** TODO: needs scripts/grade.ts (ffmpeg eq + colorbalance + optional LUT) */
  enabled: boolean;
  saturation_pct?: number;
  contrast?: "low" | "medium" | "medium-high" | "high";
  black_point?: "lifted" | "neutral" | "crushed";
  white_point?: "soft" | "neutral" | "hard";
  highlight_tint_hex?: string;
  shadow_tint_hex?: string;
  skin_tone_warmth?: "neutral" | "warm" | "very-warm";
  lut_file?: string;
}

// ── B-roll ───────────────────────────────────────────────────────────────────

export type BRollSourceKind =
  | "graphic-template" // BRAND's scene3d/staggered/particles
  | "lifestyle" // real lifestyle footage
  | "stock" // curated stock clips
  | "screen-rec" // browser/UI screen recordings
  | "paper-anim"; // 2D paper-style cut animations

export interface BRollSpec {
  enabled: boolean;
  sources: BRollSourceKind[];
  /** Free-text persona prepended to the broll planning prompt. */
  persona: string;
  /** When sources includes "graphic-template", restrict which Remotion templates Claude can pick. */
  allowed_templates?: string[];
  /** Color palette for graphic-template renders. */
  palette?: { primary_hex: string; accent_hex: string; bg_hex: string };
  target_cuts_per_minute?: number;
  avg_clip_seconds?: number;
  transition_in?: "hard-cut" | "fade" | "slide";
  transition_out?: "hard-cut" | "fade" | "slide";
  color_match_to_a_roll?: boolean;
  speed_ramps?: { enabled: boolean; curve?: string };
}

// ── Subtitles ────────────────────────────────────────────────────────────────

export type CaseStyle = "sentence" | "lower" | "upper";

export interface KeywordSpec {
  enabled: boolean;
  /** "ai-pick" runs a Claude pass; "off" disables; "manual" reserved for future UI marking */
  picking_strategy: "ai-pick" | "manual" | "off";
  /** Render strategy. "displacement-glass" uses SVG filter; others are simpler fallbacks. */
  render: "displacement-glass" | "color-swap" | "scale-pop";
  font_weight: number;
  font_size_pct_height: number;
  case: CaseStyle;
  /** Cyan-ish internal tint of the glass body. */
  tint_hex: string;
  tint_opacity: number;
  /** Edge highlight color for the bevel/specular hint. */
  edge_specular_hex: string;
  bevel_alpha: number;
  /** Pixel-space displacement amount for the SVG feDisplacementMap filter. */
  refraction_amount: number;
  drop_shadow: {
    enabled: boolean;
    color_hex: string;
    opacity: number;
    blur_px: number;
    offset_y_px: number;
  };
  animation_in: "refractive-bounce" | "scale-pop" | "fade";
  animation_in_duration_ms: number;
  /**
   * Optional list of hex colors. When color_strategy === "cycle", successive
   * keyword instances pick from this list in rotation. When strategy ===
   * "static" or unset, keyword falls back to tint_hex.
   */
  color_palette?: string[];
  /**
   * "semantic" picks color by the keyword's classified kind (impact / warning
   * / default) returned from the AI tagger — meaning beats randomness for
   * CreatorC's strict color rules. Falls back to tint_hex if no kind tag.
   */
  color_strategy?: "static" | "cycle" | "semantic";
  /** Color palette indexed by keyword_kind. Required when strategy === "semantic". */
  color_by_kind?: {
    impact: string;
    warning: string;
    default: string;
  };
  /**
   * X-Ray blend. When true, the keyword's body layer renders with CSS
   * mix-blend-mode: "difference" — white text against any underlying video
   * inverts the colors channel-by-channel, producing a glass-mask reveal of
   * the warm tones beneath. Stacks with the displacement filter for
   * refractive distortion. Routes the keyword through the shared
   * <XRayWord /> component so any style can opt in with a single switch.
   */
  xray_enabled?: boolean;
  /**
   * Per-style override for the displacement amount fed to the x-ray shader.
   * Bigger = warpier glass edges. Falls back to refraction_amount, then to
   * the component default (18) when neither is set.
   */
  xray_refraction_scale?: number;
}

/**
 * Italic-serif "narrative flair" treatment for transition/psychological words
 * (e.g. "smarter", "discipline", "testing"). Rendered in a classic serif
 * (Playfair Display) at the configured color, distinct from both the standard
 * sans-serif body and the bold uppercase keyword. CreatorC uses this for
 * its narrative beats.
 */
export interface SerifFlairSpec {
  enabled: boolean;
  font_family: string;
  font_family_fallbacks?: string;
  font_weight: number;
  italic: boolean;
  /** % of frame height. */
  font_size_pct_height: number;
  case: CaseStyle;
  color_hex: string;
}

/**
 * Layout behavior for caption blocks. Default values keep the original
 * BRAND/CreatorC look (horizontal flow, no step-shifting, no scale jumps);
 * Creator A enables stacking + step-shifts + single-keyword scale.
 */
export interface LayoutSpec {
  /**
   * "horizontal" — words flow left-to-right inside a line (BRAND, Rob).
   * "stacked-anchor" — every word in the active line is pinned to the
   *   same anchor point (vertical_position_pct_from_top × horizontal_alignment).
   *   No flex flow, no horizontal slots — words layer on top of each other
   *   and only the active one shows (via inactive_opacity). Used by the
   *   xray-difference + stacked composition; the only layout XRayInvertCaptions
   *   currently understands.
   * "hybrid" — horizontal by default; the keyword drops onto its own visual
   * row below. Words appear at their own `word.start`, layout pre-allocated.
   * "dual-gear" — Creator A's two-mode engine. Each line is tagged gear=1 or
   * gear=2 by the AI tagger:
   *   - Gear 1 (rapid-fire, default): show only the currently-spoken word
   *     (or up to `gear1.max_words_visible`), center-locked, swap as the
   *     speaker advances. No lingering.
   *   - Gear 2 (key-sentence stack): show the entire line at once as a
   *     compressed N-col × M-row grid (per `gear2.max_words_per_row` /
   *     `max_rows`), tight tracking and crushed line-height. Bracketed
   *     words split to their own row at `bracket_word_size_pct_height`.
   */
  word_arrangement: "horizontal" | "stacked-anchor" | "hybrid" | "dual-gear";
  /**
   * Legacy per-line vertical step offsets in % of frame height, applied on
   * top of `vertical_position_pct_from_top`. Y-only. Use `step_shifts`
   * instead for new presets — it supports X drift too and drives the
   * phrase-accumulation runs.
   */
  step_shift_pct: number[];
  /**
   * Per-line 2D step offsets (% of canvas dim). Drives Creator A's "written-out
   * cinematic sentence" pattern: when the next line's y_pct is GREATER than
   * the previous's, both lines are held simultaneously (the previous one
   * doesn't disappear). When the y_pct cycles back DOWN (or repeats), the
   * held stack clears and a new phrase begins.
   *
   * Example pattern for 3-line accumulating phrases:
   *   [{x_pct: -2, y_pct: 0}, {x_pct: 1, y_pct: 6}, {x_pct: 5, y_pct: 12}]
   * Lines 0,1,2 accumulate (y goes 0 → 6 → 12, each held). Line 3 wraps to
   * pattern[0] which is y=0 < 12, so the accumulated stack clears and line 3
   * starts a fresh phrase at the anchor.
   */
  step_shifts?: { x_pct: number; y_pct: number }[];
  /**
   * When a line contains exactly one word AND that word is a keyword, scale
   * the keyword's font size by this multiplier (in addition to the keyword's
   * own font_size_pct_height). 1 = no extra scale.
   */
  single_keyword_scale_multiplier: number;
  /**
   * hybrid only. When true, each word fades in at its own `word.start`
   * timestamp (sequential / word-synced reveal) but layout slots stay
   * pre-allocated so the row never reflows. When false, the whole line
   * appears at once.
   */
  sequential_reveal: boolean;
  /**
   * hybrid only. Vertical offset between visual rows in % of frame height.
   * Creator A uses ~6 — large enough that the dropped keyword feels like a
   * deliberate spatial step, not a wrap.
   */
  per_word_y_step_pct: number;
  /**
   * hybrid only. Lowercase tokens treated as "helper" words (prepositions/
   * articles/pronouns) — rendered at `helper_word_size_pct_height` instead
   * of the standard size, so content words and keywords visually dominate.
   */
  helper_words: string[];
  /**
   * hybrid only. Font size for helper words, % of frame height.
   */
  helper_word_size_pct_height: number;
  /**
   * hybrid only. Font size for bracketed footnote words, % of frame height.
   * Bracket render wraps the word in `[...]`. Creator A uses ~4.5 — slightly
   * bigger than helpers, smaller than standard.
   */
  bracket_word_size_pct_height: number;
  /**
   * hybrid only. Vertical offset for bracketed words relative to their row
   * baseline, in % of frame height. Negative = above the row, positive =
   * below. Creator A uses ~-1 to lift brackets just off the baseline like an
   * editorial footnote.
   */
  bracket_offset_y_pct: number;
  /**
   * Kinetic positioning. When non-empty, successive caption blocks rotate
   * through this list of {x_pct, y_pct} positions instead of using the
   * static `vertical_position_pct_from_top`. y_pct is from canvas top;
   * x_pct is a horizontal offset from center (negative = left, positive =
   * right). Drives the "hop around the frame" feel for CreatorC.
   */
  spatial_positions?: { x_pct: number; y_pct: number }[];
  /**
   * Carrier+keyword vertical lockup. When enabled and a line contains a
   * keyword, the non-keyword words ("when I was") render at carrier size
   * directly above the keyword ("KID") on a separate row. Keyword stays at
   * its full massive size. Different from `hybrid` mode in that the
   * non-keyword words are treated uniformly as carriers (no helper/bracket
   * tagging needed).
   */
  carrier_lockup: {
    enabled: boolean;
    carrier_size_pct_height: number;
    carrier_font_weight: number;
    carrier_case: CaseStyle;
    /**
     * Legacy gap-based positioning. Ignored when carrier_y_pct/keyword_y_pct
     * are set — those are the preferred way to anchor each row to a fixed lane.
     */
    row_gap_pct: number;
    /**
     * Lane-snap positioning (CreatorC's 3-lane grid). When set, carrier row
     * is anchored at carrier_y_pct and keyword row at keyword_y_pct (% of
     * canvas height from top, both as the row's vertical center). Eliminates
     * any drift — text snaps to a stable grid.
     */
    carrier_y_pct?: number;
    keyword_y_pct?: number;
    /**
     * For solo-keyword lines (line is just the keyword, no carriers).
     * Defaults to keyword_y_pct when unset.
     */
    single_keyword_y_pct?: number;
  };
  /**
   * Rapid-fire word reveal for non-keyword lines. When enabled, standard
   * narrative lines render only the currently-spoken word (or up to
   * `words_visible` most recent words). Each word swaps in on its own
   * `start` timestamp instead of all words appearing as a static block.
   * Keyword-bearing lines still use carrier_lockup (ignored by rapid-fire).
   * Drives CreatorC's "no static text blocks" rule.
   */
  rapid_fire?: {
    enabled: boolean;
    /** 1 = single-word swap. 2 = rolling pair. */
    words_visible: number;
  };
  /**
   * dual-gear only. Gear 1 = rapid-fire single-word (or 2-word) flashes
   * center-locked. Words appear and disappear with each spoken syllable.
   */
  gear1?: {
    /** Vertical anchor for Gear 1 single-word display, % of frame height. */
    position_y_pct: number;
    /** How many consecutive words can be visible at once (1 = strict
     *  rapid-fire one-at-a-time; 2 = current word + previous still fading). */
    max_words_visible: number;
    /** Font weight for Gear 1 body text. */
    font_weight: number;
  };
  /**
   * dual-gear only. Gear 2 = entire key sentence stacked simultaneously
   * as a compressed grid. Used for hooks, transitions, title phrases.
   */
  gear2?: {
    /** Vertical anchor for the centered stack, % of frame height. */
    position_y_pct: number;
    /** Max words on a single row inside the stack. */
    max_words_per_row: number;
    /** Max rows in the stack — extra rows force bracket splits or row breaks. */
    max_rows: number;
    /** CSS letter-spacing override for the compressed stack. */
    letter_spacing: string;
    /** CSS line-height override — usually <1 for the crushed look. */
    line_height: number;
  };
  /**
   * Optional vertical linear gradient applied to standard body text fill
   * (both gears). Keyword glass overrides this. When unset, plain
   * `color_standard_hex` applies.
   */
  body_text_gradient?: { top_hex: string; bottom_hex: string };
  /**
   * Optional drop shadow applied to standard body text in either gear.
   * Distinct from `keyword.drop_shadow` which only affects the glass keyword.
   */
  body_drop_shadow?: {
    enabled: boolean;
    color_hex: string;
    opacity: number;
    blur_px: number;
    offset_y_px: number;
  };
}

/**
 * Color/blend treatment for word glyphs. ORTHOGONAL to layout — this is
 * about how a single word is *drawn* (color math), not where it sits.
 *
 * "solid"          — read color_standard_hex, paint normally. Default.
 * "xray-difference" — paint white + mix-blend-mode: difference so each
 *                     glyph shows the channel-by-channel negative of the
 *                     video underneath. Requires color_standard_hex
 *                     "#FFFFFF" for the inversion math. Tune the blend
 *                     mode and inactive opacity via `xray_difference`.
 *
 * Pairs with any layout (stacked-anchor, horizontal, hybrid, dual-gear,
 * etc). The renderer dispatch lives in StyledCaptions.tsx — today the
 * xray-difference treatment routes to the dedicated XRayInvertCaptions
 * component which only knows the stacked-anchor layout; other layouts
 * still go through the classic pipeline at the solid treatment.
 */
export type TextTreatment = "solid" | "xray-difference";

export interface XRayDifferenceSpec {
  /** Opacity for non-active words. 0 hides them; 0.3 = ghost skeleton. */
  inactive_opacity?: number;
  /**
   * Compositor blend mode applied to every word. "normal" opts out of the
   * inversion entirely — words paint as flat `color_standard_hex` while
   * keeping the rest of the treatment (stacked anchor, one word at a time,
   * hold-until-next). Use it when a video wants plain white captions with
   * x-ray timing.
   */
  blend_mode?: "difference" | "exclusion" | "normal";
  /**
   * Hold each word fully visible until the NEXT word begins, instead of
   * hiding it the instant it's spoken. Eliminates the blank gaps between
   * fast-spoken words that read as "blinking". One word is always on screen
   * (after the first), swapping instantly at each new word. Opt-in — default
   * off keeps the strict per-word strobe.
   */
  hold_until_next?: boolean;
}

export interface SubsSpec {
  enabled: boolean;
  /**
   * Color/blend treatment for word glyphs. Orthogonal to layout. See
   * TextTreatment for the value semantics. Omit (or "solid") for the
   * standard classic pipeline.
   */
  text_treatment?: TextTreatment;
  /** Tuning knobs for `text_treatment: "xray-difference"`. Ignored otherwise. */
  xray_difference?: XRayDifferenceSpec;
  font_family: string;
  /** Comma-separated CSS fallbacks appended after font_family. */
  font_family_fallbacks?: string;
  font_weight_standard: number;
  /** % of frame height — e.g. 5.5 → 5.5vh equivalent. */
  font_size_pct_height: number;
  /** CSS letter-spacing string, e.g. "-0.03em". */
  letter_spacing: string;
  line_height: number;
  case_standard: CaseStyle;
  max_words_per_line: number;
  max_chars_per_line: number;
  max_lines_on_screen: number;
  /** Seconds — pause longer than this in the transcript triggers a chunk break. */
  pause_threshold_sec: number;
  punctuation_included: boolean;
  emoji_usage: boolean;
  color_standard_hex: string;
  /** Vertical anchor of the caption block, % of frame height from top. */
  vertical_position_pct_from_top: number;
  /** Max horizontal extent of a line as % of frame width before scaling down. */
  max_width_pct: number;
  horizontal_alignment: "left" | "center" | "right";
  /** Standard (non-keyword) word/line entrance. */
  animation_in_standard: "pop" | "fade" | "karaoke" | "none";
  animation_in_duration_ms: number;
  /** CSS easing for the standard pop. */
  animation_in_easing: string;
  animation_out: "instant" | "fade";
  animation_out_duration_ms: number;
  /** "word-synced" highlights one word at a time as it's spoken (karaoke-style coloring). */
  per_word_timing: "word-synced" | "line-only";
  /**
   * How a line's words arrive on screen. Consumed by the ASS/libass renderer
   * (subs-raw.ts).
   * "karaoke"    — whole line visible from the start, spoken word recolored
   *                to `keyword.tint_hex`. Default when unset.
   * "cumulative" — line builds one word at a time ("you" → "you wanna" →
   *                "you wanna build"), every word the same color, and holds
   *                complete until the next line starts.
   */
  reveal?: "karaoke" | "cumulative";
  /**
   * Which way a word travels as it fades in. "up" starts it below the line and
   * lifts it into place; "down" starts it above and drops it in. Purely a feel
   * choice — the distance is deliberately small either way.
   */
  word_rise_direction?: "up" | "down";
  /**
   * How far a word travels as it fades in, as a fraction of its own font size.
   * A field rather than a constant because this is the number that gets tuned
   * every time the look is reviewed.
   */
  word_rise_em?: number;
  /**
   * Soft blurred shadow behind standard (non-keyword) words — the dark halo
   * that keeps white captions legible over bright footage. Consumed by both
   * renderers: CSS text-shadow in the Remotion path, a blurred black outline
   * (\blur) in the ASS path. When omitted, the Remotion path falls back to
   * half of `keyword.drop_shadow`, which is how every pre-2026-08 preset got
   * its shadow.
   */
  text_shadow?: {
    color_hex: string;
    opacity: number;
    blur_px: number;
    offset_y_px: number;
  };
  /**
   * Glyph outline + drop shadow, sized as a fraction of the font size so it
   * scales with resolution. Set both widths to 0 for flat text with no border
   * (the "youtube" look). Defaults to a black 0.1/0.04 outline when unset.
   */
  outline?: {
    width_pct_of_font: number;
    shadow_pct_of_font: number;
    color_hex: string;
  };
  /**
   * Semi-transparent background box behind the caption text (ASS
   * BorderStyle=3, consumed by subs-raw.ts). Overrides `outline` — the
   * outline width becomes the box padding. opacity: 0–1 (1 = solid).
   * With cumulative reveal the box builds under each word as it appears.
   */
  background_box?: {
    color_hex: string;
    opacity: number;
    /** Box padding around the glyphs as a fraction of the font size. */
    padding_pct_of_font: number;
  };
  keyword: KeywordSpec;
  layout: LayoutSpec;
  /** Optional italic-serif treatment for narrative/transition words. */
  serif_flair?: SerifFlairSpec;
  depth?: DepthHeaderSpec;
}

/**
 * Depth headers — massive text composited BEHIND the speaker via a person
 * segmentation mask. Rendered by scripts/depth.ts (ASS + ffmpeg) before
 * subs.ts draws the ordinary caption tiers on top, so the layering ends up
 * background → header → speaker → subtitles.
 *
 * The header has to be WIDER than the speaker's silhouette or the effect reads
 * as a glitch instead of depth: enough of the line must survive on both sides
 * of the head for the eye to complete it. That is why this tier is sized in
 * double digits and capped per minute — it is a punctuation mark, not a
 * caption track.
 */
export interface DepthHeaderSpec {
  enabled: boolean;
  /**
   * Own font, because this tier renders through libass, not Chromium. A
   * variable font (Inter) collapses to its Regular instance there — the header
   * needs a real static heavy face installed or bundled in assets/fonts.
   */
  font_family: string;
  /** Starting % of frame height, before width fitting. */
  font_size_pct_height: number;
  /**
   * depth.ts scales each header so the line spans `target_width_pct` of the
   * frame, clamped between the min and max below. A header only reads as depth
   * when its letters emerge on BOTH sides of the speaker, and how wide a given
   * phrase runs depends entirely on how many characters it happens to have —
   * so the size has to follow the text, not the other way round.
   */
  target_width_pct: number;
  min_font_size_pct_height: number;
  max_font_size_pct_height: number;
  /** Anchor in the TOP half of the frame; the head crosses it from below. */
  vertical_position_pct_from_top: number;
  case: CaseStyle;
  font_weight: number;
  letter_spacing: string;
  color_hex: string;
  /**
   * Entry and exit animation. The header is the loudest element in the frame,
   * and snapping something that large on and off reads as a glitch rather than
   * a cut — it needs to arrive and leave under its own power.
   */
  fade_in_ms: number;
  fade_out_ms: number;
  /** Vertical travel on entry, as a fraction of the header's font size. */
  rise_em: number;
  /**
   * Per-glyph drop shadow. Rendered as a second, blurred, black copy of the
   * same text sitting on a lower ASS layer — NOT a box behind the line. ASS's
   * built-in Shadow field is a hard offset copy with no blur, which reads as a
   * printing error at this size.
   */
  shadow: {
    enabled: boolean;
    color_hex: string;
    opacity: number;
    blur_px: number;
    offset_x_px: number;
    offset_y_px: number;
  };
  /**
   * Two-line staggered layout. The header breaks into two lines and the second
   * starts slightly BEFORE the first one ends, sitting below it — so the block
   * grows in height without growing in width, and the words stop sitting on the
   * frame's vertical centre line where the speaker's head always is.
   */
  two_line: {
    enabled: boolean;
    /** How far line 2's start sits left of line 1's end, as a fraction of line 1's width. */
    overlap_pct: number;
    /** Vertical distance between the two lines, in ems of the font size. */
    line_gap_em: number;
    /** Widest line targets this fraction of frame width. Two short lines let the type run bigger than one long one. */
    line_width_pct: number;
  };
  /** Hard ceiling on how many headers a minute of footage may carry. */
  max_per_minute: number;
  /** Words per header. Short enough to stay on one line at this size. */
  max_words: number;
}

// ── Motion graphics ──────────────────────────────────────────────────────────

export interface MotionGraphicsSpec {
  /**
   * Animation library Remotion compositions should pull from when wired.
   * "remotion-bits" = the `feed-remotion-bits` skill's bits (text animations,
   * gradient transitions, particle effects). "custom" = use whatever's in
   * src/remotion/compositions/. Creator A uses remotion-bits.
   */
  library?: "remotion-bits" | "custom";
  /** TODO: needs Remotion title-card composition */
  title_cards: {
    enabled: boolean;
    font?: string;
    style?: string;
    animation?: string;
  };
  /** TODO: needs Remotion overlay composition for callouts */
  callouts: {
    enabled: boolean;
    style: "red-circle-pointer" | "arrow" | "off";
  };
  lower_thirds: boolean;
  logo_bug: boolean;
  number_counters: boolean;
  easing_curve?: string;
}

// ── Sound effects ────────────────────────────────────────────────────────────

export interface SfxSpec {
  enabled: boolean;
  library_path?: string;
  triggers: ("keyword-sub" | "hard-cut" | "zoom-punch" | "title-card")[];
  volume_db?: number;
  /**
   * How the click track is placed. The governing idea: a click is an attention
   * RESET. Fire it on every word for a whole video and the ear stops hearing
   * it, which costs the effect and buys nothing. So it runs dense at the open,
   * where it signals "this is edited" and buys the first few seconds, then
   * drops to marking structure only.
   */
  placement?: {
    /** Words at the very start that each get a click. The hook burst. */
    opening_word_count: number;
    /** After the burst, click the first word of each caption line. */
    line_start_clicks: boolean;
    /** Depth headers get the heavier sound instead of a click. */
    header_sound: "thud" | "click" | "off";
    /** Soft tick on segment cuts. Sells the cut as deliberate. */
    cut_ticks: boolean;
    /** Gain relative to the click's own peak, before volume_db. */
    opening_gain: number;
    line_gain: number;
    header_gain: number;
    cut_gain: number;
  };
}

// ── Music ────────────────────────────────────────────────────────────────────

export interface MusicSpec {
  /** Vibe/track wiring is intentionally minimal — see plan; full vibe directory deferred. */
  default_vibe?: string;
  volume: number;
  ducking?: boolean;
}

// ── Post effects ─────────────────────────────────────────────────────────────

export interface PostEffectsSpec {
  /** TODO: needs scripts/post-fx.ts (ffmpeg noise + vignette) */
  grain: { enabled: boolean; intensity?: "light" | "medium" | "heavy" };
  vignette: { enabled: boolean; strength?: "subtle" | "medium" | "strong" };
  /** Advisory only — informs the editor/cinematographer, no automated effect. */
  depth_of_field?: boolean;
  frame_within_frame?: boolean;
}

// ── Top-level ────────────────────────────────────────────────────────────────

export interface EditStyle {
  meta: {
    name: string;
    description: string;
    reference_url?: string;
  };
  canvas: CanvasSpec;
  pacing: PacingSpec;
  framing: FramingSpec;
  grade: GradeSpec;
  broll: BRollSpec;
  subs: SubsSpec;
  motion_graphics: MotionGraphicsSpec;
  sfx: SfxSpec;
  music: MusicSpec;
  post_effects: PostEffectsSpec;
}
