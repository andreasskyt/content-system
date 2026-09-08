import { interpolate, useCurrentFrame } from "remotion";
import { useSpring } from "../easing";
import { colors } from "../theme";

export type EmphasisStyle = "underline" | "highlight" | "circle";

type Props = {
  children: React.ReactNode;
  variant?: EmphasisStyle;
  delay?: number;
  fps?: number;
  color?: string;
};

/**
 * Emphasis mark around a word or phrase. Three variants — underline (red pen),
 * highlight (yellow marker), circle (hand-drawn green ring). Each draws on.
 */
export const Mark: React.FC<Props> = ({
  children,
  variant = "underline",
  delay = 12,
  fps = 30,
  color,
}) => {
  if (variant === "highlight") return <HighlightMark delay={delay} fps={fps} color={color}>{children}</HighlightMark>;
  if (variant === "circle") return <CircleMark delay={delay} fps={fps} color={color}>{children}</CircleMark>;
  return <UnderlineMark delay={delay} fps={fps} color={color}>{children}</UnderlineMark>;
};

const UnderlineMark: React.FC<Props> = ({ children, delay = 12, fps = 30, color }) => {
  const frame = useCurrentFrame();
  const progress = useSpring("emphasis", frame, fps, delay);
  const dashLength = 420;
  const dashOffset = interpolate(progress, [0, 1], [dashLength, 0]);
  const stroke = color ?? colors.underlineRed;

  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 2px" }}>
      <span style={{ position: "relative", zIndex: 2 }}>{children}</span>
      <svg
        viewBox="0 0 420 28"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          left: 0,
          bottom: -6,
          width: "100%",
          height: 22,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <defs>
          <filter id="mark-grain-u">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="2.4" />
          </filter>
        </defs>
        <path
          d="M4,16 Q 110,6 210,14 T 416,12"
          fill="none"
          stroke={stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashOffset}
          filter="url(#mark-grain-u)"
          opacity={0.92}
        />
      </svg>
    </span>
  );
};

const HighlightMark: React.FC<Props> = ({ children, delay = 10, fps = 30, color }) => {
  const frame = useCurrentFrame();
  const progress = useSpring("smooth", frame, fps, delay);
  const width = interpolate(progress, [0, 1], [0, 100]);
  const fill = color ?? "rgba(240, 215, 75, 0.55)";

  return (
    <span style={{ position: "relative", display: "inline-block", padding: "0 4px" }}>
      <span
        style={{
          position: "absolute",
          left: 0,
          bottom: 4,
          top: "20%",
          width: `${width}%`,
          background: fill,
          borderRadius: 2,
          zIndex: 0,
          transform: "skewX(-3deg)",
          filter: "blur(0.4px)",
        }}
      />
      <span style={{ position: "relative", zIndex: 2 }}>{children}</span>
    </span>
  );
};

const CircleMark: React.FC<Props> = ({ children, delay = 12, fps = 30, color }) => {
  const frame = useCurrentFrame();
  const progress = useSpring("emphasis", frame, fps, delay);
  const dashLength = 560;
  const dashOffset = interpolate(progress, [0, 1], [dashLength, 0]);
  const stroke = color ?? colors.accentGold;

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "8px 16px",
      }}
    >
      <span style={{ position: "relative", zIndex: 2 }}>{children}</span>
      <svg
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        style={{
          position: "absolute",
          inset: "-10% -6% -10% -6%",
          width: "112%",
          height: "120%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <defs>
          <filter id="mark-grain-c">
            <feTurbulence baseFrequency="0.8" numOctaves="2" seed="7" />
            <feDisplacementMap in="SourceGraphic" scale="1.8" />
          </filter>
        </defs>
        <path
          d="M 20,40 C 20,10 180,10 180,40 C 180,70 22,72 20,40 Z"
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashOffset}
          filter="url(#mark-grain-c)"
          opacity={0.9}
        />
      </svg>
    </span>
  );
};
