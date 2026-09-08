import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import {
  AnimatedText,
  AnimatedCounter,
  TypeWriter,
  GradientTransition,
  StaggeredMotion,
  CodeBlock,
  Particles,
  Spawner,
  Behavior,
  Scene3D,
  Step,
  Element3D,
  useViewportRect,
} from "remotion-bits";

// ── Scene 1: Glitch-In Title + Linear Gradient (0–4s) ────────────────────────

const GlitchTitle: React.FC = () => {
  const rect = useViewportRect();
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GradientTransition
        gradient={[
          "linear-gradient(135deg, #0a0a0a 0%, #1a2117 50%, #0a0a0a 100%)",
          "linear-gradient(135deg, #1a2117 0%, #0a0a0a 50%, #1a2117 100%)",
        ]}
        duration={120}
        easing="easeInOutCubic"
      />
      <AnimatedText
        transition={{
          split: "character",
          splitStagger: 2,
          opacity: [0, 1],
          glitch: [1, 0],
          duration: 20,
          easing: "easeOutCubic",
        }}
        style={{
          fontSize: rect.vmin * 7,
          fontWeight: 700,
          color: "#FFFFFF",
          fontFamily: "Poppins, system-ui, sans-serif",
          textAlign: "center",
          display: "block",
          width: "100%",
        }}
      >
        SOLVING HARD PROBLEMS
      </AnimatedText>
      <AnimatedText
        transition={{
          split: "word",
          splitStagger: 5,
          opacity: [0, 1],
          y: [rect.vmin * 3, 0],
          duration: 15,
          delay: 25,
          easing: "easeOutCubic",
        }}
        style={{
          fontSize: rect.vmin * 3.5,
          fontWeight: 400,
          color: "#BCAC8B",
          fontFamily: "Poppins, system-ui, sans-serif",
          textAlign: "center",
          display: "block",
          width: "100%",
          marginTop: rect.vmin * 2,
        }}
      >
        with software
      </AnimatedText>
    </AbsoluteFill>
  );
};

// ── Scene 2: CLI Simulation + Matrix Rain bg (4–8s) ──────────────────────────

const CLIScene: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Fireflies particle background */}
      <AbsoluteFill style={{ opacity: 0.15 }}>
        <Particles>
          <Spawner
            rate={0.5}
            max={30}
            lifespan={90}
            position={{ x: rect.width / 2, y: rect.height / 2 }}
            area={{ width: rect.width, height: rect.height }}
            velocity={{ x: 0, y: -0.2, varianceX: 0.3, varianceY: 0.2 }}
          >
            <div
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                backgroundColor: "#BCAC8B",
                boxShadow: "0 0 6px #BCAC8B",
              }}
            />
          </Spawner>
          <Behavior opacity={[0, 1, 1, 0]} scale={{ start: 0.5, end: 1.5 }} />
        </Particles>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: `0 ${rect.vw * 8}px`,
          gap: rect.vmin * 3,
        }}
      >
        <div
          style={{
            fontSize: rect.vmin * 2,
            color: "#555",
            fontFamily: "monospace",
          }}
        >
          <TypeWriter
            text="$ node solve-problem.ts"
            typeSpeed={2}
            cursor={false}
            style={{
              color: "#BCAC8B",
              fontSize: rect.vmin * 2.5,
              fontFamily: "monospace",
            }}
          />
        </div>
        <Sequence from={Math.round(fps * 1.2)}>
          <TypeWriter
            text={[
              "Analyzing complexity...",
              "Breaking into subproblems...",
              "Solution found ✓",
            ]}
            typeSpeed={2}
            deleteSpeed={1}
            pauseAfterType={20}
            pauseAfterDelete={5}
            style={{
              color: "#FFFFFF",
              fontSize: rect.vmin * 3,
              fontFamily: "monospace",
            }}
          />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 3: Counter Confetti + Radial Gradient (8–12s) ──────────────────────

