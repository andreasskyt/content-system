import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

import type { SubsSpec } from "../../styles/types";
import type {
  StyledCaptionLine,
  StyledCaptionWord,
} from "../compositions/StyledCaptions";

/**
 * X-Ray / Difference-Blend subtitle renderer.
 *
 * Handles the composition of TWO orthogonal components:
 *   • text_treatment: "xray-difference" — white text + mix-blend-mode
 *   • layout.word_arrangement: "stacked-anchor" — words pinned at one anchor
 *
 * This component is the only path that knows how to render xray-difference
 * today. The classic StyledCaptions handles every other treatment. If a
 * style picks xray-difference paired with a non-stacked layout, this
 * component falls back to stacked-anchor (the only thing it implements);
 * teaching it new layouts is a future task.
 *
 * Every word renders as pure white text composited with
 * `mix-blend-mode: difference`. The blend math is `|255 − bg| = 255 − bg`,
 * so the glyph pixels show the channel-by-channel negative of whatever
 * video sits behind them. Active vs inactive is carried by plain `opacity`
 * on the span (NOT a filter chain — see anti-pattern note below).
 *
 * Anti-pattern (do not re-introduce): wrapping the span in a `filter`
 * chain like `invert(100%)` first inverts the white glyph to black in
 * the layer buffer, then `difference` against the video evaluates as
 * `|0 − bg| = bg` — the text ends up either invisible (clean blend) or
 * solid black (when stacking context isolates the blend). Either way
 * the inversion effect collapses. Keep this renderer filter-free.
 *
 * `color_standard_hex` MUST be "#FFFFFF" for the inversion math to be
 * exact. The XRAY_DIFFERENCE_TREATMENT component in src/styles/components/
 * pins that constraint. Blend mode and inactive opacity are tuneable via
 * `subsStyle.xray_difference`.
 */

const DEFAULT_INACTIVE_OPACITY = 0.3;
const DEFAULT_BLEND_MODE: NonNullable<React.CSSProperties["mixBlendMode"]> =
  "difference";
const OPACITY_TRANSITION = "opacity 0.04s ease-in-out";
const TAIL_HOLD_SEC = 0.15;
// In hold-until-next mode the last word has no successor to hand off to — cap
// how long it lingers after it's spoken so it doesn't hang on screen forever.
const LAST_WORD_HOLD_SEC = 1.2;

function caseTransform(text: string, c: SubsSpec["case_standard"]): string {
  if (c === "lower") return text.toLowerCase();
  if (c === "upper") return text.toUpperCase();
  return text;
}

function isWordActive(word: StyledCaptionWord, currentSec: number): boolean {
  return currentSec >= word.start && currentSec <= word.end;
}

export interface XRayInvertCaptionsProps {
  lines: StyledCaptionLine[];
  subsStyle: SubsSpec;
}

export const XRayInvertCaptions: React.FC<XRayInvertCaptionsProps> = ({
  lines,
  subsStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const currentSec = frame / fps;

  const cfg = subsStyle.xray_difference ?? {};
  const holdUntilNext = cfg.hold_until_next === true;

  // Pick the line on screen now. Two modes:
  //  • default strobe: the line whose own [start, end] window contains now.
  //  • hold-until-next: the LAST line that has started — it stays up until the
  //    next line starts (lines are emitted in ascending start order), so there
  //    are no blank gaps between fast-spoken words. `forceActive` then keeps
  //    that word at full opacity across the whole hold span.
  let activeLine: StyledCaptionLine | undefined;
  let forceActive = false;
  if (holdUntilNext) {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentSec >= lines[i].start - 0.05) idx = i;
      else break;
    }
    if (idx >= 0) {
      const candidate = lines[idx];
      const isLast = idx === lines.length - 1;
      // Every word but the last hands off to its successor; the last one is
      // capped so it doesn't linger past LAST_WORD_HOLD_SEC after it's spoken.
      if (!isLast || currentSec <= candidate.end + LAST_WORD_HOLD_SEC) {
        activeLine = candidate;
        forceActive = true;
      }
    }
  } else {
    activeLine = lines.find(
      (l) => currentSec >= l.start - 0.05 && currentSec <= l.end + TAIL_HOLD_SEC
    );
  }
  if (!activeLine) return null;
  const inactiveOpacity = cfg.inactive_opacity ?? DEFAULT_INACTIVE_OPACITY;
  const blendMode = cfg.blend_mode ?? DEFAULT_BLEND_MODE;

  const fontFamily = `${subsStyle.font_family}, ${
    subsStyle.font_family_fallbacks ?? "system-ui, sans-serif"
  }`;
  const fontSize = (subsStyle.font_size_pct_height / 100) * height;
  const top = (subsStyle.vertical_position_pct_from_top / 100) * height;
  const maxWidth = (subsStyle.max_width_pct / 100) * width;

  const justify =
    subsStyle.horizontal_alignment === "left"
      ? "flex-start"
      : subsStyle.horizontal_alignment === "right"
      ? "flex-end"
      : "center";

  // Approximate the caption block's half-height so vertical_position_pct_from_top
  // anchors the visual center of a single line. We can't use translateY(-50%)
  // here — see the no-stacking-context rule on the wrapper below.
  const lineCenterOffset = (fontSize * subsStyle.line_height) / 2;
  const topAnchored = top - lineCenterOffset;

  // Each word renders as its own absolutely-positioned layer pinned to the
  // same anchor point. They stack on top of each other instead of flowing
  // horizontally as a sentence — that way the active word never shifts
  // left/right as the spoken word advances. Inactive words sit at
  // `inactive_opacity` (0 in the strict preset) at the exact same coords.
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/*
        DO NOT add transform / filter / opacity < 1 / isolation / will-change
        on this wrapper or any ancestor of the word spans. Any of those
        creates a new stacking context, which traps the spans' mix-blend-mode
        and prevents it from blending against the video underneath — the
        whole x-ray effect collapses to a flat post-filter color.
      */}
      {activeLine.words.map((word, i) => {
        const active = forceActive || isWordActive(word, currentSec);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: topAnchored,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: justify,
            }}
          >
            <span
              style={{
                display: "inline-block",
                maxWidth,
                fontFamily,
                fontSize,
                fontWeight: subsStyle.font_weight_standard,
                letterSpacing: subsStyle.letter_spacing,
                lineHeight: subsStyle.line_height,
                color: subsStyle.color_standard_hex,
                textAlign: subsStyle.horizontal_alignment,
                mixBlendMode: blendMode,
                opacity: active ? 1 : inactiveOpacity,
                transition: OPACITY_TRANSITION,
                textShadow: "none",
                background: "transparent",
                WebkitTextStroke: "0",
                border: 0,
                outline: 0,
              }}
            >
              {caseTransform(word.text, subsStyle.case_standard)}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export default XRayInvertCaptions;
