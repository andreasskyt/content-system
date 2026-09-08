import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights, radii } from "../theme";
import { useSpring, STAGGER } from "../easing";

/**
 * Archetype F — staggered checkmark list. Each row slides in from left with a
 * checkmark that draws in via stroke-dashoffset.
 */
export const FeatureSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = spec.items ?? [];
  const isLight = spec.surface !== "gradient";

  const headlineProgress = useSpring("emphasis", frame, fps, 6);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
      }}
    >
      {spec.headline && (
        <div
          style={{
            fontSize: typeScale.lg,
            fontWeight: weights.black,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: isLight ? colors.textDark : colors.white,
            opacity: headlineProgress,
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [16, 0])}px)`,
            marginBottom: 44,
          }}
        >
          {spec.headline}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {items.map((text, i) => {
          const delay = 18 + i * STAGGER * 2;
          const enter = useSpring("enter", frame, fps, delay);
          const checkProgress = useSpring("snap", frame, fps, delay + 4);
          const x = interpolate(enter, [0, 1], [-24, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 22,
                opacity: enter,
                transform: `translateX(${x}px)`,
              }}
            >
              <Checkmark progress={checkProgress} color={colors.accentGold} />
              <span
                style={{
                  fontSize: typeScale.base,
                  fontWeight: weights.semibold,
                  color: isLight ? colors.textDark : colors.white,
                  lineHeight: 1.25,
                  maxWidth: 760,
                }}
              >
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Checkmark: React.FC<{ progress: number; color: string }> = ({
  progress,
  color,
}) => {
  const dashLength = 48;
  const dashOffset = interpolate(progress, [0, 1], [dashLength, 0]);
  return (
    <span
      style={{
        width: 64,
        height: 64,
        borderRadius: radii.pill,
        background: "rgba(188,172,139,0.18)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24">
        <path
          d="M4,12 L10,18 L20,6"
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </span>
  );
};
