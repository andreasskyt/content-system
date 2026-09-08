import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights, radii } from "../theme";
import { useSpring } from "../easing";
import { KineticText } from "../components/KineticText";

/**
 * Archetype J — gradient CTA slide with a button that pulses once on entrance
 * and the @[IG_HANDLE] handle.
 */
export const CTASlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cta = spec.cta ?? { text: "Follow for more", handle: "@[IG_HANDLE]" };

  const buttonProgress = useSpring("emphasis", frame, fps, 28);
  const handleProgress = useSpring("enter", frame, fps, 44);

  const pulsePeriod = fps * 1.4;
  const pulseT = Math.max(0, frame - 40) % pulsePeriod;
  const pulseScale = 1 + 0.04 * Math.sin((pulseT / pulsePeriod) * Math.PI * 2);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "0 96px",
        gap: 48,
      }}
    >
      <div
        style={{
          fontSize: typeScale["2xl"],
          fontWeight: weights.black,
          lineHeight: 1.05,
          color: colors.white,
          letterSpacing: "-0.025em",
          maxWidth: 820,
        }}
      >
        <KineticText text={spec.headline ?? "Steal my SOPs."} delay={8} splitBy="word" />
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          background: colors.white,
          color: colors.primaryDark,
          padding: "24px 40px",
          borderRadius: radii.pill,
          fontSize: typeScale.base,
          fontWeight: weights.bold,
          opacity: buttonProgress,
          transform: `scale(${pulseScale * interpolate(buttonProgress, [0, 1], [0.9, 1])})`,
          boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
        }}
      >
        {cta.text}
        {cta.keyword && (
          <span
            style={{
              background: colors.accentGold,
              color: colors.primaryDark,
              padding: "6px 16px",
              borderRadius: radii.pill,
              fontSize: typeScale.sm,
              fontWeight: weights.black,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {cta.keyword}
          </span>
        )}
        <span style={{ fontSize: typeScale.lg, lineHeight: 1 }}>→</span>
      </div>
      <div
        style={{
          fontSize: typeScale.base,
          fontWeight: weights.semibold,
          color: "rgba(255,255,255,0.85)",
          opacity: handleProgress,
          transform: `translateY(${interpolate(handleProgress, [0, 1], [12, 0])}px)`,
        }}
      >
        {cta.handle ?? "@[IG_HANDLE]"}
      </div>
    </div>
  );
};
