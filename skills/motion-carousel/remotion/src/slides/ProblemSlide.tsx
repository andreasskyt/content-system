import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights, radii } from "../theme";
import { useSpring, STAGGER } from "../easing";

/**
 * Archetype D — "old way" list with strikethrough pills that animate in and
 * then get crossed out one by one. Works best on white/light surface.
 */
export const ProblemSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = spec.items ?? [];

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
      <div
        style={{
          fontSize: typeScale.xl,
          fontWeight: weights.black,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          color: colors.textDark,
          opacity: headlineProgress,
          transform: `translateY(${interpolate(headlineProgress, [0, 1], [20, 0])}px)`,
          marginBottom: 56,
        }}
      >
        {spec.headline ?? "The old way."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {items.map((text, i) => {
          const enterDelay = 18 + i * STAGGER * 2;
          const strikeDelay = enterDelay + 18;
          const enter = useSpring("enter", frame, fps, enterDelay);
          const strike = useSpring("smooth", frame, fps, strikeDelay);
          const y = interpolate(enter, [0, 1], [18, 0]);

          return (
            <div
              key={i}
              style={{
                opacity: enter,
                transform: `translateY(${y}px)`,
                background: colors.lightBg,
                border: `1px solid ${colors.lightBorder}`,
                borderRadius: radii.pill,
                padding: "22px 36px",
                fontSize: typeScale.base,
                fontWeight: weights.semibold,
                color: colors.textDark,
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                alignSelf: "flex-start",
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>{text}</span>
              <span
                style={{
                  position: "absolute",
                  left: 28,
                  right: 28,
                  top: "50%",
                  height: 4,
                  background: colors.underlineRed,
                  borderRadius: 2,
                  transform: `scaleX(${strike}) translateY(-50%)`,
                  transformOrigin: "left center",
                  zIndex: 2,
                  opacity: 0.9,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