const CounterScene: React.FC = () => {
  const rect = useViewportRect();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 70%)",
          "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a2117 70%)",
        ]}
        duration={120}
        easing="easeInOutCubic"
      />

      {/* Confetti particles that burst at counter completion */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Particles>
          <Spawner
            burst={40}
            max={40}
            lifespan={80}
            startFrame={Math.round(fps * 2)}
            position={{ x: rect.width / 2, y: rect.height / 2 }}
            velocity={{ x: 0, y: -3, varianceX: 4, varianceY: 2 }}
          >
            <div
              style={{
                width: rect.vmin * 1,
                height: rect.vmin * 1,
                backgroundColor: "#BCAC8B",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: rect.vmin * 0.8,
                height: rect.vmin * 1.2,
                backgroundColor: "#FFFFFF",
                borderRadius: 2,
              }}
            />
            <div
              style={{
                width: rect.vmin * 1.2,
                height: rect.vmin * 0.6,
                backgroundColor: "#303b2f",
                borderRadius: 2,
              }}
            />
          </Spawner>
          <Behavior
            gravity={{ y: 0.08 }}
            drag={0.01}
            wiggle={{ magnitude: 0.5, frequency: 0.1 }}
            opacity={[0, 1, 1, 0.5, 0]}
            scale={{ start: 1, end: 0.3 }}
          />
        </Particles>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: rect.vmin * 2,
        }}
      >
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 4,
            opacity: [0, 1],
            y: [rect.vmin * 3, 0],
            duration: 12,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 3.5,
            fontWeight: 500,
            color: "#BCAC8B",
            fontFamily: "Poppins, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textAlign: "center",
            display: "block",
            width: "100%",
          }}
        >
          Problems Solved
        </AnimatedText>
        <div
          style={{
            fontSize: rect.vmin * 14,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Poppins, system-ui, sans-serif",
          }}
        >
          <AnimatedCounter
            transition={{
              values: [0, 1247],
              duration: Math.round(fps * 2.5),
              delay: Math.round(fps * 0.3),
              easing: "easeOutCubic",
            }}
            toFixed={0}
            postfix={<span style={{ color: "#BCAC8B", fontSize: "50%" }}> +</span>}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 4: Grid Stagger Tool List (12–16s) ─────────────────────────────────

const GridStaggerScene: React.FC = () => {
  const rect = useViewportRect();
  const items = [
    "APIs", "Databases", "CI/CD", "Testing",
    "Caching", "Queues", "Auth", "Monitoring",
  ];
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <GradientTransition
        gradient={[
          "linear-gradient(180deg, #0a0a0a 0%, #1a2117 100%)",
          "linear-gradient(180deg, #1a2117 0%, #0a0a0a 100%)",
        ]}
        duration={120}
      />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: rect.vmin * 3,
          padding: `0 ${rect.vw * 6}px`,
        }}
      >
        <AnimatedText
          transition={{
            opacity: [0, 1],
            y: [rect.vmin * 2, 0],
            duration: 12,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 3.5,
            fontWeight: 500,
            color: "#BCAC8B",
            fontFamily: "Poppins, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textAlign: "center",
            display: "block",
            width: "100%",
          }}
        >
          The Toolkit
        </AnimatedText>
        <StaggeredMotion
          transition={{
            stagger: 4,
            staggerDirection: "center",
            opacity: [0, 1],
            scale: [0.5, 1],
            y: [30, 0],
            duration: 15,
            delay: 10,
            easing: "easeOutCubic",
          }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: rect.vmin * 2,
            width: "100%",
            maxWidth: rect.width * 0.85,
          }}
        >
          {items.map((item) => (
            <div
              key={item}
              style={{
                backgroundColor: "rgba(48,59,47,0.4)",
                border: "1px solid rgba(188,172,139,0.3)",
                borderRadius: rect.vmin * 1.5,
                padding: `${rect.vmin * 2}px ${rect.vmin * 1.5}px`,
                textAlign: "center",
                fontSize: rect.vmin * 2.8,
                fontWeight: 600,
                color: "#FFFFFF",
                fontFamily: "Poppins, system-ui, sans-serif",
              }}
            >
              {item}
            </div>
          ))}
        </StaggeredMotion>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 5: Code Block with line reveal (16–20s) ───────────────────────────

