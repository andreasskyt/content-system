import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  AnimatedText,
  AnimatedCounter,
  GradientTransition,
  StaggeredMotion,
  Particles,
  Spawner,
  Behavior,
  Scene3D,
  Step,
  Element3D,
  useViewportRect,
} from "remotion-bits";
import { NoiseOverlay } from "./NoiseOverlay";

// ── Subtitle System ──────────────────────────────────────────────────────────

interface Sub {
  text: string;
  start: number;
  end: number;
}

const SUBS: Sub[] = [
  { text: "It started with nothing.", start: 0, end: 4 },
  { text: "One founder. One laptop. Zero clients.", start: 5, end: 9 },
  { text: "The first year was brutal.", start: 10, end: 14 },
  { text: "Rejection after rejection after rejection.", start: 15, end: 19 },
  { text: "But he never stopped building.", start: 20, end: 24 },
  { text: "Then one client finally said yes.", start: 25, end: 29 },
  { text: "Then ten. Then fifty. Then a hundred.", start: 30, end: 34 },
  { text: "Revenue started compounding.", start: 35, end: 39 },
  { text: "From zero to fifty million in annual revenue.", start: 40, end: 46 },
  { text: "One hundred people now building the vision.", start: 47, end: 52 },
  { text: "Every challenge along the way was a lesson.", start: 53, end: 57 },
  { text: "The journey was the reward.", start: 57.5, end: 60 },
];

const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rect = useViewportRect();
  const currentSec = frame / fps;

  const activeSub = SUBS.find((s) => currentSec >= s.start && currentSec < s.end);
  if (!activeSub) return null;

  const subStartFrame = activeSub.start * fps;
  const localFrame = frame - subStartFrame;
  const fadeIn = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const subEndFrame = activeSub.end * fps;
  const fadeOut = interpolate(frame, [subEndFrame - 8, subEndFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      <div style={{ position: "absolute", bottom: rect.vh * 10, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            backgroundColor: "rgba(0,0,0,0.65)",
            padding: `${rect.vmin * 1.2}px ${rect.vmin * 4}px`,
            borderRadius: rect.vmin * 0.8,
            opacity,
            maxWidth: rect.width * 0.85,
          }}
        >
          <div
            style={{
              fontSize: rect.vmin * 3.2,
              fontWeight: 500,
              color: "#FFFFFF",
              fontFamily: "Poppins, system-ui, sans-serif",
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {activeSub.text}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Scene 1: Empty — blinking cursor (0–5s) ─────────────────────────────────

const EmptyStart: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cursorOpacity = Math.sin(frame * 0.15) > 0 ? 1 : 0;
  const fadeIn = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "radial-gradient(circle at 50% 50%, #111 0%, #0a0a0a 70%)",
          "radial-gradient(circle at 50% 40%, #1a2117 0%, #0a0a0a 70%)",
        ]}
        duration={150}
        easing="easeInOutCubic"
      />
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: fadeIn }}>
        <span style={{ fontSize: rect.vmin * 4, color: "#BCAC8B", fontFamily: "monospace", opacity: cursorOpacity }}>|</span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2: Counters horizontal (5–10s) ────────────────────────────────────

