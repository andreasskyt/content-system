import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { useSpring } from "../easing";
import { DataFlow } from "../components/DataFlow";

/**
 * Showpiece — headline on top, animated node chain below with a pulse that
 * loops across the chain. Visualizes an automation pipeline (e.g. Notion →
 * Claude → Gmail).
 */
export const DataFlowSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flow = spec.flow ?? {
    nodes: [
      { label: "Notion", emoji: "📝" },
      { label: "Claude", emoji: "🤖" },
      { label: "Gmail", emoji: "✉️" },
    ],
  };

  const headlineProgress = useSpring("emphasis", frame, fps, 4);

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
        gap: 64,
      }}
    >
      <div
        style={{
          fontSize: typeScale.lg,
          fontWeight: weights.black,
          lineHeight: 1.1,
          color: spec.surface === "gradient" ? colors.white : colors.textDark,
          textAlign: "center",
          letterSpacing: "-0.02em",
          maxWidth: 880,
          opacity: headlineProgress,
          transform: `translateY(${interpolate(headlineProgress, [0, 1], [14, 0])}px)`,
        }}
      >
        {spec.headline ?? "One prompt. Three systems."}
      </div>
      <DataFlow
        nodes={flow.nodes}
        highlight={flow.highlight}
        delay={18}
      />
      {spec.subhead && (
        <div
          style={{
            fontSize: typeScale.base,
            fontWeight: weights.semibold,
            color:
              spec.surface === "gradient"
                ? "rgba(255,255,255,0.8)"
                : colors.textMuted,
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.3,
            opacity: useSpring("enter", frame, fps, 50),
          }}
        >
          {spec.subhead}
        </div>
      )}
    </div>
  );
};
