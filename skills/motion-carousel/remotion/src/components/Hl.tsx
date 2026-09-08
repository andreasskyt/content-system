import { interpolate, useCurrentFrame } from "remotion";
import { useSpring } from "../easing";
import { colors } from "../theme";

/**
 * Hand-drawn red underline that draws on over ~12 frames.
 * Wraps its children inline; underline stroke animates via stroke-dashoffset.
 */
export const Hl: React.FC<{
  children: React.ReactNode;
  delay?: number;
  fps?: number;
}> = ({ children, delay = 12, fps = 30 }) => {
  const frame = useCurrentFrame();
  const progress = useSpring("emphasis", frame, fps, delay);
  const dashLength = 420;
  const dashOffset = interpolate(progress, [0, 1], [dashLength, 0]);

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "0 2px",
      }}
    >
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
          <filter id="grain">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
            <feDisplacementMap in="SourceGraphic" scale="2.4" />
          </filter>
        </defs>
        <path
          d="M4,16 Q 110,6 210,14 T 416,12"
          fill="none"
          stroke={colors.underlineRed}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashOffset}
          filter="url(#grain)"
          opacity={0.92}
        />
      </svg>
    </span>
  );
};
