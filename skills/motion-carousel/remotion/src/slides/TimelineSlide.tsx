import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights, radii } from "../theme";
import { useSpring } from "../easing";

/**
 * Horizontal progression. Milestones left-to-right; rail draws in first, then
 * dots pop with stagger, labels fade in above/below alternating.
 */
export const TimelineSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const milestones = spec.timeline?.milestones ?? [];
  const isGradient = spec.surface === "gradient";

  const headlineProgress = useSpring("emphasis", frame, fps, 4);
  const railProgress = useSpring("smooth", frame, fps, 16);

  const n = Math.max(milestones.length, 1);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 72px",
        gap: 80,
      }}
    >
      {spec.headline && (
        <div
          style={{
            fontSize: typeScale.lg,
            fontWeight: weights.black,
            lineHeight: 1.1,
            color: isGradient ? colors.white : colors.textDark,
            textAlign: "center",
            letterSpacing: "-0.02em",
            maxWidth: 880,
            margin: "0 auto",
            opacity: headlineProgress,
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [14, 0])}px)`,
          }}
        >
          {spec.headline}
        </div>
      )}
      <div style={{ position: "relative", height: 320, width: "100%" }}>
        {/* rail */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 40,
            right: 40,
            height: 6,
            background: isGradient
              ? "rgba(188,172,139,0.22)"
              : "rgba(48,59,47,0.18)",
            borderRadius: 3,
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 40,
            width: `calc((100% - 80px) * ${railProgress})`,
            height: 6,
            background: `linear-gradient(90deg, ${colors.accentGold}, ${isGradient ? colors.white : colors.primary})`,
            borderRadius: 3,
            transform: "translateY(-50%)",
            boxShadow: `0 0 14px ${colors.accentGold}`,
          }}
        />
        {/* milestones */}
        {milestones.map((m, i) => {
          const leftPct = n === 1 ? 50 : (i / (n - 1)) * 100;
          const delay = 24 + i * 7;
          const dotProgress = useSpring("emphasis", frame, fps, delay);
          const labelProgress = useSpring("enter", frame, fps, delay + 4);
          const above = i % 2 === 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%",
                left: `calc(40px + (100% - 80px) * ${leftPct / 100})`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: colors.accentGold,
                  border: `3px solid ${isGradient ? colors.white : colors.primary}`,
                  transform: `scale(${dotProgress})`,
                  boxShadow: `0 0 18px ${colors.accentGold}`,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  [above ? "bottom" : "top"]: 32,
                  transform: "translateX(-50%)",
                  opacity: labelProgress,
                  padding: "12px 18px",
                  background: isGradient
                    ? "rgba(255,255,255,0.08)"
                    : colors.white,
                  border: `1px solid ${isGradient ? "rgba(255,255,255,0.18)" : colors.lightBorder}`,
                  borderRadius: radii.md,
                  minWidth: 140,
                  textAlign: "center",
                  whiteSpace: "nowrap",
                } as React.CSSProperties}
              >
                {m.time && (
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: weights.bold,
                      color: colors.accentGold,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {m.time}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: weights.semibold,
                    color: isGradient ? colors.white : colors.textDark,
                    marginTop: m.time ? 4 : 0,
                  }}
                >
                  {m.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