const FounderCounters: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  const items = [
    { label: "Founders", val: 1 },
    { label: "Laptops", val: 1 },
    { label: "Clients", val: 0 },
  ];
  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "linear-gradient(135deg, #0a0a0a 0%, #1a2117 50%, #0a0a0a 100%)",
          "linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 30%, #1a2117 70%, #0a0a0a 100%)",
        ]}
        duration={150}
      />
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rect.vw * 12 }}>
        {items.map((item, i) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <AnimatedText
              transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, delay: i * 10, easing: "easeOutCubic" }}
              style={{
                fontSize: rect.vmin * 2.5, fontWeight: 500, color: "#BCAC8B",
                fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase",
                letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center",
              }}
            >
              {item.label}
            </AnimatedText>
            <div style={{ fontSize: rect.vmin * 12, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
              <AnimatedCounter
                transition={{ values: [0, item.val], duration: Math.round(fps * 1.5), delay: Math.round(fps * 0.3) + i * 10, easing: "easeOutCubic" }}
                toFixed={0}
              />
            </div>
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3: "Brutal year" — 3D rotating obstacles (10–15s) ─────────────────

const BrutalYear: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const obstacles = ["No Funding", "No Team", "No Revenue", "No Clients", "No Traction"];
  const radius = rect.vmin * 22;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <AbsoluteFill style={{ opacity: 0.06 }}>
        <Particles>
          <Spawner rate={0.3} max={15} lifespan={120} position={{ x: rect.width / 2, y: rect.height / 2 }} area={{ width: rect.width, height: rect.height }} velocity={{ x: 0, y: -0.1, varianceX: 0.05, varianceY: 0.05 }}>
            <div style={{ width: 2, height: 2, borderRadius: "50%", backgroundColor: "#BCAC8B" }} />
          </Spawner>
          <Behavior opacity={[0, 0.5, 0.5, 0]} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: rect.width, height: rect.height, perspective: 1200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              position: "relative",
              width: radius * 2,
              height: rect.vmin * 14,
              transformStyle: "preserve-3d",
              transform: `rotateY(${interpolate(frame, [0, fps * 5], [0, 360])}deg)`,
            }}
          >
            {obstacles.map((text, i) => {
              const angle = (i / obstacles.length) * 360;
              return (
                <div
                  key={text}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: rect.vmin * 22,
                    height: rect.vmin * 14,
                    marginLeft: -(rect.vmin * 11),
                    transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                    backfaceVisibility: "hidden",
                    backgroundColor: "rgba(80,30,30,0.5)",
                    border: "1px solid rgba(200,80,80,0.3)",
                    borderRadius: rect.vmin * 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: rect.vmin * 3.5,
                    fontWeight: 700,
                    color: "rgba(200,80,80,0.8)",
                    fontFamily: "Poppins, system-ui, sans-serif",
                  }}
                >
                  {text}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4: "Rejections" — grid of NOs staggering in (15–20s) ──────────────

const Rejections: React.FC = () => {
  const rect = useViewportRect();
  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "radial-gradient(circle at 50% 50%, #1a0a0a 0%, #0a0a0a 60%)",
          "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a0a0a 60%)",
        ]}
        duration={150}
      />
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3 }}>
        <StaggeredMotion
          transition={{ stagger: 2, staggerDirection: "random", opacity: [0, 1], scale: [0.3, 1], duration: 8, delay: 5, easing: "easeOutCubic" }}
          style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: rect.vmin * 1.5, maxWidth: rect.width * 0.75 }}
        >
          {Array.from({ length: 18 }, (_, i) => (
            <div
              key={i}
              style={{
                width: rect.vmin * 8, height: rect.vmin * 5,
                backgroundColor: "rgba(80,30,30,0.4)", border: "1px solid rgba(200,80,80,0.3)",
                borderRadius: rect.vmin * 1, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: rect.vmin * 2.5, fontWeight: 700, color: "rgba(200,80,80,0.7)", fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              NO
            </div>
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 5: "Never stopped" — 3D rotating gears/elements (20–25s) ─────────

const NeverStopped: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elements = ["Plan", "Build", "Ship", "Learn", "Repeat"];
  const radius = rect.vmin * 18;

  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 60%)",
          "radial-gradient(circle at 40% 60%, #1a2117 0%, #0a0a0a 60%)",
        ]}
        duration={150}
      />
      {/* Orbiting elements using raw CSS 3D */}
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ perspective: 1000, width: radius * 2, height: radius * 2, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              transformStyle: "preserve-3d",
              transform: `rotateX(25deg) rotateY(${interpolate(frame, [0, fps * 5], [0, 360])}deg)`,
            }}
          >
            {elements.map((el, i) => {
              const angle = (i / elements.length) * 360;
              const rad = (angle * Math.PI) / 180;
              return (
                <div
                  key={el}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `rotateY(${angle}deg) translateZ(${radius}px) rotateY(-${angle}deg)`,
                    marginLeft: -(rect.vmin * 8),
                    marginTop: -(rect.vmin * 5),
                    width: rect.vmin * 16,
                    height: rect.vmin * 10,
                    backgroundColor: "rgba(48,59,47,0.6)",
                    border: "1px solid rgba(188,172,139,0.4)",
                    borderRadius: rect.vmin * 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: rect.vmin * 3.5,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    fontFamily: "Poppins, system-ui, sans-serif",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {el}
                </div>
              );
            })}
          </div>
          {/* Center circle */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: rect.vmin * 10,
              height: rect.vmin * 10,
              marginLeft: -(rect.vmin * 5),
              marginTop: -(rect.vmin * 5),
              borderRadius: "50%",
              border: "2px solid rgba(188,172,139,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: rect.vmin * 2.5,
              color: "#BCAC8B",
              fontFamily: "Poppins, system-ui, sans-serif",
              fontWeight: 600,
            }}
          >
            ∞
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 6: "First yes" — counter 0→1 + confetti (25–30s) ─────────────────

