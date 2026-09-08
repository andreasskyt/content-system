import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { AnimatedText, useViewportRect } from "remotion-bits";

interface Props {
  carouselItems?: string[];
  headline?: string;
  bgColor: string;
  fps: number;
}

export const Carousel3DScene: React.FC<Props> = ({
  carouselItems = [],
  headline,
  bgColor,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";

  const items = carouselItems.length > 0 ? carouselItems : ["Item 1", "Item 2", "Item 3"];
  const radius = rect.vmin * 20;
  const cardW = rect.vmin * 20;
  const cardH = rect.vmin * 12;

  const rotation = interpolate(frame, [0, durationInFrames], [0, 200]);
  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.5)], [0, 1], { extrapolateRight: "clamp" });

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
            y: [rect.vmin * 2, 0],
            duration: 12,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 3,
            fontWeight: 500,
            color: "#BCAC8B",
            fontFamily: "Poppins, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
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
          perspective: 1200,
          width: radius * 2.5,
          height: cardH * 1.6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            position: "relative",
            width: radius * 2,
            height: cardH,
            transformStyle: "preserve-3d",
            transform: `rotateX(18deg) rotateY(${rotation}deg)`,
          }}
        >
          {items.map((item, i) => {
            const angle = (i / items.length) * 360;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: 0,
                  width: cardW,
                  height: cardH,
                  marginLeft: -cardW / 2,
                  transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                  backfaceVisibility: "hidden",
                  backgroundColor: isDark ? "rgba(48,59,47,0.5)" : "rgba(48,59,47,0.15)",
                  border: "1px solid rgba(188,172,139,0.35)",
                  borderRadius: rect.vmin * 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: rect.vmin * 3.5,
                  fontWeight: 700,
                  color: textColor,
                  fontFamily: "Poppins, system-ui, sans-serif",
                  textAlign: "center",
                  padding: `0 ${rect.vmin * 1.5}px`,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
