import {
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { useSpring } from "../easing";
import { TerminalWindow } from "../components/TerminalWindow";

/**
 * Showpiece — headline + glass terminal that types a command live. Proves the
 * claim by showing it happen in real time rather than screenshotting it.
 */
export const TerminalDemoSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const terminal = spec.terminal ?? {
    command: "npm install @anthropic-ai/claude-code",
    durationSec: 2,
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
        padding: "0 96px",
        gap: 48,
      }}
    >
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
        {spec.headline ?? "30 seconds to install."}
      </div>
      <TerminalWindow
        command={terminal.command}
        prompt={terminal.prompt}
        durationSec={terminal.durationSec ?? 2}
        output={terminal.output ?? []}
        delay={20}
      />
    </div>
  );
};
