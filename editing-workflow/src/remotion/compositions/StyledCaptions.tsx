import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

import type { SubsSpec } from "../../styles/types";
import { XRayWord } from "../components/XRayWord";
import { XRayInvertCaptions } from "../components/XRayInvertCaptions";

// Load every font any preset might ask for. Remotion only emits the ones used.
loadInter("normal", { weights: ["400", "700", "900"] });
loadPoppins("normal", { weights: ["400", "700"] });
loadGeist("normal", { weights: ["400", "700", "900"] });
loadRoboto("normal", { weights: ["400", "700", "900"] });
loadMontserrat("normal", { weights: ["400", "700", "800", "900"] });
loadPlayfair("normal", { weights: ["400", "700"] });
loadPlayfair("italic", { weights: ["400", "700"] });

export interface StyledCaptionWord {
  text: string;
  start: number;
  end: number;
  isKeyword?: boolean;
  isBracketed?: boolean;
  /** Italic-serif "narrative flair" treatment (Playfair Display italic). */
  isFlair?: boolean;
  /** Semantic classification — drives semantic color picking on keywords. */
  keywordKind?: "impact" | "warning" | "default";
}

export interface StyledCaptionLine {
  words: StyledCaptionWord[];
  start: number;
  end: number;
  /**
   * Render gear for dual-gear styles (Creator A). 1 = rapid-fire single-word
   * mode (default). 2 = compressed-stack key-sentence mode. Ignored by
   * non-dual-gear styles.
   */
  gear?: 1 | 2;
}

export interface StyledCaptionsProps {
  lines?: StyledCaptionLine[];
  subsStyle?: SubsSpec;
  /** Master video path — forwarded to <XRayWord /> for the clip-path render. */
  videoSrc?: string;
}

const TAIL_HOLD_SEC = 0.15;
const FILTER_ID = "brand-glass-refraction";
const SHADOW_FILTER_ID = "brand-glass-shadow";

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function caseTransform(text: string, c: SubsSpec["case_standard"]): string {
  if (c === "lower") return text.toLowerCase();
  if (c === "upper") return text.toUpperCase();
  return text;
}

