import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { CodeBlock } from "remotion-bits";
import type { SlideSpec } from "../CarouselSlide";
import { colors, fonts, radii, typeScale, weights } from "../theme";
import { useSpring } from "../easing";

/**
 * Showpiece — multi-line syntax-highlighted code reveal. For snippets too long
 * or structured for `terminal-demo` (config files, React components, SQL).
 * Lines reveal top-down with a left-edge bar wipe.
 */
export const CodeRevealSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const code = spec.code ?? { content: "// paste code here", language: "tsx" };

  const headlineProgress = useSpring("emphasis", frame, fps, 4);
  const cardProgress = useSpring("enter", frame, fps, 14);
  const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);
  const cardScale = interpolate(cardProgress, [0, 1], [0.96, 1]);

  // Line-by-line reveal: count visible lines by frame.
  const totalLines = code.content.split("\n").length;
  const lineRevealStart = 22;
  const lineRevealDur = Math.max(totalLines * 4, 24);
  const visibleLines = Math.round(
    interpolate(
      frame,
      [lineRevealStart, lineRevealStart + lineRevealDur],
      [0, totalLines],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );
  const maskHeightPct = (visibleLines / totalLines) * 100;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "0 72px",
        gap: 40,
      }}
    >
      {spec.headline && (
        <div
          style={{
            fontSize: typeScale.lg,
            fontWeight: weights.black,
            lineHeight: 1.1,
            color: colors.white,
            textAlign: "center",
            letterSpacing: "-0.02em",
            maxWidth: 880,
            opacity: headlineProgress,
            transform: `translateY(${interpolate(headlineProgress, [0, 1], [14, 0])}px)`,
          }}
        >
          {spec.headline}
        </div>
      )}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 900,
          opacity: cardOpacity,
          transform: `scale(${cardScale})`,
          background: "rgba(22, 27, 21, 0.6)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: radii.lg,
          padding: 24,
          boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
          fontFamily: fonts.mono,
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span
              key={c}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: c,
                opacity: 0.85,
              }}
            />
          ))}
          {code.language && (
            <span
              style={{
                marginLeft: 12,
                color: colors.accentGold,
                fontSize: 18,
                fontWeight: weights.semibold,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {code.language}
            </span>
          )}
        </div>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 12,
          }}
        >
          <div
            style={{
              maskImage: `linear-gradient(to bottom, #000 ${maskHeightPct}%, transparent ${maskHeightPct}%)`,
              WebkitMaskImage: `linear-gradient(to bottom, #000 ${maskHeightPct}%, transparent ${maskHeightPct}%)`,
            }}
          >
            <CodeBlock
              code={code.content}
              language={code.language ?? "tsx"}
              theme="dark"
              showLineNumbers={true}
              fontSize={24}
              lineHeight={1.5}
              padding={20}
              lineNumberColor="rgba(188,172,139,0.5)"
              style={{ background: "transparent" }}
            />
          </div>
          {/* Scanner bar under the reveal edge */}
          {visibleLines < totalLines && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: `${maskHeightPct}%`,
                height: 2,
                background: `linear-gradient(90deg, transparent 0%, ${colors.accentGold} 50%, transparent 100%)`,
                boxShadow: `0 0 18px ${colors.accentGold}`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
