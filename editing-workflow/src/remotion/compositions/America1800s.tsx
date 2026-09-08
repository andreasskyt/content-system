import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import {
  AnimatedText,
  AnimatedCounter,
  GradientTransition,
  StaggeredMotion,
  Particles,
  Spawner,
  Behavior,
  useViewportRect,
} from "remotion-bits";
import { NoiseOverlay } from "./NoiseOverlay";

// ── Subtitle System ──────────────────────────────────────────────────────────

interface Sub { text: string; start: number; end: number; }

const SUBS: Sub[] = [
  { text: "The year is 1800. America is young.", start: 0, end: 4.5 },
  { text: "Sixteen states. Five million people. A fragile experiment.", start: 5, end: 9.5 },
  { text: "In 1803, Jefferson doubles the nation overnight.", start: 10, end: 14.5 },
  { text: "The Louisiana Purchase — 828,000 square miles for $15 million.", start: 15, end: 19.5 },
  { text: "Lewis and Clark push west into the unknown.", start: 20, end: 24.5 },
  { text: "The War of 1812 tests the young republic.", start: 25, end: 29 },
  { text: "The White House burns. But the nation endures.", start: 29.5, end: 33.5 },
  { text: "By the 1830s, the Industrial Revolution transforms the North.", start: 34, end: 38.5 },
  { text: "Railroads connect cities. Factories replace farms.", start: 39, end: 43 },
  { text: "But a deep wound festers: slavery.", start: 43.5, end: 47 },
  { text: "1861. The nation tears itself apart.", start: 47.5, end: 51 },
  { text: "620,000 die in the bloodiest war on American soil.", start: 51.5, end: 55.5 },
  { text: "Lincoln preserves the Union. Slavery ends.", start: 56, end: 59 },
  { text: "By 1900 — America is a world power.", start: 59, end: 62 },
];

