import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { GradientTransition } from "remotion-bits";
import { CounterScene } from "./scenes/CounterScene";
import { StatementScene } from "./scenes/StatementScene";
import { TypewriterScene } from "./scenes/TypewriterScene";
import { ComparisonScene } from "./scenes/ComparisonScene";
import { ListScene } from "./scenes/ListScene";
import { IllustrationScene } from "./scenes/IllustrationScene";
import { NoiseOverlay } from "./NoiseOverlay";
import { ShowcaseScene } from "./scenes/ShowcaseScene";
import { CodeScene } from "./scenes/CodeScene";
import { VisualScene } from "./scenes/VisualScene";
import { StaggeredScene } from "./scenes/StaggeredScene";
import { ParticleScene } from "./scenes/ParticleScene";

const DARK_GRADIENT = [
  "linear-gradient(135deg, #0a0a0a 0%, #1a2117 50%, #0a0a0a 100%)",
  "linear-gradient(135deg, #0a0a0a 0%, #0a0a0a 30%, #1a2117 70%, #0a0a0a 100%)",
];

const LIGHT_GRADIENT = [
  "linear-gradient(135deg, #fafafa 0%, #f0ece4 50%, #fafafa 100%)",
  "linear-gradient(135deg, #fafafa 0%, #fafafa 30%, #f0ece4 70%, #fafafa 100%)",
];

export interface BRollSceneProps {
  spec: {
    template: string;
    bgColor: string;
    headline?: string;
    subtext?: string;
    number?: string;
    numberPrefix?: string;
    numberPostfix?: string;
    beforeValue?: string;
    afterValue?: string;
    listItems?: string[];
    typewriterText?: string;
    imageKey?: string;
    imageSrc?: string;
    imageKeys?: string[];
    imageSrcs?: string[];
    codeSnippet?: string;
    codeLanguage?: string;
    visualIcons?: string[];
    visualLayout?: "single" | "pair" | "sequence";
    sceneItems?: string[];
    sceneStyle?: string;
    particleStyle?: string;
    staggerStyle?: string;
    staggerItems?: string[];
  };
  durationFrames?: number;
  widthOverride?: number;
  heightOverride?: number;
}

export const BRollScene: React.FC<BRollSceneProps & Record<string, unknown>> = ({
  spec,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade out at end
  const fadeOutDuration = Math.round(fps * 0.4);
  const fadeOutStart = durationInFrames - fadeOutDuration;
  const sceneOpacity = interpolate(
    frame,
    [fadeOutStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const isDark = spec.bgColor === "#000000";
  const sceneProps = { bgColor: spec.bgColor, fps };
  const needsGradientBg = spec.template !== "illustration";

  return (
    <AbsoluteFill style={{ backgroundColor: spec.bgColor, opacity: sceneOpacity }}>
      {needsGradientBg && (
        <>
          <GradientTransition
            gradient={isDark ? DARK_GRADIENT : LIGHT_GRADIENT}
            duration={durationInFrames}
            easing="easeInOutCubic"
          />
          <NoiseOverlay />
        </>
      )}
      {spec.template === "counter" && (
        <CounterScene
          {...sceneProps}
          headline={spec.headline}
          number={spec.number}
          numberPrefix={spec.numberPrefix}
          numberPostfix={spec.numberPostfix}
        />
      )}
      {spec.template === "statement" && (
        <StatementScene
          {...sceneProps}
          headline={spec.headline}
          subtext={spec.subtext}
        />
      )}
      {spec.template === "typewriter" && (
        <TypewriterScene
          {...sceneProps}
          typewriterText={spec.typewriterText}
          headline={spec.headline}
        />
      )}
      {spec.template === "comparison" && (
        <ComparisonScene
          {...sceneProps}
          headline={spec.headline}
          beforeValue={spec.beforeValue}
          afterValue={spec.afterValue}
        />
      )}
      {spec.template === "list" && (
        <ListScene
          {...sceneProps}
          headline={spec.headline}
          listItems={spec.listItems}
        />
      )}
      {spec.template === "illustration" && (
        <IllustrationScene
          {...sceneProps}
          imageSrc={spec.imageSrc}
          headline={spec.headline}
        />
      )}
      {spec.template === "showcase" && (
        <ShowcaseScene
          {...sceneProps}
          imageSrcs={spec.imageSrcs}
          headline={spec.headline}
        />
      )}
      {spec.template === "code" && (
        <CodeScene
          {...sceneProps}
          codeSnippet={spec.codeSnippet}
          codeLanguage={spec.codeLanguage}
        />
      )}
      {spec.template === "staggered" && (
        <StaggeredScene
          {...sceneProps}
          staggerItems={spec.staggerItems}
          staggerStyle={spec.staggerStyle as any}
          headline={spec.headline}
        />
      )}
      {spec.template === "particles" && (
        <ParticleScene
          {...sceneProps}
          headline={spec.headline}
          particleStyle={spec.particleStyle as any}
        />
      )}
    </AbsoluteFill>
  );
};
