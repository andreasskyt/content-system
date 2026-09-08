import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { AnimatedText } from "remotion-bits";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { useSpring } from "../easing";

/**
 * Oversized quote. Huge opening quote mark scales in, quote text writes across
 * word by word, attribution slides up last. Works on any surface.
 */
export const QuoteSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isGradient = spec.surface === "gradient";
  const quote = spec.quote ?? { text: spec.headline ?? "", attribution: spec.subhead };

  const markProgress = useSpring("emphasis", frame, fps, 2);
  const markScale = interpolate(markProgress, [0, 1], [0.5, 1]);
  const markOpacity = interpolate(markProgress, [0, 1], [0, 0.22]);

  const attributionProgress = useSpring("enter", frame, fps, 48);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 96px",
        gap: 32,
      }}
    >
      <div
        style={{
          fontSize: 340,
          fontFamily: "Georgia, serif",
          fontWeight: weights.black,
          lineHeight: 0.8,
          color: isGradient ? colors.accentGold : colors.primary,
          opacity: markOpacity,
          transform: `scale(${markScale})`,
          transformOrigin: "left top",
          marginTop: -100,
          marginBottom: -180,
          userSelect: "none",
        }}
      >
        “
      </div>
      <div
        style={{
          fontSize: typeScale.xl,
          fontWeight: weights.bold,
          lineHeight: 1.1,
          color: isGradient ? colors.white : colors.textDark,
          letterSpacing: "-0.02em",
          maxWidth: 860,
        }}
      >
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 3,
            opacity: [0, 1],
            y: [18, 0],
            duration: 16,
          }}
        >
          {quote.text}
        </AnimatedText>
      </div>
      {quote.attribution && (
        <div
          style={{
            marginTop: 24,
            display: "flex",
            alignItems: "center",
            gap: 18,
            opacity: attributionProgress,
            transform: `translateY(${interpolate(attributionProgress, [0, 1], [14, 0])}px)`,
          }}
        >
          <span
            style={{
              width: 48,
              height: 3,
              background: isGradient ? colors.accentGold : colors.primary,
              borderRadius: 2,
            }}
          />
          <span
            style={{
              fontSize: typeScale.sm,
              fontWeight: weights.semibold,
              color: isGradient ? "rgba(255,255,255,0.78)" : colors.textMuted,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            {quote.attribution}
          </span>
        </div>
      )}
    </div>
  );
};
