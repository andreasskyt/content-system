import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AnimatedCounter } from "remotion-bits";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights, radii } from "../theme";
import { useSpring, STAGGER } from "../easing";

/**
 * Horizontal bar chart. Bars grow in width with smooth spring, values count
 * up with AnimatedCounter. One bar can be highlighted (gold, bigger value).
 */
export const ChartBarsSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const chart = spec.chart ?? { bars: [] };
  const isGradient = spec.surface === "gradient";

  const headlineProgress = useSpring("emphasis", frame, fps, 4);
  const values = chart.bars.map((b) => b.value);
  const maxValue = chart.max ?? Math.max(...values, 1);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 72px",
        gap: 48,
      }}
    >
      {spec.headline && (
        <div
          style={{
            fontSize: typeScale.lg,
            fontWeight: weights.black,
            lineHeight: 1.08,
            color: isGradient ? colors.white : colors.textDark,
            letterSpacing: "-0.02em",
            opacity: headlineProgress,
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [14, 0])}px)`,
          }}
        >
          {spec.headline}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {chart.bars.map((bar, i) => {
          const delay = 18 + i * STAGGER * 2;
          const grow = useSpring("smooth", frame, fps, delay);
          const appear = useSpring("enter", frame, fps, delay);
          const widthPct = (bar.value / maxValue) * 100 * grow;
          const highlight = bar.highlight;
          const barColor = highlight
            ? colors.accentGold
            : isGradient
              ? "rgba(255,255,255,0.8)"
              : colors.primary;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                opacity: appear,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span
                  style={{
                    fontSize: typeScale.sm,
                    fontWeight: weights.semibold,
                    color: isGradient ? colors.white : colors.textDark,
                    letterSpacing: 0.5,
                  }}
                >
                  {bar.label}
                </span>
                <span
                  style={{
                    fontSize: typeScale.base,
                    fontWeight: weights.black,
                    color: highlight
                      ? colors.accentGold
                      : isGradient
                        ? colors.white
                        : colors.primary,
                    letterSpacing: "-0.02em",
                  }}
                >
                  <AnimatedCounter
                    transition={{
                      values: [0, bar.value],
                      duration: 28,
                      easing: "easeOutCubic",
                    }}
                    prefix={bar.prefix ?? ""}
                    postfix={bar.suffix ?? ""}
                    toFixed={Number.isInteger(bar.value) ? 0 : 1}
                  />
                </span>
              </div>
              <div
                style={{
                  height: highlight ? 44 : 36,
                  width: "100%",
                  background: isGradient
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(48,59,47,0.08)",
                  borderRadius: radii.pill,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${widthPct}%`,
                    background: highlight
                      ? `linear-gradient(90deg, ${colors.accentGold}, #FFD88A)`
                      : barColor,
                    borderRadius: radii.pill,
                    boxShadow: highlight
                      ? `0 0 20px rgba(188,172,139,0.5)`
                      : undefined,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
