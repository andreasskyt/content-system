import React from "react";
import { useCurrentFrame, useVideoConfig, AbsoluteFill } from "remotion";

interface CaptionWord {
  text: string;
  start: number; // seconds in edit timeline
  end: number;
}

interface CaptionLine {
  words: CaptionWord[];
  start: number;
  end: number;
}

export interface CaptionsOverlayProps {
  lines?: CaptionLine[];
  durationFrames?: number;
  widthOverride?: number;
  heightOverride?: number;
}

const ACTIVE_COLOR = "#BCAC8B";
const INACTIVE_COLOR = "#FFFFFF";
const FADE_FRAMES = 6;

export const CaptionsOverlay: React.FC<CaptionsOverlayProps> = ({ lines = [] }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const currentSec = frame / fps;

  const fontSize = Math.round(height * 0.038);
  const bottomMargin = Math.round(height * 0.12);

  // Find active line
  const activeLine = lines.find(
    (line) => currentSec >= line.start - 0.1 && currentSec <= line.end + 0.3
  );

  if (!activeLine) return null;

  // Fade in/out
  const lineStartFrame = Math.round(activeLine.start * fps);
  const lineEndFrame = Math.round((activeLine.end + 0.3) * fps);
  const fadeIn = Math.min(1, (frame - lineStartFrame + FADE_FRAMES) / FADE_FRAMES);
  const fadeOut = Math.min(1, (lineEndFrame - frame) / FADE_FRAMES);
  const opacity = Math.max(0, Math.min(fadeIn, fadeOut));

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: bottomMargin,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          whiteSpace: "nowrap",
          justifyContent: "center",
          gap: `0 ${fontSize * 0.35}px`,
          maxWidth: "95%",
          opacity,
        }}
      >
        {activeLine.words.map((word, i) => {
          const isActive =
            currentSec >= word.start && currentSec < word.end + 0.05;
          const isPast = currentSec >= word.end + 0.05;

          return (
            <span
              key={`${activeLine.start}-${i}`}
              style={{
                fontFamily: "Poppins, system-ui, sans-serif",
                fontSize,
                fontWeight: 700,
                color: isActive ? ACTIVE_COLOR : isPast ? INACTIVE_COLOR : INACTIVE_COLOR,
                textShadow: `0 0 ${fontSize * 0.15}px rgba(0,0,0,0.8), 0 ${fontSize * 0.04}px ${fontSize * 0.08}px rgba(0,0,0,0.6)`,
                transform: isActive ? "scale(1.08)" : "scale(1)",
                transition: "none",
                lineHeight: 1.3,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
