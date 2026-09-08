import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights, radii } from "../theme";
import { useSpring, STAGGER } from "../easing";

/**
 * Before/after split. Left column = old way (beige, red accents, strikethrough);
 * right column = new way (gradient card, gold checkmarks). Divider draws in
 * first, then columns stagger.
 */
export const ComparisonSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cmp = spec.comparison ?? {
    beforeLabel: "Before",
    beforeItems: [],
    afterLabel: "After",
    afterItems: [],
  };

  const headlineProgress = useSpring("emphasis", frame, fps, 4);
  const dividerProgress = useSpring("smooth", frame, fps, 12);
  const leftProgress = useSpring("enter", frame, fps, 20);
  const rightProgress = useSpring("enter", frame, fps, 26);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 56px",
        gap: 40,
      }}
    >
      {spec.headline && (
        <div
          style={{
            fontSize: typeScale.lg,
            fontWeight: weights.black,
            lineHeight: 1.08,
            color: spec.surface === "gradient" ? colors.white : colors.textDark,
            letterSpacing: "-0.02em",
            opacity: headlineProgress,
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [14, 0])}px)`,
            textAlign: "center",
            maxWidth: 960,
            margin: "0 auto",
          }}
        >
          {spec.headline}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "stretch",
          minHeight: 620,
        }}
      >
        <Column
          label={cmp.beforeLabel}
          items={cmp.beforeItems}
          variant="before"
          progress={leftProgress}
        />
        <div
          style={{
            width: 4,
            background: `linear-gradient(to bottom, transparent, ${colors.accentGold}, transparent)`,
            transform: `scaleY(${dividerProgress})`,
            transformOrigin: "top center",
            borderRadius: 2,
          }}
        />
        <Column
          label={cmp.afterLabel}
          items={cmp.afterItems}
          variant="after"
          progress={rightProgress}
        />
      </div>
    </div>
  );
};

const Column: React.FC<{
  label: string;
  items: string[];
  variant: "before" | "after";
  progress: number;
}> = ({ label, items, variant, progress }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isAfter = variant === "after";
  const bg = isAfter
    ? colors.gradient
    : "rgba(245, 241, 234, 0.88)";
  const labelColor = isAfter ? colors.accentGold : colors.underlineRed;
  const textColor = isAfter ? colors.white : colors.textDark;
  const x = interpolate(progress, [0, 1], [isAfter ? 20 : -20, 0]);

  return (
    <div
      style={{
        flex: 1,
        background: bg,
        borderRadius: radii.lg,
        padding: "36px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        opacity: progress,
        transform: `translateX(${x}px)`,
        boxShadow: isAfter
          ? "0 20px 40px rgba(0,0,0,0.35)"
          : "inset 0 0 0 1px rgba(26,25,24,0.08)",
      }}
    >
      <span
        style={{
          fontSize: typeScale.sm,
          fontWeight: weights.black,
          color: labelColor,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {items.map((item, i) => {
          const itemDelay = 28 + i * STAGGER * 2;
          const itemProgress = useSpring("enter", frame, fps, itemDelay);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                opacity: itemProgress,
                transform: `translateY(${interpolate(itemProgress, [0, 1], [8, 0])}px)`,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  fontSize: 28,
                  lineHeight: 1,
                  color: labelColor,
                  fontWeight: weights.black,
                }}
              >
                {isAfter ? "✓" : "✗"}
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: weights.semibold,
                  color: textColor,
                  lineHeight: 1.3,
                  textDecoration: isAfter ? "none" : "line-through",
                  textDecorationColor: colors.underlineRed,
                  textDecorationThickness: 2,
                }}
              >
                {item}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
