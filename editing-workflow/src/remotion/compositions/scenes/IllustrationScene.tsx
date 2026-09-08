import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedText, Particles, Spawner, Behavior, useViewportRect } from "remotion-bits";

interface Props {
  imageSrc?: string;
  headline?: string;
  bgColor: string;
  fps: number;
}

export const IllustrationScene: React.FC<Props> = ({
  imageSrc,
  headline,
  bgColor,
  fps,
}) => {
  const frame = useCurrentFrame();
  const rect = useViewportRect();
  const { durationInFrames } = useVideoConfig();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";

  // Fade in over 0.3s
  const fadeIn = interpolate(frame, [0, Math.round(fps * 0.3)], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Slow Ken Burns zoom: 1.0 → 1.08 over full duration
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {imageSrc && (
        <AbsoluteFill>
          <Img
            src={imageSrc.startsWith("broll-inspiration/") ? staticFile(imageSrc) : imageSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${scale})`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* Subtle floating particles */}
      <AbsoluteFill style={{ pointerEvents: "none", opacity: 0.3 }}>
        <Particles>
          <Spawner
            rate={0.3}
            max={15}
            lifespan={90}
            position={{ x: rect.width / 2, y: rect.height / 2 }}
            area={{ width: rect.width, height: rect.height }}
            velocity={{ x: 0, y: -0.3, varianceX: 0.2, varianceY: 0.15 }}
          >
            <div
              style={{
                width: rect.vmin * 0.8,
                height: rect.vmin * 0.8,
                borderRadius: "50%",
                backgroundColor: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.3)",
              }}
            />
          </Spawner>
          <Behavior
            opacity={[0, 1, 1, 0]}
            scale={{ start: 0.5, end: 1.2 }}
          />
        </Particles>
      </AbsoluteFill>

      {headline && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: rect.vmin * 8,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              padding: `${rect.vmin * 1.5}px ${rect.vmin * 4}px`,
              borderRadius: rect.vmin * 1,
            }}
          >
            <AnimatedText
              transition={{
                split: "word",
                splitStagger: 3,
                opacity: [0, 1],
                y: [rect.vmin * 2, 0],
                duration: Math.round(fps * 0.6),
                delay: Math.round(fps * 0.3),
                easing: "easeOutCubic",
              }}
              style={{
                fontSize: rect.vmin * 5,
                fontWeight: 700,
                color: "#FFFFFF",
                fontFamily: "Poppins, system-ui, sans-serif",
                textAlign: "center",
              }}
            >
              {headline}
            </AnimatedText>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
