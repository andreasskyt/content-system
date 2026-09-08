import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, typeScale, weights } from "../theme";
import { KineticText } from "../components/KineticText";
import { useSpring } from "../easing";

/**
 * Showpiece — full-bleed personal photo with slow Ken Burns zoom and a
 * kinetic headline that "writes" across the negative space.
 *
 * `spec.photo.src` is expected to resolve via staticFile() — pre-copy the image
 * to the remotion public/ folder at render time.
 * `spec.photo.focus` hints where the subject is so the text lands elsewhere.
 */
export const KineticPhotoSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const photo = spec.photo ?? { src: "", focus: "right" };

  // Ken Burns: slow zoom from 1.04x → 1.12x across slide duration.
  const zoom = interpolate(frame, [0, durationInFrames], [1.04, 1.12], {
    extrapolateRight: "clamp",
  });

  const headlineProgress = useSpring("enter", frame, fps, 12);
  const subheadProgress = useSpring("enter", frame, fps, 32);

  // Text aligns opposite the subject: if focus=right, text sits on left, etc.
  const textSide: "left" | "right" =
    photo.focus === "left" ? "right" : "left";

  const textStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: "46%",
    padding: "0 72px",
    [textSide]: 0,
  } as React.CSSProperties;

  return (
    <AbsoluteFill>
      {photo.src && (
        <img
          src={photo.src.startsWith("http") ? photo.src : staticFile(photo.src)}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${zoom})`,
            transformOrigin:
              photo.focus === "left"
                ? "25% 50%"
                : photo.focus === "center"
                  ? "50% 50%"
                  : "75% 50%",
          }}
        />
      )}
      {/* Gradient scrim on the text side for legibility */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          [textSide]: 0,
          width: "58%",
          background:
            textSide === "left"
              ? "linear-gradient(90deg, rgba(22,27,21,0.78) 0%, rgba(22,27,21,0.25) 70%, rgba(22,27,21,0) 100%)"
              : "linear-gradient(-90deg, rgba(22,27,21,0.78) 0%, rgba(22,27,21,0.25) 70%, rgba(22,27,21,0) 100%)",
        }}
      />
      <div style={textStyle}>
        <div
          style={{
            fontSize: typeScale.xl,
            fontWeight: weights.black,
            lineHeight: 1.02,
            letterSpacing: "-0.03em",
            color: colors.white,
            opacity: headlineProgress,
            textShadow: "0 4px 24px rgba(0,0,0,0.45)",
          }}
        >
          <KineticText
            text={spec.headline ?? ""}
            delay={14}
            splitBy="word"
          />
        </div>
        {spec.subhead && (
          <div
            style={{
              marginTop: 32,
              fontSize: typeScale.sm,
              fontWeight: weights.semibold,
              color: colors.accentGold,
              letterSpacing: 2,
              textTransform: "uppercase",
              opacity: subheadProgress,
              transform: `translateY(${interpolate(subheadProgress, [0, 1], [12, 0])}px)`,
            }}
          >
            {spec.subhead}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
