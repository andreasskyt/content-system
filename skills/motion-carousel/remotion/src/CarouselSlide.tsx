import { AbsoluteFill } from "remotion";
import { FontLoader } from "./components/FontLoader";
import { ProgressBar } from "./components/ProgressBar";
import { Lockup } from "./components/Lockup";
import { ParticleOverlay, type ParticleEffect } from "./components/ParticleOverlay";
import type { EmphasisStyle } from "./components/Mark";
import { surfaceStyles, type Surface } from "./theme";

import { HeroSlide } from "./slides/HeroSlide";
import { ProblemSlide } from "./slides/ProblemSlide";
import { ShiftSlide } from "./slides/ShiftSlide";
import { FeatureSlide } from "./slides/FeatureSlide";
import { StatSlide } from "./slides/StatSlide";
import { StepsSlide } from "./slides/StepsSlide";
import { CTASlide } from "./slides/CTASlide";
import { TerminalDemoSlide } from "./slides/TerminalDemoSlide";
import { KineticPhotoSlide } from "./slides/KineticPhotoSlide";
import { DataFlowSlide } from "./slides/DataFlowSlide";
import { CodeRevealSlide } from "./slides/CodeRevealSlide";
import { QuoteSlide } from "./slides/QuoteSlide";
import { ComparisonSlide } from "./slides/ComparisonSlide";
import { TimelineSlide } from "./slides/TimelineSlide";
import { ChartBarsSlide } from "./slides/ChartBarsSlide";
import { MatrixSlide } from "./slides/MatrixSlide";
import { SketchSlide, type SketchSpec } from "./slides/SketchSlide";

export type SlideType =
  | "hero"
  | "problem"
  | "shift"
  | "feature"
  | "stat"
  | "steps"
  | "cta"
  | "terminal-demo"
  | "kinetic-photo"
  | "data-flow"
  | "code-reveal"
  | "quote"
  | "comparison"
  | "timeline"
  | "chart-bars"
  | "matrix"
  | "sketch";

export type SlideSpec = {
  slideType: SlideType;
  surface: Surface;
  slideIndex: number;
  totalSlides: number;

  headline?: string;
  subhead?: string;
  body?: string;

  /** Word in headline to emphasize. Used by hero/shift. */
  emphasisWord?: string;
  /** Emphasis style. Defaults to "underline". */
  emphasisStyle?: EmphasisStyle;
  /** Legacy alias for emphasisWord — still honored. */
  underlineWord?: string;

  items?: string[];

  stat?: { value: number; prefix?: string; suffix?: string; label?: string };

  terminal?: {
    command: string;
    prompt?: string;
    durationSec?: number;
    output?: string[];
  };

  photo?: { src: string; focus?: "left" | "right" | "center" };

  flow?: {
    nodes: Array<{ label: string; emoji?: string }>;
    highlight?: string;
  };

  cta?: { text: string; handle?: string; keyword?: string };

  /** Multi-line syntax-highlighted code snippet. */
  code?: { content: string; language?: string; highlight?: number[] };

  /** Oversized quote block. */
  quote?: { text: string; attribution?: string };

  /** Before/after split. */
  comparison?: {
    beforeLabel: string;
    beforeItems: string[];
    afterLabel: string;
    afterItems: string[];
  };

  /** Horizontal timeline with milestones. */
  timeline?: { milestones: Array<{ label: string; time?: string }> };

  /** Animated horizontal bar chart. */
  chart?: {
    bars: Array<{
      label: string;
      value: number;
      prefix?: string;
      suffix?: string;
      highlight?: boolean;
    }>;
    max?: number;
  };

  /** Hand-drawn 2x2 that builds up across slides. stage 0 = axes, 1..4 = quadrants (BL, BR, TL, TR), 5 = all lit. */
  matrix?: {
    stage: 0 | 1 | 2 | 3 | 4 | 5;
    axisX?: [string, string];
    axisY?: [string, string];
    labels?: [string, string, string, string];
    /** Text-only closer: no matrix, headline + body + items ("Label: text") + closing line in subhead. */
    textOnly?: boolean;
    /** Slide 1 only: frame 0 shows headline + the finished matrix blurred (the IG cover), then it dissolves and the axes draw. */
    teaser?: boolean;
  };

  /** Notebook style, arbitrary drawing from JSON (strokes/texts/fills). See references/notebook-style.md. */
  sketch?: SketchSpec;

  /** Decorative overlay that sits above the slide. */
  effects?: { particles?: ParticleEffect };

  showLockup?: boolean;
  showProgress?: boolean;
};

export type CarouselSlideProps = {
  spec: SlideSpec;
  durationFrames: number;
  widthOverride: number;
  heightOverride: number;
};

export const defaultSpec: SlideSpec = {
  slideType: "hero",
  surface: "gradient",
  slideIndex: 0,
  totalSlides: 7,
  headline: "You're doing it wrong.",
  emphasisWord: "wrong",
  emphasisStyle: "underline",
  subhead: "Most agencies burn 20 hours/week on work AI can do in 30 minutes.",
  showLockup: true,
  showProgress: true,
};

export const CarouselSlide: React.FC<CarouselSlideProps> = ({ spec }) => {
  // Backwards-compat: if caller still uses underlineWord, treat it as emphasisWord.
  if (!spec.emphasisWord && spec.underlineWord) {
    spec = { ...spec, emphasisWord: spec.underlineWord };
  }

  const surface = surfaceStyles[spec.surface];
  const showLockup = spec.showLockup ?? true;
  const showProgress = spec.showProgress ?? true;

  return (
    <AbsoluteFill
      style={{
        background: surface.background,
        color: surface.color,
        fontFamily: "Poppins, sans-serif",
        overflow: "hidden",
      }}
    >
      <FontLoader />
      <SlideBody spec={spec} />
      {spec.effects?.particles && (
        <ParticleOverlay effect={spec.effects.particles} />
      )}
      {showLockup && <Lockup surface={spec.surface} />}
      {showProgress && (
        <ProgressBar
          index={spec.slideIndex}
          total={spec.totalSlides}
          surface={spec.surface}
        />
      )}
    </AbsoluteFill>
  );
};

const SlideBody: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  switch (spec.slideType) {
    case "hero":
      return <HeroSlide spec={spec} />;
    case "problem":
      return <ProblemSlide spec={spec} />;
    case "shift":
      return <ShiftSlide spec={spec} />;
    case "feature":
      return <FeatureSlide spec={spec} />;
    case "stat":
      return <StatSlide spec={spec} />;
    case "steps":
      return <StepsSlide spec={spec} />;
    case "cta":
      return <CTASlide spec={spec} />;
    case "terminal-demo":
      return <TerminalDemoSlide spec={spec} />;
    case "kinetic-photo":
      return <KineticPhotoSlide spec={spec} />;
    case "data-flow":
      return <DataFlowSlide spec={spec} />;
    case "code-reveal":
      return <CodeRevealSlide spec={spec} />;
    case "quote":
      return <QuoteSlide spec={spec} />;
    case "comparison":
      return <ComparisonSlide spec={spec} />;
    case "timeline":
      return <TimelineSlide spec={spec} />;
    case "chart-bars":
      return <ChartBarsSlide spec={spec} />;
    case "matrix":
      return <MatrixSlide spec={spec} />;
    case "sketch":
      return <SketchSlide spec={spec} />;
    default:
      return null;
  }
};
