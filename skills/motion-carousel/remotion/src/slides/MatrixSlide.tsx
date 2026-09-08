import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, fonts, weights } from "../theme";
import { useSpring } from "../easing";
import { SketchMatrix } from "../components/SketchMatrix";

/**
 * Archetype — the notebook 2x2. Headline on top, the hand-drawn matrix in the
 * middle (constant position on every slide), body + open-loop line below.
 * The matrix itself is driven by spec.matrix.stage; see SketchMatrix.
 */
export const MatrixSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = spec.matrix ?? { stage: 0 as const };
  const stage = m.stage;

  // Body waits for the drawing on quadrant slides; on the axes slide it waits for the labels.
  const bodyDelay = stage === 0 ? 120 : stage === 5 ? 40 : 78;
  const headP = m.teaser ? 1 : useSpring("enter", frame, fps, 4);
  const bodyP = useSpring("enter", frame, fps, bodyDelay);
  const subP = useSpring("enter", frame, fps, bodyDelay + 22);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          top: 92,
          left: 72,
          right: 72,
          textAlign: "center",
          fontFamily: fonts.siteDisplay,
          fontSize: 64,
          fontWeight: weights.bold,
          lineHeight: 1.04,
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
          color: colors.white,
          whiteSpace: "pre-line",
          textWrap: "balance",
          opacity: headP,
          transform: `translateY(${interpolate(headP, [0, 1], [14, 0])}px)`,
        } as React.CSSProperties}
      >
        {spec.headline}
      </div>

      {m.textOnly ? (
        <SpectrumBody spec={spec} />
      ) : (
      <SketchMatrix
        stage={stage}
        teaser={m.teaser}
        axisX={m.axisX ?? ["you start it", "it starts itself"]}
        axisY={m.axisY ?? ["same every time", "different every time"]}
        labels={m.labels ?? ["on demand", "automate it", "AI assists, you decide", "AI decides, you check"]}
      />
      )}

      {!m.textOnly && (
      <div
        style={{
          position: "absolute",
          top: 948,
          left: 96,
          right: 96,
          bottom: 84,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          textAlign: "center",
        }}
      >
        {spec.body && (
          <div
            style={{
              fontFamily: fonts.siteBody,
              fontSize: 30,
              lineHeight: 1.42,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 900,
              opacity: bodyP,
              transform: `translateY(${interpolate(bodyP, [0, 1], [18, 0])}px)`,
            }}
          >
            {spec.body}
          </div>
        )}
        {spec.subhead && (
          <div
            style={{
              fontFamily: "Caveat, 'Bradley Hand', cursive",
              fontWeight: 600,
              fontSize: 42,
              lineHeight: 1.1,
              color: colors.accentGold,
              opacity: subP,
              transform: `translateY(${interpolate(subP, [0, 1], [14, 0])}px)`,
            }}
          >
            {spec.subhead}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

/** Closer without the matrix: body, then "Label: text" rows, then a closing line. */
const SpectrumBody: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = spec.items ?? [];
  const bodyP = useSpring("enter", frame, fps, 26);
  const closeP = useSpring("enter", frame, fps, 60 + items.length * 8);

  return (
    <div
      style={{
        position: "absolute",
        top: 300,
        left: 96,
        right: 96,
        bottom: 110,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 44,
      }}
    >
      {spec.body && (
        <div
          style={{
            fontFamily: fonts.siteBody,
            fontSize: 34,
            lineHeight: 1.4,
            textAlign: "center",
            color: "rgba(255,255,255,0.9)",
            maxWidth: 860,
            opacity: bodyP,
            transform: `translateY(${interpolate(bodyP, [0, 1], [16, 0])}px)`,
          }}
        >
          {spec.body}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%", maxWidth: 880 }}>
        {items.map((item, i) => {
          const p = useSpring("enter", frame, fps, 48 + i * 8);
          const idx = item.indexOf(":");
          const label = idx > 0 ? item.slice(0, idx) : "";
          const text = idx > 0 ? item.slice(idx + 1).trim() : item;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 18,
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-18, 0])}px)`,
              }}
            >
              {label && (
                <span
                  style={{
                    fontFamily: "Caveat, 'Bradley Hand', cursive",
                    fontWeight: 700,
                    fontSize: 46,
                    color: colors.accentGold,
                    whiteSpace: "nowrap",
                    minWidth: 250,
                  }}
                >
                  {label}
                </span>
              )}
              <span style={{ fontFamily: fonts.siteBody, fontSize: 30, lineHeight: 1.35, color: "rgba(255,255,255,0.88)" }}>{text}</span>
            </div>
          );
        })}
      </div>
      {spec.subhead && (
        <div
          style={{
            fontFamily: fonts.siteDisplay,
            fontSize: 40,
            fontWeight: weights.bold,
            letterSpacing: "-0.02em",
            lineHeight: 1.3,
            textAlign: "center",
            color: colors.white,
            maxWidth: 860,
            opacity: closeP,
            transform: `translateY(${interpolate(closeP, [0, 1], [14, 0])}px)`,
          }}
        >
          {spec.subhead.split("\n").map((line, i) => (
            <div key={i}>{renderInline(line)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// *word* → gold, _word_ → italic. Only used by the spectrum closer.
function renderInline(line: string): React.ReactNode[] {
  const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("*")) return <span key={i} style={{ color: colors.accentGold }}>{part.slice(1, -1)}</span>;
    if (part.startsWith("_")) return <em key={i} style={{ fontFamily: fonts.siteEmphasis, fontStyle: "italic", fontWeight: 400, fontSize: "1.06em", color: colors.accentGold }}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}
