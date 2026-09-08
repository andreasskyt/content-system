import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { useSpring } from "../easing";

/**
 * Archetype B — giant count-up number + label. Number animates from 0 to target
 * with emphasis spring (overshoot + settle).
 */
export const StatSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stat = spec.stat ?? { value: 0 };
  const isGradient = spec.surface === "gradient";

  const numberProgress = useSpring("emphasis", frame, fps, 10);
  const labelProgress = useSpring("enter", frame, fps, 28);

  const animatedValue = interpolate(numberProgress, [0, 1], [0, stat.value], {
    extrapolateRight: "clamp",
  });

  // Preserve decimals if the target has them.
  const hasDecimals = stat.value % 1 !== 0;
  const display = hasDecimals
    ? animatedValue.toFixed(1)
    : Math.round(animatedValue).toLocaleString("en-US");

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 72px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {stat.prefix && (
          <span
            style={{
              fontSize: typeScale["2xl"],
              fontWeight: weights.bold,
              color: isGradient ? colors.accentGold : colors.primary,
              opacity: numberProgress,
            }}
          >
            {stat.prefix}
          </span>
        )}
        <span
          style={{
            fontSize: 240,
            fontWeight: weights.black,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            color: isGradient ? colors.accentGold : colors.primary,
            opacity: numberProgress,
          }}
        >
          {display}
        </span>
        {stat.suffix && (
          <span
            style={{
              fontSize: typeScale["2xl"],
              fontWeight: weights.bold,
              color: isGradient ? colors.accentGold : colors.primary,
              opacity: numberProgress,
            }}
          >
            {stat.suffix}
          </span>
        )}
      </div>
      {stat.label && (
        <div
          style={{
            marginTop: 24,
            fontSize: typeScale.lg,
            fontWeight: weights.semibold,
            color: isGradient ? colors.white : colors.textDark,
            opacity: labelProgress,
            transform: `translateY(${interpolate(labelProgress, [0, 1], [16, 0])}px)`,
            maxWidth: 780,
            lineHeight: 1.2,
          }}
        >
          {stat.label}
        </div>
      )}
    </div>
  );
};
