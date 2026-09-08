import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { AnimatedText, StaggeredMotion, useViewportRect } from "remotion-bits";

interface Props {
  staggerItems?: string[];
  staggerStyle?: "fracture" | "grid-stagger" | "mosaic" | "list-reveal" | "card-stack-3d";
  headline?: string;
  bgColor: string;
  fps: number;
}

export const StaggeredScene: React.FC<Props> = ({
  staggerItems = [],
  staggerStyle = "grid-stagger",
  headline,
  bgColor,
  fps,
}) => {
  const frame = useCurrentFrame();
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";
  const items = staggerItems.length > 0 ? staggerItems : ["Item 1", "Item 2", "Item 3", "Item 4"];

  const headlineEl = headline && (
    <AnimatedText
      transition={{ split: "word", splitStagger: 4, opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, easing: "easeOutCubic" }}
      style={{ fontSize: rect.vmin * 3, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", display: "block", width: "100%", marginBottom: rect.vmin * 2 }}
    >
      {headline}
    </AnimatedText>
  );

  const transparentBg = isDark ? "rgba(48,59,47,0.4)" : "rgba(48,59,47,0.15)";
  const opaqueBg = isDark ? "#303b2f" : "#e8e5df";

  const itemStyle: React.CSSProperties = {
    backgroundColor: staggerStyle === "card-stack-3d" ? opaqueBg : transparentBg,
    border: "1px solid rgba(188,172,139,0.3)",
    borderRadius: rect.vmin * 1.5,
    padding: `${rect.vmin * 2}px ${rect.vmin * 2}px`,
    textAlign: "center",
    fontSize: rect.vmin * 2.8,
    fontWeight: 600,
    color: textColor,
    fontFamily: "Poppins, system-ui, sans-serif",
  };

  // ── Fracture Reassemble: items scatter then converge ───────────────────────
  if (staggerStyle === "fracture") {
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
        {headlineEl}
        <StaggeredMotion
          transition={{ stagger: 4, staggerDirection: "random", opacity: [0, 1], scale: [0.3, 1], x: [-80, 0], y: [-60, 0], rotate: [-15, 0], duration: 20, delay: 8, easing: "easeOutCubic" }}
          style={{ display: "flex", flexWrap: "wrap", gap: rect.vmin * 2, justifyContent: "center", maxWidth: rect.width * 0.8 }}
        >
          {items.map((item) => <div key={item} style={itemStyle}>{item}</div>)}
        </StaggeredMotion>
      </AbsoluteFill>
    );
  }

  // ── Grid Stagger: items appear in a grid from center ───────────────────────
  if (staggerStyle === "grid-stagger") {
    const baseCols = items.length <= 4 ? 2 : items.length <= 6 ? 3 : 4;
    // If odd item count slips through, fall back to single column
    const cols = items.length % baseCols !== 0 ? 1 : baseCols;
    const itemWidth = cols === 1 ? "80%" : `calc((100% - ${(cols - 1) * rect.vmin * 2}px) / ${cols})`;
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
        {headlineEl}
        <StaggeredMotion
          transition={{ stagger: 4, staggerDirection: "center", opacity: [0, 1], scale: [0.5, 1], y: [30, 0], duration: 15, delay: 10, easing: "easeOutCubic" }}
          style={{ display: "flex", flexWrap: "wrap", gap: rect.vmin * 2, justifyContent: "center", maxWidth: rect.width * 0.8 }}
        >
          {items.map((item) => <div key={item} style={{ ...itemStyle, width: itemWidth, boxSizing: "border-box" }}>{item}</div>)}
        </StaggeredMotion>
      </AbsoluteFill>
    );
  }

  // ── Mosaic: tiles revealing in a pattern ────────────────────────────────────
  if (staggerStyle === "mosaic") {
    const cols = Math.ceil(Math.sqrt(items.length));
    const tileSize = `${Math.floor((rect.width * 0.75 - (cols - 1) * rect.vmin) / cols)}px`;
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
        {headlineEl}
        <StaggeredMotion
          transition={{ stagger: 3, staggerDirection: "forward", opacity: [0, 1], scale: [0, 1], blur: [4, 0], duration: 12, delay: 8, easing: "easeOutCubic" }}
          style={{ display: "flex", flexWrap: "wrap", gap: rect.vmin * 1, justifyContent: "center", maxWidth: rect.width * 0.75 }}
        >
          {items.map((item) => (
            <div key={item} style={{ ...itemStyle, width: tileSize, height: tileSize, display: "flex", alignItems: "center", justifyContent: "center" }}>{item}</div>
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
    );
  }

  // ── List Reveal: items slide in from left one by one ───────────────────────
  if (staggerStyle === "list-reveal") {
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
        {headlineEl}
        <StaggeredMotion
          transition={{ stagger: 8, staggerDirection: "forward", opacity: [0, 1], x: [-(rect.vmin * 8), 0], duration: 15, delay: 8, easing: "easeOutCubic" }}
          style={{ display: "flex", flexDirection: "column", gap: rect.vmin * 1.5, maxWidth: rect.width * 0.7 }}
        >
          {items.map((item, i) => (
            <div key={item} style={{ ...itemStyle, display: "flex", alignItems: "center", gap: rect.vmin * 1.5, textAlign: "left", padding: `${rect.vmin * 1.5}px ${rect.vmin * 2.5}px` }}>
              <span style={{ color: "#BCAC8B", fontSize: rect.vmin * 2.5, fontWeight: 700 }}>✓</span>
              {item}
            </div>
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
    );
  }

  // ── Card Stack 3D: cards stacking with perspective depth ───────────────────
  if (staggerStyle === "card-stack-3d") {
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3 }}>
        {headlineEl}
        <div style={{ perspective: 800, position: "relative", width: rect.vmin * 30, height: rect.vmin * 20 }}>
          {items.map((item, i) => {
            const delay = i * 8;
            const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 80 } });
            return (
              <div
                key={item}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: rect.vmin * 25,
                  height: rect.vmin * 14,
                  marginLeft: -(rect.vmin * 12.5),
                  marginTop: -(rect.vmin * 7) + i * rect.vmin * 2,
                  transform: `translateZ(${-i * 50}px) rotateX(${5 * (1 - s)}deg) scale(${0.5 + s * 0.5})`,
                  opacity: s,
                  ...itemStyle,
                  fontSize: rect.vmin * 3.5,
                  zIndex: items.length - i,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  return <AbsoluteFill />;
};
