import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { useSpring, STAGGER } from "../easing";

/**
 * Archetype G — numbered steps. Huge step numbers on the left, label text on
 * the right. Rows reveal top-to-bottom with a shared mask wipe.
 */
export const StepsSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
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
            lineHeight: 1.08,
            color: isLight ? colors.textDark : colors.white,
            opacity: headlineProgress,
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [16, 0])}px)`,
            marginBottom: 48,
          }}
        >
          {spec.headline}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        {items.map((text, i) => {
          const delay = 18 + i * STAGGER * 2;
          const enter = useSpring("enter", frame, fps, delay);
          const y = interpolate(enter, [0, 1], [20, 0]);

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 32,
                opacity: enter,
                transform: `translateY(${y}px)`,
              }}
            >
              <span
                style={{
                  fontSize: 120,
                  fontWeight: weights.black,
                  lineHeight: 0.9,
                  color: isLight ? colors.primary : colors.accentGold,
                  flexShrink: 0,
                  minWidth: 110,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontSize: typeScale.base,
                  fontWeight: weights.semibold,
                  lineHeight: 1.3,
                  color: isLight ? colors.textDark : colors.white,
                  maxWidth: 720,
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
