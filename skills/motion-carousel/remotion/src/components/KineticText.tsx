import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useSpring, STAGGER } from "../easing";

type Props = {
  text: string;
  delay?: number;
  splitBy?: "word" | "char";
  style?: React.CSSProperties;
  className?: string;
};

export const KineticText: React.FC<Props> = ({
  text,
  delay = 0,
  splitBy = "word",
  style,
  className,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tokens = splitBy === "char" ? Array.from(text) : text.split(" ");

  return (
    <span style={{ display: "inline-block", ...style }} className={className}>
      {tokens.map((token, i) => {
        const tokenDelay = delay + i * STAGGER;
        const progress = useSpring("enter", frame, fps, tokenDelay);
        const y = interpolate(progress, [0, 1], [24, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              transform: `translateY(${y}px)`,
              opacity,
              marginRight: splitBy === "word" ? "0.28em" : 0,
              whiteSpace: "pre",
            }}
          >
            {token === " " ? "\u00A0" : token}
          </span>
        );
      })}
    </span>
  );
};
