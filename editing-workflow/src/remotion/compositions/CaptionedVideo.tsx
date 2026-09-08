import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { CaptionsOverlay } from "./CaptionsOverlay";

interface CaptionWord {
  text: string;
  start: number;
  end: number;
}

interface CaptionLine {
  words: CaptionWord[];
  start: number;
  end: number;
}

export interface CaptionedVideoProps {
  videoSrc?: string;
  lines?: CaptionLine[];
  durationFrames?: number;
  widthOverride?: number;
  heightOverride?: number;
}

export const CaptionedVideo: React.FC<CaptionedVideoProps> = ({
  videoSrc,
  lines = [],
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {videoSrc && (
        <OffthreadVideo
          src={staticFile(videoSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      <CaptionsOverlay lines={lines} />
    </AbsoluteFill>
  );
};
