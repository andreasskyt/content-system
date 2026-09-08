import { Composition } from "remotion";
import { BRollScene } from "./compositions/BRollScene";
import { CaptionsOverlay } from "./compositions/CaptionsOverlay";
import { CaptionedVideo } from "./compositions/CaptionedVideo";
import { StyledCaptionedVideo } from "./compositions/StyledCaptionedVideo";
import { ShowcaseVideo } from "./compositions/ShowcaseVideo";
import { FounderStory } from "./compositions/FounderStory";
import { America1800s } from "./compositions/America1800s";
import { BitShowcase } from "./compositions/BitShowcase";
import brandStyle from "../styles/brand";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="BRollScene"
        component={BRollScene}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={({ props }) => ({
          durationInFrames: (props.durationFrames as number) || 180,
          width: (props.widthOverride as number) || 1080,
          height: (props.heightOverride as number) || 1920,
        })}
        defaultProps={{
          spec: {
            template: "statement",
            bgColor: "#000000",
            headline: "Hello World",
            subtext: "This is a test",
          },
          durationFrames: 180,
          widthOverride: 1080,
          heightOverride: 1920,
        }}
      />
      <Composition
        id="CaptionsOverlay"
        component={CaptionsOverlay}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={({ props }) => ({
          durationInFrames: (props.durationFrames as number) || 300,
          width: (props.widthOverride as number) || 1080,
          height: (props.heightOverride as number) || 1920,
        })}
        defaultProps={{
          lines: [],
          durationFrames: 300,
          widthOverride: 1080,
          heightOverride: 1920,
        }}
      />
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={({ props }) => ({
          durationInFrames: (props.durationFrames as number) || 300,
          width: (props.widthOverride as number) || 1080,
          height: (props.heightOverride as number) || 1920,
        })}
        defaultProps={{
          videoSrc: "",
          lines: [],
          durationFrames: 300,
          widthOverride: 1080,
          heightOverride: 1920,
        }}
      />
      <Composition
        id="StyledCaptionedVideo"
        component={StyledCaptionedVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={({ props }) => ({
          durationInFrames: (props.durationFrames as number) || 300,
          width: (props.widthOverride as number) || 1080,
          height: (props.heightOverride as number) || 1920,
        })}
        defaultProps={{
          videoSrc: "",
          lines: [],
          subsStyle: brandStyle.subs,
          canvasStyle: brandStyle.canvas,
          framingStyle: brandStyle.framing,
          durationFrames: 300,
          widthOverride: 1080,
          heightOverride: 1920,
        }}
      />
      <Composition
        id="ShowcaseVideo"
        component={ShowcaseVideo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FounderStory"
        component={FounderStory}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="BitShowcase"
        component={BitShowcase}
        durationInFrames={1500}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="America1800s"
        component={America1800s}
        durationInFrames={1860}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
