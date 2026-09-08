import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { GradientTransition } from "remotion-bits";
import { NoiseOverlay } from "./NoiseOverlay";

// Import the actual remotion-bits compositions
import { Component as FractureReassemble } from "../bits/fracture_reassemble";
import { Component as GridStagger } from "../bits/grid_stagger";
import { Component as CardStack } from "../bits/card_stack";
import { Component as MosaicReframe } from "../bits/mosaic_reframe";
import { Component as ListReveal } from "../bits/list_reveal";
import { Component as Carousel3D } from "../bits/carousel_3d";
import { Component as Terminal3D } from "../bits/terminal_3d";
import { Component as Fireflies } from "../bits/fireflies";
import { Component as ParticlesGrid } from "../bits/particles_grid";
import { Component as FlyingThroughWords } from "../bits/flying_through_words";

const Scene: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
  <AbsoluteFill>
    <GradientTransition
      gradient={[
        "radial-gradient(circle at 50% 50%, #1a2117 0%, #0a0a0a 60%)",
        "radial-gradient(circle at 50% 50%, #0a0a0a 0%, #1a2117 60%)",
      ]}
      duration={150}
    />
    <NoiseOverlay />
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {children}
    </AbsoluteFill>
    <div style={{ position: "absolute", bottom: 40, left: 0, right: 0, textAlign: "center", fontSize: 24, color: "#BCAC8B", fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase" }}>
      {label}
    </div>
  </AbsoluteFill>
);

export const BitShowcase: React.FC = () => {
  const { fps } = useVideoConfig();
  const dur = fps * 5; // 5 seconds each

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      <Sequence from={0} durationInFrames={dur}>
        <Scene label="Fracture Reassemble"><FractureReassemble /></Scene>
      </Sequence>
      <Sequence from={dur} durationInFrames={dur}>
        <Scene label="Grid Stagger"><GridStagger /></Scene>
      </Sequence>
      <Sequence from={dur * 2} durationInFrames={dur}>
        <Scene label="3D Card Stack"><CardStack /></Scene>
      </Sequence>
      <Sequence from={dur * 3} durationInFrames={dur}>
        <Scene label="Mosaic Reframe"><MosaicReframe /></Scene>
      </Sequence>
      <Sequence from={dur * 4} durationInFrames={dur}>
        <Scene label="List Reveal"><ListReveal /></Scene>
      </Sequence>
      <Sequence from={dur * 5} durationInFrames={dur}>
        <Scene label="3D Carousel"><Carousel3D /></Scene>
      </Sequence>
      <Sequence from={dur * 6} durationInFrames={dur}>
        <Scene label="3D Terminal"><Terminal3D /></Scene>
      </Sequence>
      <Sequence from={dur * 7} durationInFrames={dur}>
        <Scene label="Fireflies"><Fireflies /></Scene>
      </Sequence>
      <Sequence from={dur * 8} durationInFrames={dur}>
        <Scene label="Grid Particles"><ParticlesGrid /></Scene>
      </Sequence>
      <Sequence from={dur * 9} durationInFrames={dur}>
        <Scene label="Flying Through Words"><FlyingThroughWords /></Scene>
      </Sequence>
    </AbsoluteFill>
  );
};
