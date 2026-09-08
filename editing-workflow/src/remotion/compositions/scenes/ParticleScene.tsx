import { AbsoluteFill } from "remotion";
import { AnimatedText, Particles, Spawner, Behavior, useViewportRect } from "remotion-bits";

interface Props {
  headline?: string;
  particleStyle?: "fireflies" | "rising" | "confetti" | "snow" | "grid" | "flying-words";
  bgColor: string;
  fps: number;
}

export const ParticleScene: React.FC<Props> = ({
  headline,
  particleStyle = "fireflies",
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";

  return (
    <AbsoluteFill>
      {/* Particle layer */}
      <AbsoluteFill style={{ opacity: 0.25 }}>
        <Particles>
          {particleStyle === "fireflies" && (
            <>
              <Spawner
                rate={0.6}
                max={30}
                lifespan={90}
                position={{ x: rect.width / 2, y: rect.height / 2 }}
                area={{ width: rect.width, height: rect.height }}
                velocity={{ x: 0, y: -0.15, varianceX: 0.2, varianceY: 0.1 }}
              >
                <div style={{ width: rect.vmin * 0.8, height: rect.vmin * 0.8, borderRadius: "50%", backgroundColor: "#BCAC8B", boxShadow: "0 0 10px #BCAC8B" }} />
              </Spawner>
              <Behavior opacity={[0, 1, 1, 0]} scale={{ start: 0.3, end: 1.2 }} wiggle={{ magnitude: 0.3, frequency: 0.05 }} />
            </>
          )}
          {particleStyle === "rising" && (
            <>
              <Spawner
                rate={1.2}
                max={50}
                lifespan={80}
                position={{ x: rect.width / 2, y: rect.height }}
                area={{ width: rect.width, height: 10 }}
                velocity={{ x: 0, y: -2, varianceX: 0.4, varianceY: 0.5 }}
              >
                <div style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#BCAC8B" }} />
              </Spawner>
              <Behavior opacity={[0, 0.8, 0.8, 0]} scale={{ start: 0.5, end: 1.5 }} />
            </>
          )}
          {particleStyle === "confetti" && (
            <>
              <Spawner
                burst={40}
                max={40}
                lifespan={100}
                position={{ x: rect.width / 2, y: rect.height * 0.3 }}
                velocity={{ x: 0, y: -3, varianceX: 5, varianceY: 2 }}
              >
                <div style={{ width: rect.vmin * 0.8, height: rect.vmin * 1, backgroundColor: "#BCAC8B", borderRadius: 2 }} />
                <div style={{ width: rect.vmin * 1, height: rect.vmin * 0.6, backgroundColor: "#FFFFFF", borderRadius: 2 }} />
                <div style={{ width: rect.vmin * 0.7, height: rect.vmin * 0.8, backgroundColor: "#303b2f", borderRadius: 2 }} />
              </Spawner>
              <Behavior gravity={{ y: 0.08 }} drag={0.01} wiggle={{ magnitude: 0.8, frequency: 0.1 }} opacity={[0, 1, 1, 0.5, 0]} scale={{ start: 1, end: 0.3 }} />
            </>
          )}
          {particleStyle === "snow" && (
            <>
              <Spawner
                rate={1.5}
                max={60}
                lifespan={120}
                position={{ x: rect.width / 2, y: -10 }}
                area={{ width: rect.width, height: 10 }}
                velocity={{ x: 0, y: 1, varianceX: 0.3, varianceY: 0.3 }}
              >
                <div style={{ width: rect.vmin * 0.5, height: rect.vmin * 0.5, borderRadius: "50%", backgroundColor: "#FFFFFF" }} />
                <div style={{ width: rect.vmin * 0.3, height: rect.vmin * 0.3, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.7)" }} />
              </Spawner>
              <Behavior opacity={[0, 0.8, 0.8, 0]} wiggle={{ magnitude: 0.5, frequency: 0.03 }} scale={{ start: 0.8, end: 1.2 }} />
            </>
          )}
          {particleStyle === "grid" && (
            <>
              <Spawner
                burst={36}
                max={36}
                lifespan={150}
                position={{ x: rect.width / 2, y: rect.height / 2 }}
                area={{ width: rect.width * 0.7, height: rect.height * 0.5 }}
                velocity={{ x: 0, y: 0, varianceX: 0, varianceY: 0 }}
              >
                <div style={{ width: rect.vmin * 1, height: rect.vmin * 1, borderRadius: "50%", backgroundColor: "#BCAC8B" }} />
              </Spawner>
              <Behavior opacity={[0, 0.6, 0.6, 0]} scale={{ start: 0, end: 1 }} />
            </>
          )}
          {particleStyle === "flying-words" && (
            <>
              <Spawner
                rate={1}
                max={30}
                lifespan={70}
                position={{ x: rect.width / 2, y: rect.height / 2 }}
                area={{ width: rect.width * 0.8, height: rect.height * 0.6 }}
                velocity={{ x: 0, y: 0, varianceX: 0.4, varianceY: 0.4 }}
              >
                <span style={{ fontSize: rect.vmin * 1.5, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 300, opacity: 0.6 }}>●</span>
                <span style={{ fontSize: rect.vmin * 2, color: "rgba(188,172,139,0.4)", fontFamily: "monospace" }}>→</span>
                <span style={{ fontSize: rect.vmin * 1.5, color: "rgba(48,59,47,0.5)", fontFamily: "monospace" }}>○</span>
              </Spawner>
              <Behavior opacity={[0, 0.5, 0.5, 0]} scale={{ start: 0.3, end: 1.5 }} wiggle={{ magnitude: 0.2, frequency: 0.04 }} />
            </>
          )}
        </Particles>
      </AbsoluteFill>

      {/* Centered keyword */}
      {headline && (
        <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AnimatedText
            transition={{
              split: "character",
              splitStagger: 2,
              opacity: [0, 1],
              scale: [0.8, 1],
              blur: [4, 0],
              duration: 18,
              easing: "easeOutCubic",
            }}
            style={{
              fontSize: rect.vmin * 9,
              fontWeight: 700,
              color: textColor,
              fontFamily: "Poppins, system-ui, sans-serif",
              textAlign: "center",
              display: "block",
              width: "100%",
            }}
          >
            {headline}
          </AnimatedText>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
