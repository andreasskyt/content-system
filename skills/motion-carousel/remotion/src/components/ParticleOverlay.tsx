import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { colors } from "../theme";

export type ParticleEffect = "confetti" | "sparkle" | "grain";

type Props = { effect: ParticleEffect };

/**
 * Lightweight decorative overlay. Sits above slide content, below progress
 * bar. Deterministic seed-based so renders are reproducible frame-to-frame.
 */
export const ParticleOverlay: React.FC<Props> = ({ effect }) => {
  if (effect === "confetti") return <Confetti />;
  if (effect === "sparkle") return <Sparkle />;
  return <Grain />;
};

const SEEDED = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const Confetti: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const count = 60;
  const palette = [colors.accentGold, colors.white, colors.primaryLight, "#F5F1EA"];

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 5 }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i + 1;
        const startX = SEEDED(seed * 7) * width;
        const startY = -40 - SEEDED(seed * 11) * 120;
        const driftX = (SEEDED(seed * 13) - 0.5) * 140;
        const fallRate = 2.2 + SEEDED(seed * 17) * 2.6; // px per frame
        const rotationRate = (SEEDED(seed * 19) - 0.5) * 12;
        const size = 10 + SEEDED(seed * 23) * 14;
        const color = palette[Math.floor(SEEDED(seed * 29) * palette.length)];
        const delay = SEEDED(seed * 31) * fps * 0.6;
        const t = Math.max(0, frame - delay);
        const y = startY + t * fallRate;
        const x = startX + Math.sin(t / 12 + seed) * 28 + (t / fps) * driftX;
        const rotation = t * rotationRate;
        if (y > height + 40) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size * 0.55,
              background: color,
              transform: `rotate(${rotation}deg)`,
              borderRadius: 2,
              opacity: 0.9,
              boxShadow: `0 0 12px ${color}66`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Sparkle: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const count = 40;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 5 }}>
      {Array.from({ length: count }).map((_, i) => {
        const seed = i + 1;
        const x = SEEDED(seed * 7) * width;
        const y = SEEDED(seed * 11) * height;
        const period = fps * (1.2 + SEEDED(seed * 13) * 1.8);
        const phase = SEEDED(seed * 17) * period;
        const t = ((frame + phase) % period) / period; // 0..1
        const brightness = Math.sin(t * Math.PI); // 0..1..0
        const size = 4 + SEEDED(seed * 19) * 8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              background: colors.accentGold,
              borderRadius: "50%",
              opacity: brightness * 0.9,
              boxShadow: `0 0 ${size * 3}px ${colors.accentGold}`,
              transform: `scale(${0.5 + brightness * 0.7})`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const filterId = `grain-${Math.floor(frame / 3)}`;
  return (
    <AbsoluteFill
      style={{ pointerEvents: "none", opacity: 0.06, mixBlendMode: "overlay", zIndex: 4 }}
    >
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={Math.floor(frame / 3)}
          />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </AbsoluteFill>
  );
};
