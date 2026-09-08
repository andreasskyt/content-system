import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { AnimatedText, useViewportRect } from "remotion-bits";

interface Props {
  sceneItems?: string[];
  sceneStyle?: "carousel" | "card-stack" | "cube" | "orbit" | "flyover" | "terminal" | "elements";
  headline?: string;
  bgColor: string;
  fps: number;
}

export const Scene3DScene: React.FC<Props> = ({
  sceneItems = [],
  sceneStyle = "carousel",
  headline,
  bgColor,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";
  const items = sceneItems.length > 0 ? sceneItems : ["Item 1", "Item 2", "Item 3"];
  const radius = rect.vmin * 20;
  const cardW = rect.vmin * 20;
  const cardH = rect.vmin * 12;
  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.4)], [0, 1], { extrapolateRight: "clamp" });

  const transparentBg = isDark ? "rgba(48,59,47,0.5)" : "rgba(48,59,47,0.15)";
  const opaqueBg = isDark ? "#303b2f" : "#e8e5df";
  const overlapping = sceneStyle === "carousel" || sceneStyle === "cube" || sceneStyle === "orbit" || sceneStyle === "card-stack";

  const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    backgroundColor: overlapping ? opaqueBg : transparentBg,
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
    ...extra,
  });

  const headlineEl = headline && (
    <AnimatedText
      transition={{ split: "word", splitStagger: 4, opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, easing: "easeOutCubic" }}
      style={{ fontSize: rect.vmin * 3, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "center", display: "block", width: "100%" }}
    >
      {headline}
    </AnimatedText>
  );

  // ── Carousel: rotating ring ────────────────────────────────────────────────
  if (sceneStyle === "carousel") {
    const rotation = interpolate(frame, [0, durationInFrames], [0, 200]);
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3, opacity: fadeIn }}>
        {headlineEl}
        <div style={{ perspective: 1500, width: radius * 2.5, height: cardH * 2, display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible" }}>
          <div style={{ position: "relative", width: radius * 2, height: cardH, transformStyle: "preserve-3d", transform: `rotateX(8deg) rotateY(${rotation}deg)` }}>
            {items.map((item, i) => {
              const cardAngle = (i / items.length) * 360;
              return (
                <div key={i} style={{ position: "absolute", left: "50%", top: 0, width: cardW, height: cardH, marginLeft: -cardW / 2, transform: `rotateY(${cardAngle}deg) translateZ(${radius}px) rotateY(${-(cardAngle + rotation)}deg)`, ...cardStyle() }}>{item}</div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Card Stack: stacked cards with depth (step-by-step reveal) ──────────────
  if (sceneStyle === "card-stack") {
    // Each card gets equal time: entrance + hold, then next card enters
    const framesPerCard = Math.floor(durationInFrames / items.length);
    const entranceFrames = Math.min(Math.round(fps * 0.4), Math.floor(framesPerCard * 0.3));
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3, opacity: fadeIn }}>
        {headlineEl}
        <div style={{ perspective: 800, position: "relative", width: cardW * 1.2, height: cardH * 1.5 }}>
          {items.map((item, i) => {
            const cardStart = i * framesPerCard;
            const s = spring({ frame: frame - cardStart, fps, config: { damping: 14, stiffness: 60 } });
            const z = -i * 40;
            const y = i * rect.vmin * 1.5;
            return (
              <div key={i} style={{ position: "absolute", left: 0, top: 0, width: cardW * 1.2, height: cardH, transform: `translateZ(${z}px) translateY(${y * s}px) scale(${0.5 + s * 0.5})`, opacity: s, ...cardStyle() }}>{item}</div>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  // ── Cube: step-by-step rotation to each populated face ──────────────────────
  if (sceneStyle === "cube") {
    const cubeSize = rect.vmin * 22;
    // Only use side faces (Y-axis rotation), assign items to them
    const sideAngles = [0, 90, 180, -90]; // front, right, back, left
    const faces = items.slice(0, 4); // max 4 side faces
    const faceTransforms = faces.map((_, i) => `rotateY(${sideAngles[i]}deg) translateZ(${cubeSize / 2}px)`);
    // Step through each face: divide duration into N pauses with transitions between
    const stepCount = faces.length;
    const framesPerStep = durationInFrames / stepCount;
    const transitionFrames = Math.min(Math.round(fps * 0.6), Math.round(framesPerStep * 0.4));
    // Build keyframes: [0]=0°, [1]=sideAngles[1], etc.
    const targetAngles = faces.map((_, i) => -sideAngles[i]); // negate because we rotate the cube to show that face
    const inputFrames: number[] = [];
    const outputAngles: number[] = [];
    for (let i = 0; i < stepCount; i++) {
      const stepStart = Math.round(i * framesPerStep);
      const stepEnd = Math.round((i + 1) * framesPerStep);
      if (i === 0) {
        inputFrames.push(stepStart);
        outputAngles.push(targetAngles[0]);
      }
      if (i < stepCount - 1) {
        // Hold, then transition to next
        inputFrames.push(stepEnd - transitionFrames);
        outputAngles.push(targetAngles[i]);
        inputFrames.push(stepEnd);
        outputAngles.push(targetAngles[i + 1]);
      } else {
        // Last step: hold until end
        inputFrames.push(stepEnd);
        outputAngles.push(targetAngles[i]);
      }
    }
    const rotY = interpolate(frame, inputFrames, outputAngles, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3, opacity: fadeIn }}>
        {headlineEl}
        <div style={{ perspective: 1000, width: cubeSize, height: cubeSize }}>
          <div style={{ position: "relative", width: cubeSize, height: cubeSize, transformStyle: "preserve-3d", transform: `rotateX(8deg) rotateY(${rotY}deg)` }}>
            {faces.map((face, i) => (
              <div key={i} style={{ position: "absolute", width: cubeSize, height: cubeSize, transform: faceTransforms[i], ...cardStyle({ width: cubeSize, height: cubeSize, fontSize: rect.vmin * 4 }) }}>{face}</div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Orbit: elements orbiting center ────────────────────────────────────────
  if (sceneStyle === "orbit") {
    const orbitR = rect.vmin * 18;
    const orbitRotation = interpolate(frame, [0, durationInFrames], [0, 360]);
    return (
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3, opacity: fadeIn }}>
        {headlineEl}
        <div style={{ perspective: 1500, width: orbitR * 2.5, height: orbitR * 2, position: "relative", overflow: "visible" }}>
          <div style={{ position: "absolute", width: "100%", height: "100%", transformStyle: "preserve-3d", transform: `rotateX(8deg) rotateY(${orbitRotation}deg)` }}>
            {items.map((el, i) => {
              const angle = (i / items.length) * 360;
              return (
                <div key={i} style={{ position: "absolute", left: "50%", top: "50%", transform: `rotateY(${angle}deg) translateZ(${orbitR}px) rotateY(${-(angle + orbitRotation)}deg)`, marginLeft: -(rect.vmin * 8), marginTop: -(rect.vmin * 5), width: rect.vmin * 16, height: rect.vmin * 10, ...cardStyle() }}>{el}</div>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: "50%", top: "50%", width: rect.vmin * 6, height: rect.vmin * 6, marginLeft: -(rect.vmin * 3), marginTop: -(rect.vmin * 3), borderRadius: "50%", border: "2px solid rgba(188,172,139,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: rect.vmin * 2.5, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif" }}>
            ∞
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Flyover: cards flying toward camera ────────────────────────────────────
  if (sceneStyle === "flyover") {
    return (
      <AbsoluteFill style={{ perspective: 600, overflow: "hidden", opacity: fadeIn }}>
        {headlineEl && <div style={{ position: "absolute", top: rect.vmin * 6, left: 0, right: 0, zIndex: 10 }}>{headlineEl}</div>}
        {items.map((item, i) => {
          const delay = i * Math.round(fps * 0.6);
          const progress = interpolate(frame - delay, [0, Math.round(fps * 2.5)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const z = interpolate(progress, [0, 1], [-500, 100]);
          const scale = interpolate(progress, [0, 0.8, 1], [0.3, 1, 1.2]);
          const opacity = interpolate(progress, [0, 0.2, 0.85, 1], [0, 1, 1, 0]);
          return (
            <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: cardW, height: cardH, marginLeft: -cardW / 2, marginTop: -cardH / 2, transform: `translateZ(${z}px) scale(${scale})`, opacity, ...cardStyle() }}>{item}</div>
          );
        })}
      </AbsoluteFill>
    );
  }

  // ── Terminal: monospace terminal look with items as lines ───────────────────
  if (sceneStyle === "terminal") {
    return (
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: fadeIn }}>
        <div style={{ perspective: 800, transform: "rotateX(5deg)" }}>
          <div style={{ backgroundColor: isDark ? "rgba(15,15,15,0.9)" : "rgba(240,240,235,0.9)", border: "1px solid rgba(188,172,139,0.25)", borderRadius: rect.vmin * 1.5, padding: rect.vmin * 3, width: rect.width * 0.7, fontFamily: "monospace" }}>
            <div style={{ display: "flex", gap: rect.vmin * 0.8, marginBottom: rect.vmin * 2 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div key={c} style={{ width: rect.vmin * 1.2, height: rect.vmin * 1.2, borderRadius: "50%", backgroundColor: c }} />
              ))}
            </div>
            {items.map((item, i) => {
              const lineDelay = i * 8;
              const lineOpacity = interpolate(frame - lineDelay, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{ opacity: lineOpacity, fontSize: rect.vmin * 2.5, color: isDark ? "#BCAC8B" : "#303b2f", marginBottom: rect.vmin * 1, lineHeight: 1.6 }}>
                  <span style={{ color: isDark ? "#555" : "#aaa" }}>$ </span>{item}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // ── Elements: scattered 3D elements floating ───────────────────────────────
  if (sceneStyle === "elements") {
    const positions = items.map((_, i) => {
      const seed = i * 137.5;
      return {
        x: ((Math.sin(seed) + 1) / 2) * rect.width * 0.6 + rect.width * 0.2,
        y: ((Math.cos(seed * 2) + 1) / 2) * rect.height * 0.5 + rect.height * 0.15,
        z: Math.sin(seed * 3) * 100,
      };
    });
    return (
      <AbsoluteFill style={{ perspective: 800, opacity: fadeIn }}>
        {headlineEl && <div style={{ position: "absolute", top: rect.vmin * 5, left: 0, right: 0, zIndex: 10 }}>{headlineEl}</div>}
        {items.map((item, i) => {
          const delay = i * 6;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 80 } });
          const float = Math.sin((frame + i * 20) * 0.03) * rect.vmin * 1;
          const { x, y, z } = positions[i];
          return (
            <div key={i} style={{ position: "absolute", left: x - cardW * 0.4, top: y - cardH * 0.4 + float, width: cardW * 0.8, height: cardH * 0.8, transform: `translateZ(${z}px) scale(${s})`, ...cardStyle({ fontSize: rect.vmin * 2.8 }) }}>{item}</div>
          );
        })}
      </AbsoluteFill>
    );
  }

  // Fallback to carousel
  return <AbsoluteFill />;
};