export const StyledCaptions: React.FC<StyledCaptionsProps> = ({
  lines = [],
  subsStyle,
  videoSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();

  if (!subsStyle || !subsStyle.enabled || lines.length === 0) return null;
  // Narrowed alias for use inside closures that lose the null narrowing.
  const ss = subsStyle;

  const currentSec = frame / fps;

  // Treatment dispatch. "xray-difference" routes to the dedicated
  // difference-blend component — bypasses every karaoke / keyword-glass /
  // carrier-lockup / dual-gear code path below. XRayInvertCaptions is
  // currently hard-coded to the "stacked-anchor" layout; other layouts
  // paired with xray-difference are not yet wired.
  if (subsStyle.text_treatment === "xray-difference") {
    return <XRayInvertCaptions lines={lines} subsStyle={subsStyle} />;
  }

  // Shadow behind standard words. Presets that set `subs.text_shadow` control
  // it directly; older ones inherit half of the keyword shadow, which is where
  // this look used to come from.
  const ts = subsStyle.text_shadow;
  const kws = subsStyle.keyword.drop_shadow;
  const standardTextShadow = ts
    ? `0 ${ts.offset_y_px}px ${ts.blur_px}px ${hexToRgba(
        ts.color_hex,
        ts.opacity
      )}`
    : kws.enabled
    ? `0 ${kws.offset_y_px / 2}px ${kws.blur_px / 2}px rgba(0,0,0,${kws.opacity})`
    : "none";

  // Layout block — backwards-compatible defaults for older presets that
  // pre-date the layout field on disk.
  const layout = subsStyle.layout ?? {
    word_arrangement: "horizontal" as const,
    step_shift_pct: [] as number[],
    single_keyword_scale_multiplier: 1,
    sequential_reveal: false,
    per_word_y_step_pct: 0,
    helper_words: [] as string[],
    helper_word_size_pct_height: 0,
    bracket_word_size_pct_height: 0,
    bracket_offset_y_pct: 0,
    spatial_positions: undefined,
    step_shifts: undefined,
    carrier_lockup: {
      enabled: false,
      carrier_size_pct_height: 4.5,
      carrier_font_weight: 600,
      carrier_case: "lower" as const,
      row_gap_pct: 1.5,
    },
  };
  const isHybrid = layout.word_arrangement === "hybrid";
  const isDualGear = layout.word_arrangement === "dual-gear";
  const helperSet = new Set(layout.helper_words.map((w) => w.toLowerCase()));
  const cleanForLookup = (s: string) =>
    s.toLowerCase().replace(/[^a-z']/g, "");

  // Per-line step shift lookup. Prefer the 2D `step_shifts` (X+Y); fall back
  // to the legacy Y-only `step_shift_pct`.
  function getShift(idx: number): { x_pct: number; y_pct: number } {
    if (layout.step_shifts && layout.step_shifts.length > 0) {
      return layout.step_shifts[idx % layout.step_shifts.length];
    }
    if (layout.step_shift_pct.length > 0) {
      const y =
        layout.step_shift_pct[idx % layout.step_shift_pct.length];
      return { x_pct: 0, y_pct: y };
    }
    return { x_pct: 0, y_pct: 0 };
  }
  const hasShifts =
    (layout.step_shifts?.length ?? 0) > 0 || layout.step_shift_pct.length > 0;

  // Phrase-accumulation runs. When successive lines have INCREASING y_pct,
  // they're held simultaneously (the previous one doesn't disappear) — that
  // builds Creator A's cinematic "written-out sentence" pattern. When y_pct
  // wraps back DOWN (or doesn't increase), the held stack clears and a new
  // phrase begins. Without step shifts, every line is its own one-line run
  // (same behavior as before).
  type Run = { lines: number[]; start: number; end: number };
  const runs: Run[] = (() => {
    if (lines.length === 0) return [];
    if (!hasShifts) {
      return lines.map((line, i) => ({
        lines: [i],
        start: line.start,
        end: line.end + TAIL_HOLD_SEC,
      }));
    }
    const out: Run[] = [];
    let current: number[] = [0];
    for (let i = 1; i < lines.length; i++) {
      const prevY = getShift(current[current.length - 1]).y_pct;
      const thisY = getShift(i).y_pct;
      if (thisY > prevY) {
        current.push(i);
      } else {
        out.push({
          lines: [...current],
          start: lines[current[0]].start,
          end: lines[i].start,
        });
        current = [i];
      }
    }
    out.push({
      lines: [...current],
      start: lines[current[0]].start,
      end:
        lines[current[current.length - 1]].end + TAIL_HOLD_SEC,
    });
    return out;
  })();

  const activeRunIndex = runs.findIndex(
    (r) => currentSec >= r.start - 0.05 && currentSec <= r.end
  );
  if (activeRunIndex === -1) return null;
  const activeRun = runs[activeRunIndex];

  // Lines in the active run that have started by now (held stack).
  const visibleLineIndices = activeRun.lines.filter(
    (idx) => currentSec >= lines[idx].start - 0.05
  );
  if (visibleLineIndices.length === 0) return null;

  // The "primary" active line — used by single-line code paths (horizontal,
  // lockup) which still render only one line at a time.
  const activeIndex = visibleLineIndices[visibleLineIndices.length - 1];
  const activeLine = lines[activeIndex];

  // Keyword color strategies:
  //   "static"   → always tint_hex
  //   "cycle"    → walk a color_palette in keyword-occurrence order
  //   "semantic" → pick from color_by_kind based on the AI tagger's
  //                keywordKind classification (impact / warning / default)
  const palette = subsStyle.keyword.color_palette ?? [];
  const colorStrategy = subsStyle.keyword.color_strategy ?? "static";
  const useCyclePalette = colorStrategy === "cycle" && palette.length > 0;
  const useSemantic =
    colorStrategy === "semantic" && !!subsStyle.keyword.color_by_kind;

  function tintFor(lineIdx: number, wordIndexInLine: number): string {
    const word = lines[lineIdx]?.words[wordIndexInLine];
    if (useSemantic && word?.keywordKind) {
      const palette = ss.keyword.color_by_kind!;
      return palette[word.keywordKind] ?? ss.keyword.tint_hex;
    }
    if (useCyclePalette) {
      let kwOrdinal = 0;
      for (let i = 0; i < lineIdx; i++) {
        kwOrdinal += lines[i].words.filter((w) => w.isKeyword).length;
      }
      for (let i = 0; i < wordIndexInLine; i++) {
        if (lines[lineIdx].words[i].isKeyword) kwOrdinal++;
      }
      return palette[kwOrdinal % palette.length];
    }
    return ss.keyword.tint_hex;
  }

  // Solo-keyword line check — drives the scale multiplier in Creator A's
  // "is to / [ALWAYS]" pattern.
  const isSoloKeywordLine =
    subsStyle.keyword.enabled &&
    activeLine.words.length === 1 &&
    !!activeLine.words[0].isKeyword &&
    layout.single_keyword_scale_multiplier !== 1;

  const fontFamily = `${subsStyle.font_family}, ${
    subsStyle.font_family_fallbacks ?? "system-ui, sans-serif"
  }`;
  const fontSize = (subsStyle.font_size_pct_height / 100) * height;
  const baseKeywordFontSize =
    (subsStyle.keyword.font_size_pct_height / 100) * height;
  const keywordFontSize = isSoloKeywordLine
    ? baseKeywordFontSize * layout.single_keyword_scale_multiplier
    : baseKeywordFontSize;

  // Per-line vertical step shift — successive caption blocks drop/rise by these
  // % offsets to create Creator A's editorial "spatial step" cadence.
  const stepShiftPct =
    layout.step_shift_pct.length > 0
      ? layout.step_shift_pct[activeIndex % layout.step_shift_pct.length]
      : 0;

  // Kinetic positioning: spatial_positions overrides the static Y anchor +
  // adds an X offset. Each line picks the next entry in rotation. Drives
  // CreatorC's "hop around the squarcle" feel.
  const spatial = layout.spatial_positions ?? [];
  const spatialEntry =
    spatial.length > 0 ? spatial[activeIndex % spatial.length] : null;
  const yPct = spatialEntry
    ? spatialEntry.y_pct
    : subsStyle.vertical_position_pct_from_top + stepShiftPct;
  const xOffsetPct = spatialEntry ? spatialEntry.x_pct : 0;

  // Position: vertical_position_pct_from_top is the CENTER of the caption block.
  const top = (yPct / 100) * height;
  const horizontalShiftPx = (xOffsetPct / 100) * width;
  const horizontalAlign = subsStyle.horizontal_alignment;
  const justify =
    horizontalAlign === "left"
      ? "flex-start"
      : horizontalAlign === "right"
      ? "flex-end"
      : "center";

  // Standard pop: opacity + scale with bouncy ease-out-back.
  const lineStartFrame = Math.round(activeLine.start * fps);
  const localFrame = frame - lineStartFrame;
  const popDurationFrames = Math.max(
    1,
    Math.round((subsStyle.animation_in_duration_ms / 1000) * fps)
  );

  // "none" means a true 0-frame cut: the line is simply there on its first
  // frame. Without this branch the opacity ramp below has a hard 2-frame floor,
  // so even animation_in_duration_ms: 0 still fades.
  const instantIn =
    subsStyle.animation_in_standard === "none" ||
    subsStyle.animation_in_duration_ms === 0;

  // Cubic bezier (0.175, 0.885, 0.32, 1.275) — overshoots ~1.07 then settles to 1.
  const popEasing = Easing.bezier(0.175, 0.885, 0.32, 1.275);
  const popScale = instantIn
    ? 1
    : interpolate(localFrame, [0, popDurationFrames], [0.7, 1], {
        easing: popEasing,
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
  const popOpacity = instantIn
    ? localFrame >= 0
      ? 1
      : 0
    : interpolate(
        localFrame,
        [0, Math.max(2, Math.round(popDurationFrames * 0.4))],
        [0, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      );

  // Animation-out (single-line). Used by horizontal/lockup paths.
  const lineEndFrame = Math.round(activeLine.end * fps);
  const tailFrames = Math.max(
    1,
    Math.round(
      (subsStyle.animation_out_duration_ms > 0
        ? subsStyle.animation_out_duration_ms / 1000
        : TAIL_HOLD_SEC) * fps
    )
  );
  const outOpacity =
    subsStyle.animation_out === "instant"
      ? frame < lineEndFrame
        ? 1
        : 0
      : interpolate(
          frame,
          [lineEndFrame, lineEndFrame + tailFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

  // Run-based out opacity. All held lines in a phrase fade together when
  // the next phrase begins (or after tail hold for the final phrase).
  const runEndFrame = Math.round(activeRun.end * fps);
  const runOutOpacity =
    subsStyle.animation_out === "instant"
      ? frame < runEndFrame
        ? 1
        : 0
      : interpolate(
          frame,
          [runEndFrame, runEndFrame + tailFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

  const baseOpacity = Math.min(popOpacity, outOpacity);

  /**
   * Cumulative word-by-word reveal. Every word of the line is rendered from the
   * start so the row's layout is pre-allocated — words already on screen never
   * shift as the next one lands, which is what makes the reveal read as calm
   * rather than jittery. Only opacity and a small rise change over time.
   */
  const revealPerWord =
    subsStyle.per_word_timing === "word-synced" &&
    subsStyle.reveal === "cumulative";
  const riseDurationSec = Math.max(
    0.05,
    subsStyle.animation_in_duration_ms / 1000
  );
  const risePx =
    (subsStyle.font_size_pct_height / 100) *
    height *
    (subsStyle.word_rise_em ?? 0.12) *
    (subsStyle.word_rise_direction === "down" ? -1 : 1);

  // A duration of 0 means a hard snap: the word is simply there on its frame,
  // at full opacity, with no movement. Anything above 0 fades and rises in.
  const wordSnaps = subsStyle.animation_in_duration_ms === 0;

  const wordReveal = (
    word: StyledCaptionWord
  ): { opacity: number; riseP: number } | undefined => {
    if (!revealPerWord) return undefined;
    if (wordSnaps) {
      return { opacity: currentSec >= word.start ? 1 : 0, riseP: 0 };
    }
    const t = (currentSec - word.start) / riseDurationSec;
    if (t <= 0) return { opacity: 0, riseP: risePx };
    if (t >= 1) return { opacity: 1, riseP: 0 };
    // Ease-out: the word decelerates into place instead of arriving at speed.
    const eased = 1 - Math.pow(1 - t, 3);
    return { opacity: eased, riseP: risePx * (1 - eased) };
  };

  // Karaoke (per-word color highlighting) for BRAND-style.
  const isKaraoke = subsStyle.animation_in_standard === "karaoke";

  // Each word renders with its own scale spring if it's a keyword and the
  // animation is "refractive-bounce".
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* SVG defs for the refractive-glass filter — referenced by CSS filter: url(#…) */}
      <svg
        width="0"
        height="0"
        style={{ position: "absolute", inset: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter
            id={FILTER_ID}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012 0.02"
              numOctaves={2}
              seed={4}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={subsStyle.keyword.refraction_amount}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter
            id={SHADOW_FILTER_ID}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feDropShadow
              dx="0"
              dy={subsStyle.keyword.drop_shadow.offset_y_px}
              stdDeviation={subsStyle.keyword.drop_shadow.blur_px / 2}
              floodColor={subsStyle.keyword.drop_shadow.color_hex}
              floodOpacity={subsStyle.keyword.drop_shadow.opacity}
            />
          </filter>
        </defs>
      </svg>

      {isDualGear ? (
        // DUAL-GEAR (Creator A). Each line carries `gear: 1 | 2`. Gear 1 =
        // rapid-fire single words (no lingering); the currently-spoken word
        // is centered at gear1.position_y_pct and disappears as the next
        // word lands. Gear 2 = whole-sentence compressed grid (3x3 max);
        // tight tracking, crushed line-height, all words visible from
        // line.start to line.end. Bracketed words split to their own row
        // at bracket_word_size_pct_height. Body text gets a vertical
        // gradient + drop-shadow if configured on the layout spec.
        (() => {
          const gear: 1 | 2 = activeLine.gear === 2 ? 2 : 1;
          const gear1Cfg = layout.gear1 ?? {
            position_y_pct: ss.vertical_position_pct_from_top,
            max_words_visible: 1,
            font_weight: ss.font_weight_standard,
          };
          const gear2Cfg = layout.gear2 ?? {
            position_y_pct: 55,
            max_words_per_row: 3,
            max_rows: 3,
            letter_spacing: "-0.05em",
            line_height: 0.85,
          };
          const gradient = layout.body_text_gradient;
          const shadow = layout.body_drop_shadow;
          const bracketSize = Math.max(
            (layout.bracket_word_size_pct_height / 100) * height,
            fontSize * 0.6
          );

          const shadowFilter =
            shadow?.enabled
              ? `drop-shadow(0 ${shadow.offset_y_px}px ${shadow.blur_px}px rgba(${parseInt(
                  shadow.color_hex.slice(1, 3),
                  16
                )},${parseInt(shadow.color_hex.slice(3, 5), 16)},${parseInt(
                  shadow.color_hex.slice(5, 7),
                  16
                )},${shadow.opacity}))`
              : undefined;

          // Style block for standard body words. Gradient → WebKit text-fill
          // tricks; shadow → filter on the wrapping span (so it follows the
          // glyph outline rather than the bounding box).
          function bodyTextStyle(
            sizePx: number,
            weight: number
          ): React.CSSProperties {
            const s: React.CSSProperties = {
              fontFamily,
              fontSize: sizePx,
              fontWeight: weight,
              letterSpacing: ss.letter_spacing,
              lineHeight: ss.line_height,
              whiteSpace: "nowrap",
              display: "inline-block",
            };
            if (gradient) {
              s.backgroundImage = `linear-gradient(180deg, ${gradient.top_hex} 0%, ${gradient.bottom_hex} 100%)`;
              (s as any).WebkitBackgroundClip = "text";
              s.backgroundClip = "text";
              (s as any).WebkitTextFillColor = "transparent";
              s.color = "transparent";
            } else {
              s.color = ss.color_standard_hex;
            }
            return s;
          }

          // ─── GEAR 2: compressed-stack key sentence ──────────────────────
          if (gear === 2) {
            const rows: StyledCaptionWord[][] = [];
            let cur: StyledCaptionWord[] = [];
            for (const w of activeLine.words) {
              const isBracketed = !!w.isBracketed && !w.isKeyword;
              if (isBracketed) {
                if (cur.length > 0) rows.push(cur);
                rows.push([w]);
                cur = [];
              } else if (cur.length >= gear2Cfg.max_words_per_row) {
                rows.push(cur);
                cur = [w];
              } else {
                cur.push(w);
              }
            }
            if (cur.length > 0) rows.push(cur);
            const rowsToShow = rows.slice(0, gear2Cfg.max_rows);
            const centerY = (gear2Cfg.position_y_pct / 100) * height;

            return (
              <div
                style={{
                  position: "absolute",
                  top: centerY,
                  left: 0,
                  right: 0,
                  transform: `translateY(-50%) scale(${popScale})`,
                  transformOrigin: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  letterSpacing: gear2Cfg.letter_spacing,
                  lineHeight: gear2Cfg.line_height,
                  opacity: Math.min(popOpacity, outOpacity),
                  filter: shadowFilter,
                  pointerEvents: "none",
                }}
              >
                {rowsToShow.map((row, rowIdx) => (
                  <div
                    key={`g2-row-${rowIdx}`}
                    style={{
                      display: "flex",
                      gap: `0 ${fontSize * 0.18}px`,
                      alignItems: "baseline",
                    }}
                  >
                    {row.map((word, i) => {
                      const isKeyword =
                        !!word.isKeyword && ss.keyword.enabled;
                      const isBracketed =
                        !!word.isBracketed && !isKeyword;
                      if (isKeyword) {
                        return (
                          <KeywordWord
                            key={`g2-${rowIdx}-${i}`}
                            text={caseTransform(
                              word.text,
                              ss.keyword.case
                            )}
                            word={word}
                            spec={subsStyle}
                            fps={fps}
                            fontFamily={fontFamily}
                            fontSize={keywordFontSize}
                            frame={frame}
                            videoSrc={videoSrc}
                          />
                        );
                      }
                      const txt = caseTransform(
                        word.text,
                        ss.case_standard
                      );
                      const renderText = isBracketed
                        ? `[${txt.toLowerCase()}]`
                        : txt;
                      return (
                        <span
                          key={`g2-${rowIdx}-${i}`}
                          style={bodyTextStyle(
                            isBracketed ? bracketSize : fontSize,
                            isBracketed
                              ? 500
                              : ss.font_weight_standard
                          )}
                        >
                          {renderText}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          }

          // ─── GEAR 1: rapid-fire single words ────────────────────────────
          // STRICT word-by-word swap. Word i's visibility window ends EXACTLY
          // at word[i+1]'s start frame — zero overlap. The previous word
          // vanishes the same frame the next one pops in. Hard cut on exit,
          // rapid pop on entry.
          const centerY = (gear1Cfg.position_y_pct / 100) * height;
          const fadeIn = Math.max(2, Math.round(popDurationFrames * 0.5));

          // Find which single word should be visible RIGHT NOW. There is at
          // most one Gear-1 word on screen at any frame.
          const lineEndFrame = Math.round(activeLine.end * fps);
          const tailHoldFrames = Math.round(0.2 * fps);
          let activeWordIdx = -1;
          for (let i = 0; i < activeLine.words.length; i++) {
            const w = activeLine.words[i];
            const startF = Math.round(w.start * fps);
            const endF =
              i + 1 < activeLine.words.length
                ? Math.round(activeLine.words[i + 1].start * fps)
                : lineEndFrame + tailHoldFrames;
            if (frame >= startF && frame < endF) {
              activeWordIdx = i;
              break;
            }
          }
          if (activeWordIdx === -1) return null;
          const word = activeLine.words[activeWordIdx];
          const wordStartFrame = Math.round(word.start * fps);

          const popIn = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + fadeIn],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const wordOpacity = Math.min(popIn, outOpacity);
          const wordPopScale = interpolate(
            frame,
            [wordStartFrame, wordStartFrame + popDurationFrames],
            [0.85, 1],
            {
              easing: popEasing,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }
          );

          const isKeyword = !!word.isKeyword && ss.keyword.enabled;
          const txt = caseTransform(
            word.text,
            isKeyword ? ss.keyword.case : ss.case_standard
          );

          const wrapperStyle: React.CSSProperties = {
            position: "absolute",
            top: centerY,
            left: "50%",
            transform: `translate(-50%, -50%)`,
            opacity: wordOpacity,
            filter: !isKeyword ? shadowFilter : undefined,
            pointerEvents: "none",
          };

          if (isKeyword) {
            return (
              <div key={`g1-${activeWordIdx}`} style={wrapperStyle}>
                <KeywordWord
                  text={txt}
                  word={word}
                  spec={subsStyle}
                  fps={fps}
                  fontFamily={fontFamily}
                  fontSize={keywordFontSize}
                  frame={frame}
                  videoSrc={videoSrc}
                />
              </div>
            );
          }

          return (
            <div key={`g1-${activeWordIdx}`} style={wrapperStyle}>
              <span
                style={{
                  ...bodyTextStyle(fontSize, gear1Cfg.font_weight),
                  transform: `scale(${wordPopScale})`,
                  transformOrigin: "center",
                }}
              >
                {txt}
              </span>
            </div>
          );
        })()
      ) : isHybrid ? (
        // HYBRID + phrase accumulation. Every visible line in the active run
        // renders simultaneously at its own (x, y) offset. When the run ends,
        // the whole stack fades together via runOutOpacity. Within a line,
        // the keyword still drops onto its own visual row below the carriers.
        (() => {
          const helperSize =
            (layout.helper_word_size_pct_height / 100) * height;
          const bracketSize =
            (layout.bracket_word_size_pct_height / 100) * height;
          const bracketOffsetPx =
            (layout.bracket_offset_y_pct / 100) * height;

          return visibleLineIndices.flatMap((lineIdx) => {
            const line = lines[lineIdx];
            const words = line.words;
            const kwIdx = words.findIndex(
              (w) => !!w.isKeyword && subsStyle.keyword.enabled
            );
            type Row = { words: StyledCaptionWord[] };
            const rows: Row[] = [];
            if (kwIdx === -1) {
              rows.push({ words });
            } else {
              if (kwIdx > 0) rows.push({ words: words.slice(0, kwIdx) });
              rows.push({ words: [words[kwIdx]] });
              if (kwIdx < words.length - 1)
                rows.push({ words: words.slice(kwIdx + 1) });
            }

            // Per-line shift (X + Y).
            const shift = getShift(lineIdx);
            const lineTop =
              ((ss.vertical_position_pct_from_top + shift.y_pct) / 100) *
              height;
            const lineXPx = (shift.x_pct / 100) * width;

            const lineStartFrameLocal = Math.round(line.start * fps);
            const localFrameLocal = frame - lineStartFrameLocal;

            return rows.map((row, rowIdx) => {
              const rowY =
                lineTop +
                (rowIdx * layout.per_word_y_step_pct * height) / 100;
              return (
                <div
                  key={`${line.start}-row-${rowIdx}`}
                  style={{
                    position: "absolute",
                    top: rowY,
                    left: lineXPx,
                    right: -lineXPx,
                    transform: "translateY(-50%)",
                    display: "flex",
                    justifyContent: "center",
                    padding: `0 ${(100 - subsStyle.max_width_pct) / 2}%`,
                    opacity: runOutOpacity,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "nowrap",
                      gap: `0 ${fontSize * 0.28}px`,
                      alignItems: "baseline",
                      maxWidth: "100%",
                    }}
                  >
                    {row.words.map((word, i) => {
                      const isKeyword =
                        !!word.isKeyword && subsStyle.keyword.enabled;
                      const isBracketed = !!word.isBracketed && !isKeyword;
                      const isHelper =
                        !isKeyword &&
                        !isBracketed &&
                        helperSet.has(cleanForLookup(word.text));
                      const displayText = caseTransform(
                        word.text,
                        isKeyword
                          ? subsStyle.keyword.case
                          : subsStyle.case_standard
                      );

                      const wordStartFrame = Math.round(word.start * fps);
                      const localWordFrame = frame - wordStartFrame;
                      const animBase = layout.sequential_reveal
                        ? localWordFrame
                        : localFrameLocal;
                      const wordPopOpacity = interpolate(
                        animBase,
                        [0, Math.max(2, Math.round(popDurationFrames * 0.4))],
                        [0, 1],
                        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                      );
                      const wordPopScale = interpolate(
                        animBase,
                        [0, popDurationFrames],
                        [0.85, 1],
                        {
                          easing: popEasing,
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        }
                      );

                      if (isKeyword) {
                        return (
                          <KeywordWord
                            key={`${line.start}-${rowIdx}-${i}`}
                            text={displayText}
                            word={word}
                            spec={subsStyle}
                            fps={fps}
                            fontFamily={fontFamily}
                            fontSize={keywordFontSize}
                            frame={frame}
                            videoSrc={videoSrc}
                        />
                      );
                    }

                    const wordSizePx = isBracketed
                      ? bracketSize
                      : isHelper
                      ? helperSize
                      : fontSize;
                    const renderText = isBracketed
                      ? `[${displayText.toLowerCase()}]`
                      : displayText;

                      return (
                        <span
                          key={`${line.start}-${rowIdx}-${i}`}
                          style={{
                            fontFamily,
                            fontSize: wordSizePx,
                            fontWeight: isHelper
                              ? Math.max(
                                  400,
                                  subsStyle.font_weight_standard - 200
                                )
                              : isBracketed
                              ? 500
                              : subsStyle.font_weight_standard,
                            letterSpacing: subsStyle.letter_spacing,
                            lineHeight: subsStyle.line_height,
                            color: subsStyle.color_standard_hex,
                            textShadow: standardTextShadow,
                            whiteSpace: "nowrap",
                            opacity: wordPopOpacity,
                            transform: `translateY(${
                              isBracketed ? bracketOffsetPx : 0
                            }px) scale(${wordPopScale})`,
                            transformOrigin: "center",
                            display: "inline-block",
                          }}
                        >
                          {renderText}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            });
          });
        })()
      ) : (
        // HORIZONTAL: flex-row layout used by BRAND and CreatorC.
        // When carrier_lockup is enabled AND the line has a keyword, the
        // non-keyword words render at carrier size on a row above the keyword
        // (CreatorC's "WHEN I WAS" / "KID" lockup).
        (() => {
          const words = activeLine.words;
          const kwIdx = words.findIndex(
            (w) => !!w.isKeyword && subsStyle.keyword.enabled
          );
          const useLockup =
            layout.carrier_lockup.enabled && kwIdx !== -1 && words.length > 1;

          const renderStandardWord = (
            word: StyledCaptionWord,
            i: number,
            opts: {
              sizePx: number;
              weight: number;
              caseStyle: typeof subsStyle.case_standard;
              /** Word-level reveal, used by the cumulative word-by-word path. */
              reveal?: { opacity: number; riseP: number };
            }
          ) => {
            const baseDisplay = caseTransform(word.text, opts.caseStyle);
            const isFlair =
              !!word.isFlair && subsStyle.serif_flair?.enabled;
            const isActive =
              isKaraoke &&
              currentSec >= word.start &&
              currentSec < word.end + 0.05;
            const color = isFlair
              ? subsStyle.serif_flair!.color_hex
              : isActive
              ? subsStyle.keyword.tint_hex
              : subsStyle.color_standard_hex;
            const flairFontFamily = isFlair
              ? `${subsStyle.serif_flair!.font_family}, ${
                  subsStyle.serif_flair!.font_family_fallbacks ??
                  "Georgia, serif"
                }`
              : fontFamily;
            const flairCase = isFlair
              ? subsStyle.serif_flair!.case
              : opts.caseStyle;
            const renderText = isFlair
              ? caseTransform(word.text, flairCase)
              : baseDisplay;
            const flairSize = isFlair
              ? (subsStyle.serif_flair!.font_size_pct_height / 100) * height
              : opts.sizePx;
            const flairWeight = isFlair
              ? subsStyle.serif_flair!.font_weight
              : opts.weight;
            return (
              <span
                key={`${activeLine.start}-${i}`}
                style={{
                  fontFamily: flairFontFamily,
                  fontSize: flairSize,
                  fontWeight: flairWeight,
                  fontStyle:
                    isFlair && subsStyle.serif_flair!.italic
                      ? "italic"
                      : "normal",
                  letterSpacing: subsStyle.letter_spacing,
                  lineHeight: subsStyle.line_height,
                  color,
                  textShadow: standardTextShadow,
                  whiteSpace: "nowrap",
                  ...(opts.reveal
                    ? {
                        opacity: opts.reveal.opacity,
                        transform: `translateY(${opts.reveal.riseP}px)`,
                      }
                    : null),
                }}
              >
                {renderText}
              </span>
            );
          };

          const renderKeyword = (word: StyledCaptionWord, i: number) => {
            const displayText = caseTransform(
              word.text,
              subsStyle.keyword.case
            );
            return (
              <KeywordWord
                key={`${activeLine.start}-${i}`}
                text={displayText}
                word={word}
                spec={subsStyle}
                fps={fps}
                fontFamily={fontFamily}
                fontSize={keywordFontSize}
                frame={frame}
                tintOverride={tintFor(activeIndex, i)}
                videoSrc={videoSrc}
              />
            );
          };

          // Solo-keyword line — render at the keyword lane, no carrier row.
          const isSoloKeywordOnly =
            layout.carrier_lockup.enabled &&
            kwIdx !== -1 &&
            words.length === 1;
          if (isSoloKeywordOnly) {
            const soloY =
              layout.carrier_lockup.single_keyword_y_pct ??
              layout.carrier_lockup.keyword_y_pct ??
              ss.vertical_position_pct_from_top;
            const soloTop = (soloY / 100) * height;
            return (
              <div
                style={{
                  position: "absolute",
                  top: soloTop,
                  left: 0,
                  right: 0,
                  transform: "translateY(-50%)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "baseline",
                  padding: `0 ${(100 - ss.max_width_pct) / 2}%`,
                  opacity: baseOpacity,
                }}
              >
                {renderKeyword(words[0], 0)}
              </div>
            );
          }

          if (useLockup) {
            const carriers = words.filter((_, i) => i !== kwIdx);
            const keyword = words[kwIdx];
            const carrierSize =
              (layout.carrier_lockup.carrier_size_pct_height / 100) * height;

            // Lane-snap positioning. When carrier_y_pct/keyword_y_pct are set,
            // each row is anchored to its own absolute Y — no flex gap, no drift.
            // Falls back to legacy gap-based layout for older presets.
            const useLaneSnap =
              layout.carrier_lockup.carrier_y_pct !== undefined &&
              layout.carrier_lockup.keyword_y_pct !== undefined;

            if (useLaneSnap) {
              const carrierTop =
                (layout.carrier_lockup.carrier_y_pct! / 100) * height;
              const keywordTop =
                (layout.carrier_lockup.keyword_y_pct! / 100) * height;
              const sidePad = (100 - ss.max_width_pct) / 2;
              return (
                <>
                  {/* Carrier row — anchored to its own lane */}
                  {carriers.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: carrierTop,
                        left: 0,
                        right: 0,
                        transform: "translateY(-50%)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "baseline",
                        gap: `0 ${carrierSize * 0.32}px`,
                        padding: `0 ${sidePad}%`,
                        opacity: baseOpacity,
                        flexWrap: "nowrap",
                      }}
                    >
                      {carriers.map((w, i) =>
                        renderStandardWord(w, i, {
                          sizePx: carrierSize,
                          weight: layout.carrier_lockup.carrier_font_weight,
                          caseStyle: layout.carrier_lockup.carrier_case,
                        })
                      )}
                    </div>
                  )}
                  {/* Keyword row — anchored to its own lane (lower-lane by default) */}
                  <div
                    style={{
                      position: "absolute",
                      top: keywordTop,
                      left: 0,
                      right: 0,
                      transform: "translateY(-50%)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "baseline",
                      padding: `0 ${sidePad}%`,
                      opacity: baseOpacity,
                    }}
                  >
                    {renderKeyword(keyword, kwIdx)}
                  </div>
                </>
              );
            }

            // Legacy gap-based fallback for presets without lane snapping.
            return (
              <div
                style={{
                  position: "absolute",
                  top,
                  left: horizontalShiftPx,
                  right: -horizontalShiftPx,
                  transform: "translateY(-50%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: justify,
                  justifyContent: "center",
                  padding: `0 ${(100 - ss.max_width_pct) / 2}%`,
                  opacity: baseOpacity,
                  gap: `${(layout.carrier_lockup.row_gap_pct / 100) *
                    height}px`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "nowrap",
                    gap: `0 ${carrierSize * 0.32}px`,
                    justifyContent: "center",
                    alignItems: "baseline",
                    transform: `scale(${popScale})`,
                    transformOrigin: "center",
                    maxWidth: "100%",
                  }}
                >
                  {carriers.map((w, i) =>
                    renderStandardWord(w, i, {
                      sizePx: carrierSize,
                      weight: layout.carrier_lockup.carrier_font_weight,
                      caseStyle: layout.carrier_lockup.carrier_case,
                    })
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "baseline",
                  }}
                >
                  {renderKeyword(keyword, kwIdx)}
                </div>
              </div>
            );
          }

          // Standard horizontal: all words on one row.
          // RAPID-FIRE: when layout.rapid_fire.enabled and the line has NO
          // keyword, only show the currently-spoken word(s) — they swap as
          // the speaker advances. Banishes static 3-4 word blocks.
          const rapidFire = layout.rapid_fire;
          const noKeywordInLine = kwIdx === -1;
          let renderedWords = words;
          let renderedIndices = words.map((_, i) => i);
          if (
            rapidFire?.enabled &&
            noKeywordInLine &&
            words.length > 0
          ) {
            // Find the most recently-started word (active or just-finished).
            let activeWordIdx = -1;
            for (let i = 0; i < words.length; i++) {
              if (currentSec >= words[i].start - 0.02) {
                activeWordIdx = i;
              } else {
                break;
              }
            }
            if (activeWordIdx === -1) {
              renderedWords = [];
              renderedIndices = [];
            } else {
              const visible = Math.max(1, rapidFire.words_visible);
              const startIdx = Math.max(0, activeWordIdx - visible + 1);
              renderedIndices = [];
              renderedWords = [];
              for (let i = startIdx; i <= activeWordIdx; i++) {
                renderedIndices.push(i);
                renderedWords.push(words[i]);
              }
            }
          }

          return (
            <div
              style={{
                position: "absolute",
                top,
                left: horizontalShiftPx,
                right: -horizontalShiftPx,
                transform: "translateY(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: justify,
                justifyContent: "center",
                padding: `0 ${(100 - subsStyle.max_width_pct) / 2}%`,
                opacity: baseOpacity,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: `0 ${fontSize * 0.28}px`,
                  justifyContent: "center",
                  alignItems: "baseline",
                  transform: `scale(${popScale})`,
                  transformOrigin: "center",
                  maxWidth: "100%",
                }}
              >
                {renderedWords.map((word, j) => {
                  const i = renderedIndices[j];
                  const isKw =
                    !!word.isKeyword && subsStyle.keyword.enabled;
                  if (isKw) return renderKeyword(word, i);
                  return renderStandardWord(word, i, {
                    sizePx: fontSize,
                    weight: subsStyle.font_weight_standard,
                    caseStyle: subsStyle.case_standard,
                    reveal: wordReveal(word),
                  });
                })}
              </div>
            </div>
          );
        })()
      )}
    </AbsoluteFill>
  );
};

interface KeywordWordProps {
  text: string;
  word: StyledCaptionWord;
  spec: SubsSpec;
  fps: number;
  fontFamily: string;
  fontSize: number;
  frame: number;
  /** Per-instance tint override (used by color cycling). Falls back to spec.keyword.tint_hex. */
  tintOverride?: string;
  /** Master video path — required for the clip-path xray render. */
  videoSrc?: string;
}

const KeywordWord: React.FC<KeywordWordProps> = ({
  text,
  word,
  spec,
  fps,
  fontFamily,
  fontSize,
  frame,
  tintOverride,
  videoSrc,
}) => {
  const tint = tintOverride ?? spec.keyword.tint_hex;
  const wordStartFrame = Math.round(word.start * fps);
  const localFrame = frame - wordStartFrame;

  // Springy bounce — overshoots and settles. Mass/stiffness tuned to land
  // around 280ms total with a clear overshoot for "refractive-bounce".
  // A 0ms entrance means the keyword is simply present on its first frame.
  // Guarding here also keeps interpolate() from being handed [0, 0].
  const kwDurationFrames = Math.round(
    (spec.keyword.animation_in_duration_ms / 1000) * fps
  );
  const bounceScale =
    kwDurationFrames <= 0
      ? 1
      : spec.keyword.animation_in === "refractive-bounce"
      ? spring({
          frame: Math.max(0, localFrame),
          fps,
          config: { damping: 9, mass: 0.6, stiffness: 110 },
          durationInFrames: kwDurationFrames,
        })
      : interpolate(localFrame, [0, kwDurationFrames], [0.6, 1], {
          easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const useGlass = spec.keyword.render === "displacement-glass";

  // Build a layered keyword: drop-shadow + tinted body + bright edge stroke,
  // all run through the displacement filter to get the refractive look.
  const baseStyle: React.CSSProperties = {
    fontFamily,
    fontSize,
    fontWeight: spec.keyword.font_weight,
    letterSpacing: spec.letter_spacing,
    lineHeight: spec.line_height,
    whiteSpace: "nowrap",
    transform: `scale(${bounceScale})`,
    transformOrigin: "center",
    display: "inline-block",
    position: "relative",
  };

  if (!useGlass) {
    // Fallback: scale-pop or color-swap — simple, no SVG filter.
    return (
      <span
        style={{
          ...baseStyle,
          color: tint,
          textShadow: spec.keyword.drop_shadow.enabled
            ? `0 ${spec.keyword.drop_shadow.offset_y_px}px ${spec.keyword.drop_shadow.blur_px}px rgba(0,0,0,${spec.keyword.drop_shadow.opacity})`
            : "none",
        }}
      >
        {text}
      </span>
    );
  }

  const xrayEnabled = spec.keyword.xray_enabled === true;

  // Xray path — delegate to the shared <XRayWord /> shader. Wrapper carries
  // the spring-bounce transform; XRayWord handles its own SVG filter, blend
  // modes, and tint layering.
  if (xrayEnabled) {
    return (
      <XRayWord
        text={text}
        fontSize={`${fontSize}px`}
        videoSrc={videoSrc}
        tintColor={tint}
        tintOpacity={Math.max(spec.keyword.tint_opacity, 0.6)}
        fontFamily={fontFamily}
        fontWeight={spec.keyword.font_weight}
        letterSpacing={spec.letter_spacing}
        lineHeight={spec.line_height}
        transform={`scale(${bounceScale})`}
      />
    );
  }

  // Legacy displacement-glass path (no xray). Kept for styles that opt out of
  // the new shader but still want the refractive tint + bevel stack.
  return (
    <span style={{ ...baseStyle, isolation: "isolate" }}>
      {/* Drop shadow layer */}
      {spec.keyword.drop_shadow.enabled && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            color: "transparent",
            textShadow: `0 ${spec.keyword.drop_shadow.offset_y_px}px ${spec.keyword.drop_shadow.blur_px}px rgba(0,0,0,${spec.keyword.drop_shadow.opacity})`,
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}

      <span
        style={{
          position: "relative",
          color: "#FFFFFF",
          filter: `url(#${FILTER_ID})`,
          zIndex: 1,
        }}
      >
        {text}
      </span>

      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          color: tint,
          opacity: spec.keyword.tint_opacity,
          filter: `url(#${FILTER_ID})`,
          mixBlendMode: "screen",
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {text}
      </span>

      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          color: "transparent",
          WebkitTextStroke: `1.2px ${spec.keyword.edge_specular_hex}`,
          opacity: spec.keyword.bevel_alpha,
          filter: `url(#${FILTER_ID})`,
          zIndex: 3,
          pointerEvents: "none",
        }}
      >
        {text}
      </span>
    </span>
  );
};
