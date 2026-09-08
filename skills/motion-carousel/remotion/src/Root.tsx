import { Composition } from "remotion";
import { CarouselSlide, defaultSpec, type CarouselSlideProps } from "./CarouselSlide";
import { CarouselReel, defaultReelProps, type CarouselReelProps } from "./CarouselReel";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="CarouselSlide"
        component={CarouselSlide}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1350}
        defaultProps={{
          spec: defaultSpec,
          durationFrames: 90,
          widthOverride: 1080,
          heightOverride: 1350,
        } satisfies CarouselSlideProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationFrames ?? 90,
          width: props.widthOverride ?? 1080,
          height: props.heightOverride ?? 1350,
        })}
      />
      <Composition
        id="CarouselReel"
        component={CarouselReel}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultReelProps satisfies CarouselReelProps}
        calculateMetadata={({ props }) => {
          const per = (props.holdFrames ?? 75) + (props.transitionFrames ?? 18);
          const n = Math.max(props.specs.length, 1);
          return {
            durationInFrames: n * per + (props.tailFrames ?? 30),
            width: 1080,
            height: 1920,
          };
        }}
      />
    </>
  );
};