const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rect = useViewportRect();
  const sec = frame / fps;
  const sub = SUBS.find((s) => sec >= s.start && sec < s.end);
  if (!sub) return null;
  const sf = sub.start * fps;
  const ef = sub.end * fps;
  const fadeIn = interpolate(frame - sf, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [ef - 8, ef], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      <div style={{ position: "absolute", bottom: rect.vh * 10, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <div style={{ backgroundColor: "rgba(0,0,0,0.7)", padding: `${rect.vmin * 1.2}px ${rect.vmin * 4}px`, borderRadius: rect.vmin * 0.8, opacity: Math.min(fadeIn, fadeOut), maxWidth: rect.width * 0.85 }}>
          <div style={{ fontSize: rect.vmin * 3, fontWeight: 500, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center", lineHeight: 1.4 }}>{sub.text}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ── Shared: 3D rotating ring helper ─────────────────────────────────────────

const RotatingRing: React.FC<{
  items: { label: string; sublabel?: string; color?: string }[];
  radius: number;
  cardW: number;
  cardH: number;
  speed?: number;
  tilt?: number;
}> = ({ items, radius, cardW, cardH, speed = 1, tilt = 20 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rect = useViewportRect();
  const rotation = interpolate(frame, [0, fps * 60], [0, 360 * speed]);
  return (
    <div style={{ perspective: 1200, width: radius * 2.5, height: cardH * 1.5, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: radius * 2, height: cardH, transformStyle: "preserve-3d", transform: `rotateX(${tilt}deg) rotateY(${rotation}deg)` }}>
        {items.map((item, i) => {
          const angle = (i / items.length) * 360;
          return (
            <div
              key={i}
              style={{
                position: "absolute", left: "50%", top: 0,
                width: cardW, height: cardH, marginLeft: -cardW / 2,
                transform: `rotateY(${angle}deg) translateZ(${radius}px)`,
                backfaceVisibility: "hidden",
                backgroundColor: item.color || "rgba(139,115,85,0.25)",
                border: "1px solid rgba(188,172,139,0.35)",
                borderRadius: rect.vmin * 2,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 0.8,
              }}
            >
              <span style={{ fontSize: rect.vmin * 3.5, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center", padding: `0 ${rect.vmin}px` }}>{item.label}</span>
              {item.sublabel && <span style={{ fontSize: rect.vmin * 1.8, color: "rgba(188,172,139,0.7)", fontFamily: "Poppins, system-ui, sans-serif" }}>{item.sublabel}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Scene 1: "1800" — giant year number fading in (0–5s) ────────────────────

const Opening: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = interpolate(frame, [0, fps * 3], [0.6, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, fps * 1.5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a1510 0%, #0a0a0a 70%)", "radial-gradient(circle at 50% 40%, #1a1510 0%, #0a0a0a 70%)"]} duration={150} easing="easeInOutCubic" /><NoiseOverlay /></>
      <AbsoluteFill style={{ opacity: 0.05 }}>
        <Particles>
          <Spawner rate={0.2} max={10} lifespan={150} position={{ x: rect.width / 2, y: rect.height / 2 }} area={{ width: rect.width, height: rect.height }} velocity={{ x: 0, y: -0.05, varianceX: 0.03, varianceY: 0.03 }}>
            <div style={{ width: 2, height: 2, borderRadius: "50%", backgroundColor: "#BCAC8B" }} />
          </Spawner>
          <Behavior opacity={[0, 0.4, 0.4, 0]} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2, opacity, transform: `scale(${scale})` }}>
        <span style={{ fontSize: rect.vmin * 20, fontWeight: 700, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", letterSpacing: "0.05em" }}>1800</span>
        <span style={{ fontSize: rect.vmin * 3, fontWeight: 400, color: "rgba(255,255,255,0.5)", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.2em" }}>A New Century</span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 2: "16 states, 5M people" — counters horizontal (5–10s) ───────────

const YoungNation: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["linear-gradient(135deg, #0a0a0a 0%, #1a1510 50%, #0a0a0a 100%)", "linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 30%, #1a1510 70%, #0a0a0a 100%)"]} duration={150} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rect.vw * 14 }}>
        {[{ label: "States", val: 16 }, { label: "Population", val: 5, post: "M" }].map((item, i) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <AnimatedText transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, delay: i * 12, easing: "easeOutCubic" }} style={{ fontSize: rect.vmin * 2.5, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.12em", display: "block", width: "100%", textAlign: "center" }}>
              {item.label}
            </AnimatedText>
            <div style={{ fontSize: rect.vmin * 14, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
              <AnimatedCounter transition={{ values: [0, item.val], duration: Math.round(fps * 2), delay: Math.round(fps * 0.3) + i * 12, easing: "easeOutCubic" }} toFixed={0} postfix={item.post ? <span style={{ color: "#BCAC8B", fontSize: "50%" }}>{item.post}</span> : undefined} />
            </div>
          </div>
        ))}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3: Louisiana Purchase — 3D expanding territory cards (10–15s) ─────

const LouisianaPurchase: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Cards spread outward from center over time
  const spread = interpolate(frame, [0, fps * 3], [0, 1], { extrapolateRight: "clamp" });

  const territories = ["Ohio", "Louisiana", "Indiana", "Mississippi", "Illinois", "Missouri", "Arkansas", "Iowa"];

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a1510 0%, #0a0a0a 60%)", "radial-gradient(circle at 40% 50%, #1a1510 0%, #0a0a0a 60%)"]} duration={150} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ perspective: 1000, position: "relative", width: rect.width * 0.8, height: rect.height * 0.6 }}>
          {territories.map((t, i) => {
            const angle = (i / territories.length) * Math.PI * 2;
            const maxR = rect.vmin * 22;
            const r = spread * maxR;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r * 0.5;
            const z = Math.sin(angle) * 100 * spread;
            const delay = i * 4;
            const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div
                key={t}
                style={{
                  position: "absolute", left: "50%", top: "50%",
                  width: rect.vmin * 14, height: rect.vmin * 9,
                  marginLeft: -(rect.vmin * 7), marginTop: -(rect.vmin * 4.5),
                  transform: `translate3d(${x}px, ${y}px, ${z}px)`,
                  backgroundColor: "rgba(139,115,85,0.3)",
                  border: "1px solid rgba(188,172,139,0.35)",
                  borderRadius: rect.vmin * 1.5,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: rect.vmin * 2.5, fontWeight: 600, color: "#FFFFFF",
                  fontFamily: "Poppins, system-ui, sans-serif",
                  opacity: cardOpacity,
                }}
              >
                {t}
              </div>
            );
          })}
          {/* Center label */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: rect.vmin * 4, fontWeight: 700, color: "#BCAC8B",
            fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center",
            opacity: interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: "clamp" }),
          }}>
            1803
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4: "$15M for 828K sq mi" — counter (15–20s) ───────────────────────

const PurchaseNumbers: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["linear-gradient(180deg, #0a0a0a 0%, #1a1510 100%)", "linear-gradient(180deg, #1a1510 0%, #0a0a0a 100%)"]} duration={150} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: rect.vw * 10 }}>
        <div style={{ textAlign: "center" }}>
          <AnimatedText transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, easing: "easeOutCubic" }} style={{ fontSize: rect.vmin * 2.5, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center" }}>
            Price
          </AnimatedText>
          <div style={{ fontSize: rect.vmin * 12, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
            <AnimatedCounter transition={{ values: [0, 15], duration: Math.round(fps * 2.5), delay: Math.round(fps * 0.3), easing: "easeOutCubic" }} toFixed={0} prefix={<span style={{ color: "#BCAC8B" }}>$</span>} postfix={<span style={{ color: "#BCAC8B", fontSize: "50%" }}>M</span>} />
          </div>
        </div>
        <div style={{ fontSize: rect.vmin * 6, color: "rgba(188,172,139,0.3)", fontFamily: "Poppins, system-ui, sans-serif" }}>→</div>
        <div style={{ textAlign: "center" }}>
          <AnimatedText transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, delay: 15, easing: "easeOutCubic" }} style={{ fontSize: rect.vmin * 2.5, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center" }}>
            Land
          </AnimatedText>
          <div style={{ fontSize: rect.vmin * 12, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
            <AnimatedCounter transition={{ values: [0, 828], duration: Math.round(fps * 2.5), delay: Math.round(fps * 0.5), easing: "easeOutCubic" }} toFixed={0} postfix={<span style={{ color: "#BCAC8B", fontSize: "40%" }}>K mi²</span>} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 5: Lewis & Clark — 3D journey path (20–25s) ───────────────────────

const LewisClark: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stops = ["St. Louis", "Great Plains", "Rocky Mountains", "Columbia River", "Pacific Ocean"];
  const progress = interpolate(frame, [0, fps * 4.5], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["linear-gradient(90deg, #0a0a0a 0%, #1a1510 50%, #0a0a0a 100%)", "linear-gradient(90deg, #1a1510 0%, #0a0a0a 50%, #1a1510 100%)"]} duration={150} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ perspective: 800, width: rect.width * 0.85, position: "relative" }}>
          {/* Path line */}
          <div style={{ position: "absolute", top: "50%", left: "5%", right: "5%", height: 2, backgroundColor: "rgba(188,172,139,0.15)", transform: "translateY(-50%)" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, backgroundColor: "#BCAC8B", transition: "none" }} />
          </div>
          {/* Stops */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: `0 ${rect.vw * 3}px`, position: "relative" }}>
            {stops.map((stop, i) => {
              const stopProgress = i / (stops.length - 1);
              const isReached = progress >= stopProgress;
              const appear = interpolate(progress, [Math.max(0, stopProgress - 0.05), stopProgress + 0.05], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={stop} style={{ textAlign: "center", opacity: appear, transform: `translateY(${(1 - appear) * 20}px) scale(${0.7 + appear * 0.3})` }}>
                  <div style={{
                    width: rect.vmin * 3, height: rect.vmin * 3, borderRadius: "50%", margin: "0 auto",
                    backgroundColor: isReached ? "#BCAC8B" : "rgba(188,172,139,0.2)",
                    border: `2px solid ${isReached ? "#BCAC8B" : "rgba(188,172,139,0.3)"}`,
                    marginBottom: rect.vmin * 1.5,
                    boxShadow: isReached ? "0 0 15px rgba(188,172,139,0.4)" : "none",
                  }} />
                  <span style={{ fontSize: rect.vmin * 2, fontWeight: 600, color: isReached ? "#FFFFFF" : "rgba(255,255,255,0.3)", fontFamily: "Poppins, system-ui, sans-serif", whiteSpace: "nowrap" }}>{stop}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 6: War of 1812 — 3D rotating battle cards (25–34s) ────────────────

const WarOf1812: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const events = [
    { label: "War Declared", sublabel: "June 1812" },
    { label: "Battle of York", sublabel: "April 1813" },
    { label: "White House Burns", sublabel: "August 1814", color: "rgba(120,40,30,0.4)" },
    { label: "Fort McHenry", sublabel: "Sept 1814" },
    { label: "Treaty of Ghent", sublabel: "Dec 1814" },
    { label: "Nation Endures", sublabel: "1815" },
  ];

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a0f0a 0%, #0a0a0a 60%)", "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a0f0a 60%)"]} duration={270} /><NoiseOverlay /></>
      {/* Ember particles */}
      <AbsoluteFill style={{ opacity: 0.08 }}>
        <Particles>
          <Spawner rate={0.6} max={25} lifespan={80} position={{ x: rect.width / 2, y: rect.height * 0.8 }} area={{ width: rect.width * 0.6, height: 10 }} velocity={{ x: 0, y: -1.5, varianceX: 0.5, varianceY: 0.5 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#c45a2c" }} />
          </Spawner>
          <Behavior opacity={[0, 0.8, 0.6, 0]} scale={{ start: 1, end: 0.3 }} wiggle={{ magnitude: 0.3, frequency: 0.05 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RotatingRing items={events} radius={rect.vmin * 24} cardW={rect.vmin * 22} cardH={rect.vmin * 14} speed={0.4} tilt={15} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 7: Industrial Revolution — 3D grid stagger (34–43s) ───────────────

const IndustrialRevolution: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const innovations = ["Steam Engine", "Railroads", "Cotton Gin", "Telegraph", "Steel Mills", "Factories", "Canals", "Coal Mining"];

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["linear-gradient(135deg, #0a0a0a 0%, #15130f 50%, #0a0a0a 100%)", "linear-gradient(135deg, #15130f 0%, #0a0a0a 50%, #15130f 100%)"]} duration={270} /><NoiseOverlay /></>
      {/* Steam/smoke particles */}
      <AbsoluteFill style={{ opacity: 0.06 }}>
        <Particles>
          <Spawner rate={0.4} max={20} lifespan={100} position={{ x: rect.width / 2, y: rect.height * 0.9 }} area={{ width: rect.width * 0.5, height: 10 }} velocity={{ x: 0, y: -0.8, varianceX: 0.4, varianceY: 0.2 }}>
            <div style={{ width: rect.vmin * 2, height: rect.vmin * 2, borderRadius: "50%", backgroundColor: "rgba(200,200,200,0.3)" }} />
          </Spawner>
          <Behavior opacity={[0, 0.4, 0.3, 0]} scale={{ start: 0.5, end: 3 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3 }}>
        <AnimatedText transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 12, easing: "easeOutCubic" }} style={{ fontSize: rect.vmin * 3.5, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center" }}>
          Industrial Revolution
        </AnimatedText>
        <StaggeredMotion
          transition={{ stagger: 5, staggerDirection: "forward", opacity: [0, 1], scale: [0.5, 1], y: [30, 0], duration: 15, delay: 15, easing: "easeOutCubic" }}
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: rect.vmin * 2, maxWidth: rect.width * 0.8 }}
        >
          {innovations.map((item) => (
            <div key={item} style={{ backgroundColor: "rgba(139,115,85,0.2)", border: "1px solid rgba(188,172,139,0.25)", borderRadius: rect.vmin * 1.5, padding: `${rect.vmin * 2.5}px ${rect.vmin * 1.5}px`, textAlign: "center", fontSize: rect.vmin * 2.5, fontWeight: 600, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
              {item}
            </div>
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 8: Slavery — dark, heavy (43–47s) ─────────────────────────────────

const Slavery: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chains = Array.from({ length: 8 }, (_, i) => i);

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #0f0a0a 0%, #050505 70%)", "radial-gradient(circle at 50% 50%, #050505 0%, #0f0a0a 70%)"]} duration={120} /><NoiseOverlay /></>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <StaggeredMotion
          transition={{ stagger: 6, staggerDirection: "center", opacity: [0, 0.5], y: [20, 0], duration: 20, delay: 5, easing: "easeOutCubic" }}
          style={{ display: "flex", gap: rect.vmin * 3 }}
        >
          {chains.map((i) => (
            <div key={i} style={{ width: rect.vmin * 4, height: rect.vmin * 4, borderRadius: "50%", border: "3px solid rgba(100,60,50,0.5)", backgroundColor: "transparent" }} />
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AnimatedText
          transition={{ split: "word", splitStagger: 12, opacity: [0, 1], blur: [8, 0], duration: 20, delay: 30, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 7, fontWeight: 700, color: "rgba(255,255,255,0.6)", fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center", display: "block", width: "100%" }}
        >
          A Nation Divided
        </AnimatedText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 9: Civil War — 3D battle stats (47–55.5s) ─────────────────────────

const CivilWar: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();

  const battles = [
    { label: "Fort Sumter", sublabel: "1861" },
    { label: "Gettysburg", sublabel: "1863", color: "rgba(120,40,30,0.4)" },
    { label: "Antietam", sublabel: "1862" },
    { label: "Vicksburg", sublabel: "1863" },
    { label: "Appomattox", sublabel: "1865" },
  ];

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a0a0a 0%, #0a0a0a 60%)", "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a0a0a 60%)"]} duration={255} /><NoiseOverlay /></>
      {/* Blood-red particles */}
      <AbsoluteFill style={{ opacity: 0.06 }}>
        <Particles>
          <Spawner rate={0.3} max={15} lifespan={100} position={{ x: rect.width / 2, y: rect.height / 2 }} area={{ width: rect.width, height: rect.height }} velocity={{ x: 0, y: 0.3, varianceX: 0.2, varianceY: 0.2 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#8b3030" }} />
          </Spawner>
          <Behavior opacity={[0, 0.5, 0.5, 0]} />
        </Particles>
      </AbsoluteFill>

      {/* 3D rotating battles first half */}
      <Sequence from={0} durationInFrames={fps * 4.5}>
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <RotatingRing items={battles} radius={rect.vmin * 22} cardW={rect.vmin * 20} cardH={rect.vmin * 13} speed={0.5} tilt={18} />
        </AbsoluteFill>
      </Sequence>

      {/* Casualty counter second half */}
      <Sequence from={Math.round(fps * 4.5)} durationInFrames={Math.round(fps * 4)}>
        <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2 }}>
          <AnimatedText transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 10, easing: "easeOutCubic" }} style={{ fontSize: rect.vmin * 3, fontWeight: 500, color: "rgba(200,80,80,0.7)", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", width: "100%", textAlign: "center" }}>
            Lives Lost
          </AnimatedText>
          <div style={{ fontSize: rect.vmin * 14, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif" }}>
            <AnimatedCounter transition={{ values: [0, 620000], duration: Math.round(fps * 3.5), delay: Math.round(fps * 0.3), easing: "easeOutCubic" }} toFixed={0} />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

// ── Scene 10: Lincoln / Union preserved (56–59s) ────────────────────────────

const LincolnUnion: React.FC = () => {
  const rect = useViewportRect();
  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 60%)", "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a2117 60%)"]} duration={90} /><NoiseOverlay /></>
      <AbsoluteFill style={{ opacity: 0.08 }}>
        <Particles>
          <Spawner rate={0.8} max={30} lifespan={80} position={{ x: rect.width / 2, y: rect.height / 2 }} area={{ width: rect.width, height: rect.height }} velocity={{ x: 0, y: -0.3, varianceX: 0.2, varianceY: 0.15 }}>
            <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#BCAC8B", boxShadow: "0 0 6px #BCAC8B" }} />
          </Spawner>
          <Behavior opacity={[0, 0.8, 0.8, 0]} scale={{ start: 0.3, end: 1.5 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 3 }}>
        <AnimatedText
          transition={{ split: "word", splitStagger: 6, opacity: [0, 1], y: [rect.vmin * 3, 0], duration: 15, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 7, fontWeight: 700, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center", display: "block", width: "100%", lineHeight: 1.3 }}
        >
          Union Preserved.
        </AnimatedText>
        <AnimatedText
          transition={{ opacity: [0, 1], y: [rect.vmin * 2, 0], duration: 15, delay: 25, easing: "easeOutCubic" }}
          style={{ fontSize: rect.vmin * 4, fontWeight: 500, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", textAlign: "center", display: "block", width: "100%" }}
        >
          Slavery Abolished.
        </AnimatedText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 11: "By 1900 — world power" (59–62s) ─────────────────────────────

const WorldPower: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = interpolate(frame, [0, fps * 2], [0.8, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, fps * 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <><GradientTransition gradient={["radial-gradient(circle at 50% 50%, #1a1510 0%, #0a0a0a 50%)", "radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 50%)"]} duration={90} easing="easeInOutCubic" /><NoiseOverlay /></>
      <AbsoluteFill style={{ opacity: 0.1, pointerEvents: "none" }}>
        <Particles>
          <Spawner burst={30} max={30} lifespan={90} startFrame={Math.round(fps * 0.5)} position={{ x: rect.width / 2, y: rect.height / 2 }} velocity={{ x: 0, y: -2, varianceX: 3, varianceY: 2 }}>
            <div style={{ width: rect.vmin * 0.6, height: rect.vmin * 0.8, backgroundColor: "#BCAC8B", borderRadius: 1 }} />
          </Spawner>
          <Behavior gravity={{ y: 0.05 }} opacity={[0, 1, 1, 0]} scale={{ start: 1, end: 0.3 }} />
        </Particles>
      </AbsoluteFill>
      <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: rect.vmin * 2, opacity, transform: `scale(${scale})` }}>
        <span style={{ fontSize: rect.vmin * 18, fontWeight: 700, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", letterSpacing: "0.05em" }}>1900</span>
        <span style={{ fontSize: rect.vmin * 4, fontWeight: 600, color: "#FFFFFF", fontFamily: "Poppins, system-ui, sans-serif", textTransform: "uppercase", letterSpacing: "0.15em" }}>A World Power</span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Main ─────────────────────────────────────────────────────────────────────

export const America1800s: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={0} durationInFrames={fps * 5}><Opening /></Sequence>
      <Sequence from={fps * 5} durationInFrames={fps * 5}><YoungNation /></Sequence>
      <Sequence from={fps * 10} durationInFrames={fps * 5}><LouisianaPurchase /></Sequence>
      <Sequence from={fps * 15} durationInFrames={fps * 5}><PurchaseNumbers /></Sequence>
      <Sequence from={fps * 20} durationInFrames={fps * 5}><LewisClark /></Sequence>
      <Sequence from={fps * 25} durationInFrames={fps * 9}><WarOf1812 /></Sequence>
      <Sequence from={fps * 34} durationInFrames={fps * 9}><IndustrialRevolution /></Sequence>
      <Sequence from={fps * 43} durationInFrames={fps * 4}><Slavery /></Sequence>
      <Sequence from={fps * 47} durationInFrames={Math.round(fps * 8.5)}><CivilWar /></Sequence>
      <Sequence from={fps * 55.5} durationInFrames={Math.round(fps * 3.5)}><LincolnUnion /></Sequence>
      <Sequence from={fps * 59} durationInFrames={fps * 3}><WorldPower /></Sequence>
      <Subtitles />
    </AbsoluteFill>
  );
};
