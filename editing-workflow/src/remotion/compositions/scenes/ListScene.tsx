import { AbsoluteFill } from "remotion";
import { AnimatedText, StaggeredMotion, useViewportRect } from "remotion-bits";

interface Props {
  headline?: string;
  listItems?: string[];
  bgColor: string;
  fps: number;
}

export const ListScene: React.FC<Props> = ({
  headline,
  listItems,
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";
  const accentColor = "#BCAC8B";
  const checkColor = accentColor;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${rect.vw * 10}px`,
        gap: rect.vmin * 4,
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
            fontSize: rect.vmin * 4,
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

      {listItems && (
        <StaggeredMotion
          transition={{
            stagger: Math.round(fps * 0.3),
            opacity: [0, 1],
            x: [-rect.vmin * 5, 0],
            duration: Math.round(fps * 0.4),
            delay: Math.round(fps * 0.5),
            easing: "easeOutCubic",
          }}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: rect.vmin * 3,
            width: "100%",
          }}
        >
          {listItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: rect.vmin * 2,
                fontSize: rect.vmin * 4.5,
                fontWeight: 600,
                color: textColor,
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              <span style={{ color: checkColor, fontSize: rect.vmin * 3.5 }}>
                ✓
              </span>
              {item}
            </div>
          ))}
        </StaggeredMotion>
      )}
    </AbsoluteFill>
  );
};
