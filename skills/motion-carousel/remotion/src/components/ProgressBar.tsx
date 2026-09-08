import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colors, type Surface } from "../theme";

export const ProgressBar: React.FC<{
  index: number;
  total: number;
  surface: Surface;
}> = ({ index, total, surface }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startPct = total > 0 ? (index / total) * 100 : 0;
  const endPct = total > 0 ? ((index + 1) / total) * 100 : 0;

  const grow = interpolate(frame, [0, fps * 0.4], [startPct, endPct], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const onGradient = surface === "gradient" || surface === "black";
  const track = onGradient ? "rgba(255,255,255,0.22)" : "rgba(26,25,24,0.12)";
  const fill = onGradient ? colors.accentGold : colors.primary;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        right: 72,
        bottom: 56,
        height: 8,
        borderRadius: 4,
        background: track,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${grow}%`,
          height: "100%",
          borderRadius: 4,
          background: fill,
          transition: "none",
        }}
      />
    </div>
  );
};
