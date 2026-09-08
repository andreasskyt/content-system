import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { KineticText } from "../components/KineticText";
import { Mark } from "../components/Mark";

/**
 * Archetype A — big gradient hook. Headline enters word-by-word; one emphasized
 * word anchors the eye (underline, highlight, or circle). Subhead fades up
 * after the headline settles.
 */
export const HeroSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const { headline = "", emphasisWord, emphasisStyle = "underline", subhead } = spec;
  const words = headline.split(" ");

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
          fontSize: typeScale.hero,
          fontWeight: weights.black,
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          color: colors.white,
          textShadow: "0 2px 18px rgba(0,0,0,0.25)",
        }}
      >
        {words.map((word, i) => {
          const stripped = word.replace(/[.,!?:;]/g, "");
          const isEmphasized =
            !!emphasisWord &&
            stripped.toLowerCase() === emphasisWord.toLowerCase();
          return (
            <span
              key={i}
              style={{ display: "inline-block", marginRight: "0.22em" }}
            >
              {isEmphasized ? (
                <Mark variant={emphasisStyle} delay={14 + i * 5}>
                  <KineticText text={word} delay={10 + i * 4} splitBy="word" />
                </Mark>
              ) : (
                <KineticText text={word} delay={10 + i * 4} splitBy="word" />
              )}
            </span>
          );
        })}
      </div>
      {subhead && (
        <div
          style={{
            marginTop: 48,
            fontSize: typeScale.base,
            fontWeight: weights.regular,
            lineHeight: 1.35,
            color: "rgba(255,255,255,0.82)",
            maxWidth: 780,
          }}
        >
          <KineticText text={subhead} delay={44} splitBy="word" />
        </div>
      )}
    </div>
  );
};