const CodeScene: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  const code = `async function solve(problem: Problem) {
  const parts = decompose(problem);
  const solutions = await Promise.all(
    parts.map(p => analyze(p))
  );
  return merge(solutions);
}`;
  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "radial-gradient(circle at 30% 50%, #1a2117 0%, #0a0a0a 60%)",
          "radial-gradient(circle at 70% 50%, #1a2117 0%, #0a0a0a 60%)",
        ]}
        duration={120}
      />
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `${rect.vmin * 4}px`,
        }}
      >
        <CodeBlock
          code={code}
          language="typescript"
          theme="dark"
          fontSize={rect.vmin * 2.5}
          lineHeight={1.7}
          padding={rect.vmin * 3}
          showLineNumbers
          lineNumberColor="#555"
          style={{
            borderRadius: rect.vmin * 1.5,
            width: "100%",
            maxWidth: rect.width * 0.9,
            border: "1px solid rgba(188,172,139,0.2)",
          }}
          transition={{
            opacity: [0, 1],
            y: [rect.vmin * 1, 0],
            duration: Math.round(fps * 0.25),
            lineStagger: 4,
            lineStaggerDirection: "forward",
            easing: "easeOutCubic",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 6: 3D Carousel (20–24s) ───────────────────────────────────────────

const CarouselScene: React.FC = () => {
  const rect = useViewportRect();
  const cards = ["Design", "Build", "Test", "Ship", "Scale"];
  const radius = rect.vmin * 25;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <AbsoluteFill style={{ opacity: 0.1 }}>
        <Particles>
          <Spawner
            rate={0.3}
            max={20}
            lifespan={120}
            position={{ x: rect.width / 2, y: rect.height / 2 }}
            area={{ width: rect.width, height: rect.height }}
            velocity={{ x: 0, y: 0, varianceX: 0.1, varianceY: 0.1 }}
          >
            <div
              style={{
                width: 2,
                height: 2,
                borderRadius: "50%",
                backgroundColor: "#BCAC8B",
              }}
            />
          </Spawner>
          <Behavior opacity={[0, 0.5, 0.5, 0]} />
        </Particles>
      </AbsoluteFill>

      <Scene3D
        perspective={1200}
        transitionDuration={60}
        easing="easeInOutCubic"
        stepDuration={24}
        width={rect.width}
        height={rect.height}
      >
        <Step rotateY={[0, 72]} duration={120}>
          {cards.map((label, i) => {
            const angle = (i / cards.length) * Math.PI * 2;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius - radius;
            return (
              <Element3D key={label} x={x} z={z} rotateY={-(angle * 180) / Math.PI}>
                <div
                  style={{
                    width: rect.vmin * 20,
                    height: rect.vmin * 14,
                    backgroundColor: "rgba(48,59,47,0.6)",
                    border: "1px solid rgba(188,172,139,0.4)",
                    borderRadius: rect.vmin * 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: rect.vmin * 4,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    fontFamily: "Poppins, system-ui, sans-serif",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  {label}
                </div>
              </Element3D>
            );
          })}
        </Step>
      </Scene3D>
    </AbsoluteFill>
  );
};

// ── Scene 7: Word by Word reveal + Fracture style (24–27s) ──────────────────

const WordRevealScene: React.FC = () => {
  const rect = useViewportRect();
  return (
    <AbsoluteFill>
      <GradientTransition
        gradient={[
          "linear-gradient(135deg, #0a0a0a 0%, #303b2f 100%)",
          "linear-gradient(135deg, #303b2f 0%, #0a0a0a 100%)",
        ]}
        duration={90}
        easing="easeInOutCubic"
      />
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: `0 ${rect.vw * 10}px`,
        }}
      >
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 6,
            opacity: [0, 1],
            blur: [10, 0],
            scale: [1.3, 1],
            duration: 12,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 8,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Poppins, system-ui, sans-serif",
            textAlign: "center",
            lineHeight: 1.3,
            display: "block",
            width: "100%",
          }}
        >
          Break It Down. Build It Up.
        </AnimatedText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Scene 8: Final — Flying Through Words + Statement (27–30s) ──────────────

const FinalScene: React.FC = () => {
  const rect = useViewportRect();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Flying through words particle effect */}
      <AbsoluteFill style={{ opacity: 0.12 }}>
        <Particles>
          <Spawner
            rate={1.5}
            max={50}
            lifespan={60}
            position={{ x: rect.width / 2, y: rect.height / 2 }}
            area={{ width: rect.width * 0.8, height: rect.height * 0.8 }}
            velocity={{ x: 0, y: 0, varianceX: 0.5, varianceY: 0.5 }}
          >
            <span
              style={{
                fontSize: rect.vmin * 2,
                color: "#BCAC8B",
                fontFamily: "Poppins, system-ui, sans-serif",
                fontWeight: 300,
              }}
            >
              solve()
            </span>
            <span
              style={{
                fontSize: rect.vmin * 1.5,
                color: "#BCAC8B",
                fontFamily: "monospace",
                fontWeight: 300,
              }}
            >
              {"{ }"}
            </span>
            <span
              style={{
                fontSize: rect.vmin * 1.8,
                color: "#303b2f",
                fontFamily: "monospace",
              }}
            >
              =&gt;
            </span>
          </Spawner>
          <Behavior
            opacity={[0, 0.6, 0.6, 0]}
            scale={{ start: 0.3, end: 1.5 }}
            wiggle={{ magnitude: 0.3, frequency: 0.05 }}
          />
        </Particles>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: rect.vmin * 3,
        }}
      >
        <AnimatedText
          transition={{
            split: "character",
            splitStagger: 1,
            opacity: [0, 1],
            scale: [0.8, 1],
            blur: [5, 0],
            duration: 15,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 9,
            fontWeight: 700,
            color: "#FFFFFF",
            fontFamily: "Poppins, system-ui, sans-serif",
            textAlign: "center",
            display: "block",
            width: "100%",
          }}
        >
          Software Wins.
        </AnimatedText>
        <AnimatedText
          transition={{
            opacity: [0, 1],
            y: [rect.vmin * 2, 0],
            duration: 15,
            delay: 20,
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 3,
            fontWeight: 400,
            color: "#BCAC8B",
            fontFamily: "Poppins, system-ui, sans-serif",
            textAlign: "center",
            display: "block",
            width: "100%",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Brand
        </AnimatedText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ── Main Composition ─────────────────────────────────────────────────────────

export const ShowcaseVideo: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {/* Scene 1: Glitch-in title (0–4s) */}
      <Sequence from={0} durationInFrames={fps * 4}>
        <GlitchTitle />
      </Sequence>

      {/* Scene 2: CLI Simulation + Fireflies (4–8s) */}
      <Sequence from={fps * 4} durationInFrames={fps * 4}>
        <CLIScene />
      </Sequence>

      {/* Scene 3: Counter Confetti (8–12s) */}
      <Sequence from={fps * 8} durationInFrames={fps * 4}>
        <CounterScene />
      </Sequence>

      {/* Scene 4: Grid Stagger toolkit (12–16s) */}
      <Sequence from={fps * 12} durationInFrames={fps * 4}>
        <GridStaggerScene />
      </Sequence>

      {/* Scene 5: Code Block reveal (16–20s) */}
      <Sequence from={fps * 16} durationInFrames={fps * 4}>
        <CodeScene />
      </Sequence>

      {/* Scene 6: 3D Carousel (20–24s) */}
      <Sequence from={fps * 20} durationInFrames={fps * 4}>
        <CarouselScene />
      </Sequence>

      {/* Scene 7: Word-by-word blur reveal (24–27s) */}
      <Sequence from={fps * 24} durationInFrames={fps * 3}>
        <WordRevealScene />
      </Sequence>

      {/* Scene 8: Final — Flying words + statement (27–30s) */}
      <Sequence from={fps * 27} durationInFrames={fps * 3}>
        <FinalScene />
      </Sequence>
    </AbsoluteFill>
  );
};
