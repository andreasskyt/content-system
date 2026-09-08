import React from "react";
import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { StyledCaptions, type StyledCaptionLine } from "./StyledCaptions";
import type {
  CanvasSpec,
  FramingSpec,
  SubsSpec,
} from "../../styles/types";

export interface StyledCaptionedVideoProps {
  videoSrc?: string;
  lines?: StyledCaptionLine[];
  subsStyle?: SubsSpec;
  canvasStyle?: CanvasSpec;
  framingStyle?: FramingSpec;
  durationFrames?: number;
  widthOverride?: number;
  heightOverride?: number;
}

const DEFAULT_CANVAS: CanvasSpec = { mode: "fullscreen" };

function parseAspect(aspect: string): number {
  const [w, h] = aspect.split(":").map(Number);
  if (!w || !h) return 1;
  return w / h;
}

/**
 * Returns a 0..1 progress value indicating "how punched are we right now".
 * Punches around each keyword with a fast attack (~80ms ramp up) and a
 * slightly slower release (~140ms ramp down). Triggered by `keyword` triggers
 * — `topic-change` would need scene-change detection so we treat it the same
 * as keyword for now.
 */
function keywordPunchProgress(
  currentSec: number,
  lines: StyledCaptionLine[]
): number {
  // Find any keyword whose window contains currentSec (with small attack/release wings)
  const ATTACK_SEC = 0.08;
  const HOLD_TAIL_SEC = 0.05; // hold for a beat after the word ends
  const RELEASE_SEC = 0.14;

  let best = 0;
  for (const line of lines) {
    for (const word of line.words) {
      if (!word.isKeyword) continue;
      const t = currentSec;
      const ramp = (() => {
        if (t < word.start - ATTACK_SEC) return 0;
        if (t < word.start) {
          // ramp up
          return (t - (word.start - ATTACK_SEC)) / ATTACK_SEC;
        }
        if (t <= word.end + HOLD_TAIL_SEC) return 1;
        if (t < word.end + HOLD_TAIL_SEC + RELEASE_SEC) {
          return 1 - (t - (word.end + HOLD_TAIL_SEC)) / RELEASE_SEC;
        }
        return 0;
      })();
      if (ramp > best) best = ramp;
    }
  }
  return best;
}

export const StyledCaptionedVideo: React.FC<StyledCaptionedVideoProps> = ({
  videoSrc,
  lines = [],
  subsStyle,
  canvasStyle = DEFAULT_CANVAS,
  framingStyle,
}) => {
  const { width, height, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentSec = frame / fps;

  const bgColor = canvasStyle.background_hex ?? "#000000";

  // Zoom punch on keyword (and topic-change, treated same for now). Reads from
  // style.framing — interpolates from 1 → punchScale at attack, holds, releases.
  const zoom = framingStyle?.zoom_punches;
  const wantsKeywordPunch =
    !!zoom &&
    zoom.enabled &&
    (zoom.trigger === "keyword" || zoom.trigger === "topic-change");
  const punchProgress = wantsKeywordPunch
    ? keywordPunchProgress(currentSec, lines)
    : 0;
  const punchScale = wantsKeywordPunch
    ? interpolate(punchProgress, [0, 1], [1, zoom!.scale], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1;

  // Fullscreen: video fills the canvas, no framing.
  if (canvasStyle.mode === "fullscreen" || !canvasStyle.frame) {
    return (
      <AbsoluteFill style={{ backgroundColor: bgColor }}>
        {videoSrc && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              transform: `scale(${punchScale})`,
              transformOrigin: "center",
            }}
          >
            <OffthreadVideo
              src={staticFile(videoSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
        <StyledCaptions lines={lines} subsStyle={subsStyle} videoSrc={videoSrc} />
      </AbsoluteFill>
    );
  }

  // Framed: video is masked into a centered squarcle floating on the canvas bg.
  const frameSpec = canvasStyle.frame;
  const frameWidth = (frameSpec.width_pct / 100) * width;
  const aspect = parseAspect(frameSpec.aspect_ratio);
  const frameHeight = frameWidth / aspect;
  const borderRadius =
    (frameSpec.border_radius_pct_of_frame_width / 100) * frameWidth;

  let topPx = (height - frameHeight) / 2;
  if (frameSpec.vertical_alignment === "top") topPx = 0;
  if (frameSpec.vertical_alignment === "bottom")
    topPx = height - frameHeight;

  const leftPx = (width - frameWidth) / 2;

  const dropShadow = frameSpec.drop_shadow
    ? `0 ${frameSpec.drop_shadow.offset_y_px}px ${frameSpec.drop_shadow.blur_px}px rgba(0,0,0,${frameSpec.drop_shadow.opacity})`
    : undefined;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {videoSrc && (
        <div
          style={{
            position: "absolute",
            top: topPx,
            left: leftPx,
            width: frameWidth,
            height: frameHeight,
            borderRadius,
            overflow: "hidden",
            filter: dropShadow ? `drop-shadow(${dropShadow})` : undefined,
            backgroundColor: "#000",
          }}
        >
          {/* Inner scale: only the video content punches; the squarcle frame
              (border, drop shadow) stays locked. */}
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${punchScale})`,
              transformOrigin: "center",
            }}
          >
            <OffthreadVideo
              src={staticFile(videoSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      )}
      <StyledCaptions lines={lines} subsStyle={subsStyle} videoSrc={videoSrc} />
    </AbsoluteFill>
  );
};
