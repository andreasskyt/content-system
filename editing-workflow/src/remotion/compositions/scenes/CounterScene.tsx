import { AbsoluteFill } from "remotion";
import { AnimatedText, AnimatedCounter, useViewportRect } from "remotion-bits";

interface Props {
  headline?: string;
  number?: string;
  numberPrefix?: string;
  numberPostfix?: string;
  bgColor: string;
  fps: number;
}

export const CounterScene: React.FC<Props> = ({
  headline,
  number,
  numberPrefix,
  numberPostfix,
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";
  const accentColor = isDark ? "#BCAC8B" : "#303b2f";
  const labelColor = "#BCAC8B";

  const targetNum = parseFloat((number ?? "0").replace(/[^0-9.]/g, ""));

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: rect.vmin * 3,
      }}
    >
      {headline && (
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 4,
            opacity: [0, 1],
            y: [rect.vmin * 4, 0],
            duration: 18,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 4,
            fontWeight: 500,
            color: labelColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            textAlign: "center",
            display: "block",
            width: "100%",
          }}
        >
          {headline}
        </AnimatedText>
      )}

      <div
        style={{
          color: textColor,
          fontFamily: "Poppins, system-ui, sans-serif",
          fontWeight: 700,
          fontSize: rect.vmin * 14,
          textAlign: "center",
        }}
      >
        <AnimatedCounter
          transition={{
            values: [0, targetNum],
            duration: Math.round(fps * 1.5),
            delay: Math.round(fps * 0.3),
            easing: "easeOutCubic",
          }}
          prefix={
            numberPrefix ? (
              <span style={{ color: accentColor }}>{numberPrefix}</span>
            ) : undefined
          }
          postfix={
            numberPostfix ? (
              <span
                style={{
                  fontSize: rect.vmin * 5,
                  opacity: 0.5,
                  fontWeight: 400,
                }}
              >
                {numberPostfix}
              </span>
            ) : undefined
          }
        />
      </div>
    </AbsoluteFill>
  );
};
