import { AbsoluteFill } from "remotion";
import { AnimatedText, useViewportRect } from "remotion-bits";

interface Props {
  headline?: string;
  subtext?: string;
  bgColor: string;
  fps: number;
}

export const StatementScene: React.FC<Props> = ({
  headline,
  subtext,
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";
  const subtextColor = "#BCAC8B";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: rect.vmin * 4,
        padding: `0 ${rect.vw * 8}px`,
      }}
    >
      {headline && (
        <AnimatedText
          transition={{
            split: "character",
            splitStagger: 1,
            opacity: [0, 1],
            scale: [0.6, 1],
            duration: 18,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 7,
            fontWeight: 700,
            color: textColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            textAlign: "center",
            lineHeight: 1.2,
            display: "block",
            width: "100%",
          }}
        >
          {headline}
        </AnimatedText>
      )}

      {subtext && (
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 5,
            opacity: [0, 1],
            y: [rect.vmin * 3, 0],
            duration: 20,
            delay: 20,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 4,
            fontWeight: 400,
            color: subtextColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            textAlign: "center",
            display: "block",
            width: "100%",
          }}
        >
          {subtext}
        </AnimatedText>
      )}
    </AbsoluteFill>
  );
};