const FirstYes: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 70%)",
          "radial-gradient(circle at 50% 40%, #253020 0%, #0a0a0a 70%)",
        ]}
        duration={150}
      />
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Particles>
          <Spawner burst={50} max={50} lifespan={100} startFrame={Math.round(fps * 2)} position={{ x: rect.width / 2, y: rect.height * 0.4 }} velocity={{ x: 0, y: -4, varianceX: 5, varianceY: 2 }}>
            <div style={{ width: rect.vmin * 0.8, height: rect.vmin * 1, backgroundColor: "#BCAC8B", borderRadius: 2 }} />
            <div style={{ width: rect.vmin * 1, height: rect.vmin * 0.6, backgroundColor: "#FFFFFF", borderRadius: 2 }} />
            <div style={{ width: rect.vmin * 0.7, height: rect.vmin * 0.8, backgroundColor: "#303b2f", borderRadius: 2 }} />
          </Spawner>
          <Behavior gravity={{ y: 0.1 }} drag={0.01} wiggle={{ magnitude: 0.8, frequency: 0.1 }} opacity={[0, 1, 1, 0.5, 0]} scale={{ start: 1, end: 0.3 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
        <AnimatedText
          transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 3.5, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center" }}
        >
          Clients
        </AnimatedText>
        <div style={{ fontSize: rect.vmin * 18, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
          <AnimatedCounter transition={{ values: [0, 1], duration: Math.round(fps * 2), delay: Math.round(fps * 0.5), easing: "easeOutCubic" }} toFixed={0} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 7: "10→50→100" — counter + rising particles (30–35s) ──────────────

const ClientGrowth: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["linear-gradient(135deg, #0a0a0a 0%, #1a2117 100%)", "linear-gradient(135deg, #1a2117 0%, #0a0a0a 100%)"]} duration={150} /><NoiseOverlay /></>
      <AbsoluteFill style={{ opacity: 0.08 }}>
        <Particles>
          <Spawner rate={1} max={50} lifespan={80} position={{ x: rect.width / 2, y: rect.height }} area={{ width: rect.width, height: 10 }} velocity={{ x: 0, y: -2, varianceX: 0.3, varianceY: 0.5 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#BCAC8B" }} />
          </Spawner>
          <Behavior opacity={[0, 0.8, 0.8, 0]} scale={{ start: 0.5, end: 1.5 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
        <AnimatedText
          transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 10, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 3.5, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center" }}
        >
          Client Count
        </AnimatedText>
        <div style={{ fontSize: rect.vmin * 16, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
          <AnimatedCounter transition={{ values: [1, 10, 50, 100], duration: Math.round(fps * 4), delay: Math.round(fps * 0.3), easing: "easeInOutCubic" }} toFixed={0} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 8: "Revenue" — 3D revolving revenue milestones (35–40s) ───────────

const RevenueGrowth: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const milestones = ["$12K", "$280K", "$2.1M", "$18M", "$50M"];
  const radius = rect.vmin * 20;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <AbsoluteFill style={{ opacity: 0.08 }}>
        <Particles>
          <Spawner rate={0.5} max={20} lifespan={90} position={{ x: rect.width / 2, y: rect.height / 2 }} area={{ width: rect.width, height: rect.height }} velocity={{ x: 0, y: -0.2, varianceX: 0.1, varianceY: 0.1 }}>
            <span style={{ fontSize: rect.vmin * 1.5, color: "#BCAC8B", fontFamily: "monospace" }}>$</span>
          </Spawner>
          <Behavior opacity={[0, 0.5, 0.5, 0]} scale={{ start: 0.5, end: 1.3 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ perspective: 1000, width: radius * 2, height: rect.vmin * 16, position: "relative" }}>
          <div
            style={{
              position: "absolute", width: "100%", height: "100%",
              transformStyle: "preserve-3d",
              transform: `rotateY(${interpolate(frame, [0, fps * 5], [0, -360])}deg)`,
            }}
          >
            {milestones.map((m, i) => {
              const angle = (i / milestones.length) * 360;
              const isFinal = i === milestones.length - 1;
              return (
                <div
                  key={m}
                  style={{
                    position: "absolute", left: "50%", top: 0,
                    width: rect.vmin * 20, height: rect.vmin * 14,
                    marginLeft: -(rect.vmin * 10),
                    transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                    backfaceVisibility: "hidden",
                    backgroundColor: isFinal ? "rgba(48,59,47,0.7)" : "rgba(48,59,47,0.35)",
                    border: `1px solid ${isFinal ? "rgba(188,172,139,0.6)" : "rgba(188,172,139,0.2)"}`,
                    borderRadius: rect.vmin * 2,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: rect.vmin * 0.5,
                  }}
                >
                  <span style={{ fontSize: rect.vmin * (isFinal ? 6 : 4.5), fontWeight: 700, color: isFinal ? "#BCAC8B" : "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>{m}</span>
                  <span style={{ fontSize: rect.vmin * 1.5, color: "rgba(188,172,139,0.5)", fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 400 }}>ARR</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 9: "$50M" — giant counter + confetti (40–47s) ─────────────────────

const FiftyMillion: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 60%)", "radial-gradient(circle at 50% 40%, #253020 0%, #0a0a0a 60%)"]} duration={210} easing="easeInOutCubic" /><NoiseOverlay /></>
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Particles>
          <Spawner burst={60} max={60} lifespan={120} startFrame={Math.round(fps * 4)} position={{ x: rect.width / 2, y: rect.height * 0.35 }} velocity={{ x: 0, y: -5, varianceX: 6, varianceY: 3 }}>
            <div style={{ width: rect.vmin * 0.8, height: rect.vmin * 1.2, backgroundColor: "#BCAC8B", borderRadius: 2 }} />
            <div style={{ width: rect.vmin * 1, height: rect.vmin * 0.7, backgroundColor: "#FFFFFF", borderRadius: 2 }} />
            <div style={{ width: rect.vmin * 0.7, height: rect.vmin * 0.9, backgroundColor: "#303b2f", borderRadius: 2 }} />
          </Spawner>
          <Behavior gravity={{ y: 0.08 }} drag={0.008} wiggle={{ magnitude: 1, frequency: 0.08 }} opacity={[0, 1, 1, 0.5, 0]} scale={{ start: 1, end: 0.2 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 1 }}>
        <AnimatedText
          transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 3, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", width: "100%", textAlign: "center" }}
        >
          Annual Revenue
        </AnimatedText>
        <div style={{ fontSize: rect.vmin * 14, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
          <AnimatedCounter
            transition={{ values: [0, 50], duration: Math.round(fps * 4), delay: Math.round(fps * 0.5), easing: "easeOutCubic" }}
            toFixed={0}
            prefix={<span style={{ color: "#BCAC8B" }}>$</span>}
            postfix={<span style={{ color: "#BCAC8B", fontSize: "60%" }}>M</span>}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 10: "100 people" — grid of dots (47–52s) ──────────────────────────

const HundredPeople: React.FC = () => {
  const rect = useViewportRect();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["linear-gradient(180deg, #0a0a0a 0%, #1a2117 100%)", "linear-gradient(180deg, #1a2117 0%, #0a0a0a 100%)"]} duration={150} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2, padding: `${rect.vmin * 4}px` }}>
        <AnimatedText
          transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 10, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 3, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center", marginBottom: rect.vmin * 1 }}
        >
          The Team
        </AnimatedText>
        <StaggeredMotion
          transition={{ stagger: 1, staggerDirection: "center", opacity: [0, 1], scale: [0, 1], duration: 6, delay: 10, easing: "easeOutCubic" }}
          style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: rect.vmin * 0.6, maxWidth: rect.width * 0.6 }}
        >
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i} style={{ width: rect.vmin * 2.8, height: rect.vmin * 2.8, borderRadius: "50%", backgroundColor: i < 1 ? "#BCAC8B" : "rgba(188,172,139,0.35)", border: i < 1 ? "2px solid #BCAC8B" : "1px solid rgba(188,172,139,0.15)" }} />
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 11: "Lessons" — 3D floating words (53–57s) ────────────────────────

const LessonsLearned: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ["Resilience", "Patience", "Focus", "Grit", "Vision"];
  const radius = rect.vmin * 20;

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 60%)", "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a2117 60%)"]} duration={120} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ perspective: 800, width: radius * 2.5, height: radius * 2, position: "relative" }}>
          <div
            style={{
              position: "absolute", width: "100%", height: "100%",
              transformStyle: "preserve-3d",
              transform: `rotateX(15deg) rotateY(${interpolate(frame, [0, fps * 4.5], [0, 180])}deg)`,
            }}
          >
            {words.map((word, i) => {
              const angle = (i / words.length) * 360;
              const fadeDelay = i * 8;
              const wordOpacity = interpolate(frame, [fadeDelay, fadeDelay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div
                  key={word}
                  style={{
                    position: "absolute", left: "50%", top: "50%",
                    transform: `rotateY(${angle}deg) translateZ(${radius}px) rotateY(-${angle}deg)`,
                    marginLeft: -(rect.vmin * 10), marginTop: -(rect.vmin * 4),
                    width: rect.vmin * 20, height: rect.vmin * 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: rect.vmin * 5, fontWeight: 700, color: "#FFFFFF",
                    fontFamily: "Poppins, system-ui, sans-serif",
                    opacity: wordOpacity,
                    backfaceVisibility: "hidden",
                    textShadow: "0 0 30px rgba(188,172,139,0.3)",
                  }}
                >
                  {word}
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 12: Final — "The Journey Was The Reward" (57–60s) ─────────────────

const FinalScene: React.FC = () => {
  const rect = useViewportRect();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #253020 0%, #0a0a0a 50%)", "radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 50%)"]} duration={90} easing="easeInOutCubic" /><NoiseOverlay /></>
      <AbsoluteFill style={{ opacity: 0.1, pointerEvents: "none" }}>
        <Particles>
          <Spawner rate={1} max={40} lifespan={80} position={{ x: rect.width / 2, y: rect.height / 2 }} area={{ width: rect.width, height: rect.height }} velocity={{ x: 0, y: -0.3, varianceX: 0.2, varianceY: 0.15 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#BCAC8B", boxShadow: "0 0 8px #BCAC8B" }} />
          </Spawner>
          <Behavior opacity={[0, 1, 1, 0]} scale={{ start: 0.3, end: 1.5 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 4 }}>
        <AnimatedText
          transition={{ split: "word", splitStagger: 8, opacity: [0, 1], blur: [6, 0], y: [rect.vmin * 2, 0], duration: 18, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 8, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center", lineHeight: 1.3, display: "block", width: "100%" }}
        >
          The Journey Was The Reward.
        </AnimatedText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────

export const FounderStory: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={0} durationInFrames={fps * 5}><EmptyStart /></Sequence>
      <Sequence from={fps * 5} durationInFrames={fps * 5}><FounderCounters /></Sequence>
      <Sequence from={fps * 10} durationInFrames={fps * 5}><BrutalYear /></Sequence>
      <Sequence from={fps * 15} durationInFrames={fps * 5}><Rejections /></Sequence>
      <Sequence from={fps * 20} durationInFrames={fps * 5}><NeverStopped /></Sequence>
      <Sequence from={fps * 25} durationInFrames={fps * 5}><FirstYes /></Sequence>
      <Sequence from={fps * 30} durationInFrames={fps * 5}><ClientGrowth /></Sequence>
      <Sequence from={fps * 35} durationInFrames={fps * 5}><RevenueGrowth /></Sequence>
      <Sequence from={fps * 40} durationInFrames={fps * 7}><FiftyMillion /></Sequence>
      <Sequence from={fps * 47} durationInFrames={fps * 5}><HundredPeople /></Sequence>
      <Sequence from={fps * 52.5} durationInFrames={fps * 4.5}><LessonsLearned /></Sequence>
      <Sequence from={fps * 57} durationInFrames={fps * 3}><FinalScene /></Sequence>
      <Subtitles />
    </AbsoluteFill>
  );
};
