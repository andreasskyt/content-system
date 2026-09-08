import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedText, AnimatedCounter, useViewportRect } from "remotion-bits";

interface Props {
  headline?: string;
  beforeValue?: string;
  afterValue?: string;
  bgColor: string;
  fps: number;
}

export const ComparisonScene: React.FC<Props> = ({
  headline,
  beforeValue,
  afterValue,
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";
  const mutedColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(48,59,47,0.4)";
  const accentColor = "#BCAC8B";

  const beforeRaw = (beforeValue ?? "0").replace(/[^0-9.]/g, "");
  const afterRaw = (afterValue ?? "0").replace(/[^0-9.]/g, "");
  const beforeNum = parseFloat(beforeRaw);
  const afterNum = parseFloat(afterRaw);
  const beforeIsNumeric = beforeRaw !== "" && !isNaN(beforeNum);
  const afterIsNumeric = afterRaw !== "" && !isNaN(afterNum);
  const beforeSuffixRaw = beforeIsNumeric ? (beforeValue ?? "").replace(/[0-9.,]/g, "").trim() : "";
  const afterSuffixRaw = afterIsNumeric ? (afterValue ?? "").replace(/[0-9.,]/g, "").trim() : "";
  const beforeSuffix = beforeSuffixRaw ? ` ${beforeSuffixRaw}` : "";
  const afterSuffix = afterSuffixRaw ? ` ${afterSuffixRaw}` : "";

  // Arrow animation
  const arrowDelay = Math.round(fps * 1.2);
  const arrowProgress = Math.min(1, Math.max(0, (frame - arrowDelay) / (fps * 0.4)));

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: rect.vmin * 2,
      }}
    >
      {headline && (
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 4,
            opacity: [0, 1],
            y: [rect.vmin * 3, 0],
            duration: 15,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 3.5,
            fontWeight: 500,
            color: accentColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textAlign: "center",
            display: "block",
            width: "100%",
            marginBottom: rect.vmin * 2,
          }}
        >
          {headline}
        </AnimatedText>
      )}

      {/* Before */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: rect.vmin * 2.5,
            fontWeight: 400,
            color: mutedColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: rect.vmin * 1,
          }}
        >
          Before
        </div>
        <div
          style={{
            fontSize: rect.vmin * 10,
            fontWeight: 700,
            color: mutedColor,
            fontFamily: "Poppins, system-ui, sans-serif",
          }}
        >
          {beforeIsNumeric ? (
            <AnimatedCounter
              transition={{
                values: [0, beforeNum],
                duration: Math.round(fps * 1.0),
                delay: Math.round(fps * 0.2),
                easing: "easeOutCubic",
              }}
              postfix={beforeSuffix ? <span>{beforeSuffix}</span> : undefined}
            />
          ) : (
            <AnimatedText
              transition={{
                split: "word",
                splitStagger: 3,
                opacity: [0, 1],
                y: [rect.vmin * 2, 0],
                duration: Math.round(fps * 0.8),
                delay: Math.round(fps * 0.2),
                easing: "easeOutCubic",
              }}
            >
              {beforeValue ?? ""}
            </AnimatedText>
          )}
        </div>
      </div>

      {/* Arrow */}
      <div
        style={{
          fontSize: rect.vmin * 5,
          color: accentColor,
          opacity: arrowProgress,
          transform: `translateY(${(1 - arrowProgress) * 20}px)`,
        }}
      >
        ↓
      </div>

      {/* After */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: rect.vmin * 2.5,
            fontWeight: 400,
            color: accentColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: rect.vmin * 1,
          }}
        >
          After
        </div>
        <div
          style={{
            fontSize: rect.vmin * 12,
            fontWeight: 700,
            color: textColor,
            fontFamily: "Poppins, system-ui, sans-serif",
          }}
        >
          {afterIsNumeric ? (
            <AnimatedCounter
              transition={{
                values: [0, afterNum],
                duration: Math.round(fps * 1.2),
                delay: Math.round(fps * 1.5),
                easing: "easeOutCubic",
              }}
              postfix={afterSuffix ? <span>{afterSuffix}</span> : undefined}
            />
          ) : (
            <AnimatedText
              transition={{
                split: "word",
                splitStagger: 3,
                opacity: [0, 1],
                y: [rect.vmin * 2, 0],
                duration: Math.round(fps * 1.0),
                delay: Math.round(fps * 1.5),
                easing: "easeOutCubic",
              }}
            >
              {afterValue ?? ""}
            </AnimatedText>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
