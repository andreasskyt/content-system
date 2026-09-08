import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, radii, weights } from "../theme";
import { useSpring } from "../easing";

type Node = { label: string; emoji?: string };
type Props = {
  nodes: Node[];
  highlight?: string;
  delay?: number;
};

/**
 * Horizontal chain of nodes with a pulse traveling left→right along the path.
 * Each node scales in on a stagger; the pulse loops indefinitely while visible.
 */
export const DataFlow: React.FC<Props> = ({ nodes, highlight, delay = 8 }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const n = Math.max(nodes.length, 1);
  const cardW = 180;
  const cardH = 180;
  const spacing = (width - cardW * n - 144) / Math.max(n - 1, 1);
  const rowY = 0;

  // Pulse loops every 1.6 seconds traveling across the chain.
  const pulsePeriod = fps * 1.6;
  const pulsePos = ((frame - delay - 14) % pulsePeriod) / pulsePeriod;
  const pulseVisible = frame > delay + 14;

  const totalWidth = cardW * n + spacing * (n - 1);
  const pulseX = pulsePos * totalWidth;

  return (
    <div
      style={{
        position: "relative",
        width: totalWidth,
        height: cardH + 40,
        margin: "0 auto",
      }}
    >
      {/* connecting rail */}
      {n > 1 && (
        <div
          style={{
            position: "absolute",
            top: rowY + cardH / 2 - 4,
            left: cardW / 2,
            width: totalWidth - cardW,
            height: 8,
            borderRadius: 4,
            background: "rgba(188,172,139,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: interpolate(useSpring("smooth", frame, fps, delay + 8), [0, 1], [0, totalWidth - cardW]),
              background: `linear-gradient(90deg, ${colors.accentGold} 0%, rgba(188,172,139,0.4) 100%)`,
            }}
          />
        </div>
      )}

      {/* nodes */}
      {nodes.map((node, i) => {
        const x = i * (cardW + spacing);
        const nodeProgress = useSpring("emphasis", frame, fps, delay + i * 5);
        const scale = interpolate(nodeProgress, [0, 1], [0.8, 1]);
        const opacity = interpolate(nodeProgress, [0, 1], [0, 1]);
        const isHighlight = highlight && node.label === highlight;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: rowY,
              left: x,
              width: cardW,
              height: cardH,
              borderRadius: radii.lg,
              background: isHighlight
                ? "rgba(188,172,139,0.18)"
                : "rgba(255,255,255,0.06)",
              border: isHighlight
                ? `2px solid ${colors.accentGold}`
                : "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              transform: `scale(${scale})`,
              opacity,
              boxShadow: "0 12px 24px rgba(0,0,0,0.3)",
            }}
          >
            {node.emoji && (
              <span style={{ fontSize: 56, lineHeight: 1 }}>{node.emoji}</span>
            )}
            <span
              style={{
                color: colors.white,
                fontSize: 22,
                fontWeight: weights.semibold,
                textAlign: "center",
                padding: "0 8px",
              }}
            >
              {node.label}
            </span>
          </div>
        );
      })}

      {/* traveling pulse */}
      {pulseVisible && n > 1 && (
        <div
          style={{
            position: "absolute",
            top: rowY + cardH / 2 - 12,
            left: pulseX,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: colors.accentGold,
            boxShadow: `0 0 32px 12px rgba(188,172,139,0.55)`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
};
