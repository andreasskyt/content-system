import React, { useId } from "react";
import { OffthreadVideo, staticFile } from "remotion";

/**
 * X-Ray keyword shader using SVG clipPath over a duplicated, frame-synced copy
 * of the master video. The duplicated <OffthreadVideo> is filtered with
 * `invert(1) hue-rotate(180deg)` and clipped to the keyword's letterform shape,
 * sidestepping any blend-mode quirks during headless Chrome compilation.
 *
 * The duplicated video lives INSIDE the keyword wrapper (per spec), so each
 * keyword displays a wrapper-fitted snapshot of the current frame inverted and
 * clipped to its text shape — a "video-inside-text" reveal rather than a
 * pixel-perfect x-ray of whatever sits behind the glyph in the master frame.
 */
export interface XRayWordProps {
  text: string;
  /** Any valid CSS font-size string (e.g. "8.2vh", "120px"). */
  fontSize: string;
  /**
   * Path to the master video (relative to Remotion's `public/` static dir, the
   * same input as the parent <OffthreadVideo>). When omitted, falls back to a
   * flat tinted text render so the component is still usable for previews.
   */
  videoSrc?: string;
  /** Semantic color overlay (impact yellow, warning red…). Falls back to white. */
  tintColor?: string;
  /** 0–1 opacity of the tint screen layer. */
  tintOpacity?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  letterSpacing?: string;
  lineHeight?: number | string;
  /** Extra transform (e.g. spring-bounce scale) applied to the wrapper. */
  transform?: string;
}

const DEFAULT_TINT_OPACITY = 0.35;

export const XRayWord: React.FC<XRayWordProps> = ({
  text,
  fontSize,
  videoSrc,
  tintColor,
  tintOpacity = DEFAULT_TINT_OPACITY,
  fontFamily,
  fontWeight,
  letterSpacing,
  lineHeight,
  transform,
}) => {
  const reactId = useId();
  const clipId = `xray-clip-${reactId.replace(/:/g, "")}`;

  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    lineHeight,
    whiteSpace: "nowrap",
    isolation: "isolate",
    transform,
    transformOrigin: "center",
    filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
  };

  if (!videoSrc) {
    return (
      <span style={{ ...wrapperStyle, color: tintColor ?? "#FFFFFF" }}>
        {text}
      </span>
    );
  }

  const tintLayer =
    tintColor && tintOpacity > 0 ? (
      <span
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          color: tintColor,
          opacity: tintOpacity,
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        {text}
      </span>
    ) : null;

  return (
    <span style={wrapperStyle}>
      {/* Invisible spacer reserves the wrapper's bounding box for layout. */}
      <span aria-hidden style={{ visibility: "hidden" }}>
        {text}
      </span>

      {/* SVG defines the text-shaped clipPath and hosts the inverted video via
          <foreignObject>. clipPathUnits default (userSpaceOnUse) lets the
          glyph metrics match the wrapper's font sizing exactly. */}
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <text
              x="0"
              y="0.82em"
              fontSize={fontSize}
              fontFamily={fontFamily}
              fontWeight={fontWeight}
              letterSpacing={letterSpacing}
            >
              {text}
            </text>
          </clipPath>
        </defs>
        <foreignObject
          x="0"
          y="0"
          width="100%"
          height="100%"
          clipPath={`url(#${clipId})`}
        >
          <div style={{ width: "100%", height: "100%" }}>
            <OffthreadVideo
              src={staticFile(videoSrc)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: "invert(1) hue-rotate(180deg)",
              }}
            />
          </div>
        </foreignObject>
      </svg>

      {tintLayer}
    </span>
  );
};

export default XRayWord;
