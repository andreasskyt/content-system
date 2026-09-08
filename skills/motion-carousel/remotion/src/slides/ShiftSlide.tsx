import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { KineticText } from "../components/KineticText";

/**
 * Archetype E — single pivot line on gradient. One strong sentence, centered,
 * word-by-word entrance. Gold accent on the pivot word (subhead).
 */
export const ShiftSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
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
      }}
    >
      {spec.subhead && (
        <div
          style={{
            fontSize: typeScale.sm,
            fontWeight: weights.semibold,
            color: colors.accentGold,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 28,
          }}
        >
          <KineticText text={spec.subhead} delay={6} splitBy="word" />
        </div>
      )}
      <div
        style={{
          fontSize: typeScale.xl,
          fontWeight: weights.black,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          color: colors.white,
          maxWidth: 820,
        }}
      >
        <KineticText text={spec.headline ?? ""} delay={14} splitBy="word" />
      </div>
    </div>
  );
};
