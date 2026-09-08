import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { colors, fonts, radii, weights } from "../theme";
import { useSpring } from "../easing";

type Props = {
  command: string;
  prompt?: string;
  durationSec?: number;
  output?: string[];
  delay?: number;
};

/**
 * Glassmorphism terminal that types a command in real-time.
 * Output lines appear after the command finishes, staggered.
 */
export const TerminalWindow: React.FC<Props> = ({
  command,
  prompt = "~/brand $",
  durationSec = 2.0,
  output = [],
  delay = 12,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = useSpring("enter", frame, fps, delay);
  const cardScale = interpolate(appear, [0, 1], [0.96, 1]);
  const cardOpacity = interpolate(appear, [0, 1], [0, 1]);

  const typeStart = delay + 10;
  const typeDuration = durationSec * fps;
  const typedCount = Math.floor(
    interpolate(frame, [typeStart, typeStart + typeDuration], [0, command.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const typed = command.slice(0, typedCount);
  const typingDone = typedCount >= command.length;
  const cursorOn = Math.floor((frame / fps) * 2) % 2 === 0;

  const outputStart = typeStart + typeDuration + 6;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 860,
        transform: `scale(${cardScale})`,
        opacity: cardOpacity,
        background: "rgba(22, 27, 21, 0.55)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: radii.lg,
        boxShadow: "0 30px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
        padding: "28px 32px",
        color: colors.white,
        fontFamily: fonts.mono,
      }}
    >
      <TerminalDots />
      <div
        style={{
          marginTop: 20,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          fontSize: 32,
          lineHeight: 1.45,
          fontWeight: weights.regular,
        }}
      >
        <span style={{ color: colors.accentGold, marginRight: 14 }}>{prompt}</span>
        <span style={{ color: colors.white }}>
          {typed}
          {(!typingDone || cursorOn) && (
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 28,
                marginLeft: 2,
                background: colors.white,
                transform: "translateY(6px)",
                opacity: cursorOn ? 1 : 0,
              }}
            />
          )}
        </span>
      </div>
      {output.map((line, i) => {
        const lineStart = outputStart + i * 8;
        const lineProgress = useSpring("enter", frame, fps, lineStart);
        return (
          <div
            key={i}
            style={{
              marginTop: i === 0 ? 18 : 8,
              fontSize: 26,
              color: "rgba(255,255,255,0.82)",
              opacity: lineProgress,
              transform: `translateY(${interpolate(lineProgress, [0, 1], [8, 0])}px)`,
            }}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

const TerminalDots: React.FC = () => (
  <div style={{ display: "flex", gap: 10 }}>
    {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
      <span
        key={c}
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: c,
          opacity: 0.85,
        }}
      />
    ))}
  </div>
);
