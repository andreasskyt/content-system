import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import { CarouselSlide, type SlideSpec } from "./CarouselSlide";
import { FontLoader } from "./components/FontLoader";
import { colors, radii, weights, typeScale } from "./theme";
import { useSpring } from "./easing";

/**
 * Reel-format composition (1080x1920) that animates through N carousel slides
 * with swipe transitions. Looks like someone flipping through an IG carousel —
 * Reels algorithm reach + carousel visual pattern.
 *
 * Layout:
 *   0–120px        top padding
 *   120–360px      fat title header
 *   360–410px      gap
 *   410–1535px     carousel card (900x1125, scaled from native 1080x1350)
 *   1535–1920px    progress dots, swipe hint, @[IG_HANDLE] footer
 */

export type CarouselReelProps = {
  specs: SlideSpec[];
  holdFrames: number;
  transitionFrames: number;
  tailFrames: number;
  title?: string;      // fat headline that sits above the card, persists across the reel
  handle?: string;     // smaller tag under the dots (default @[IG_HANDLE])
};

// Native slide dimensions (what each SlideSpec assumes).
const SLIDE_W = 1080;
const SLIDE_H = 1350;

// On-screen card dimensions inside the reel frame.
const CARD_W = 900;
const CARD_H = 1125;     // 900 * (5/4) — preserves 4:5 aspect
const SCALE = CARD_W / SLIDE_W; // 0.8333...

const FRAME_W = 1080;
const FRAME_H = 1920;
const SIDE_MARGIN = (FRAME_W - CARD_W) / 2; // 90
const TITLE_TOP = 120;
const TITLE_HEIGHT = 240;
const TITLE_GAP = 50;
const CARD_TOP = TITLE_TOP + TITLE_HEIGHT + TITLE_GAP; // 410

export const defaultReelProps: CarouselReelProps = {
  specs: [],
  holdFrames: 75,
  transitionFrames: 18,
  tailFrames: 30,
  title: "The motion carousel system",
  handle: "@[IG_HANDLE]",
};

export const CarouselReel: React.FC<CarouselReelProps> = ({
  specs,
  holdFrames,
  transitionFrames,
  tailFrames,
  title = "The motion carousel system",
  handle = "@[IG_HANDLE]",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const perSlide = holdFrames + transitionFrames;
  const n = specs.length;

  const slideIdx = Math.min(Math.floor(frame / perSlide), n - 1);
  const intra = frame - slideIdx * perSlide;

  let swipe = 0;
  if (intra >= holdFrames && slideIdx < n - 1) {
    const t = Math.min((intra - holdFrames) / transitionFrames, 1);
    swipe = 1 - Math.pow(1 - t, 3); // easeOutCubic
  }
  const trackX = -(slideIdx + swipe) * SLIDE_W;

  return (
    <AbsoluteFill
      style={{
        background: "#141414",
        fontFamily: "Poppins, sans-serif",
        overflow: "hidden",
      }}
    >
      <FontLoader />
      <BackgroundTexture />
      <TitleHeader title={title} fps={fps} frame={frame} />
      <CardStage
        trackX={trackX}
        specs={specs}
        perSlide={perSlide}
        transitionFrames={transitionFrames}
      />
      <ReelFooter
        slideIdx={slideIdx}
        total={n}
        swipe={swipe}
        intra={intra}
        holdFrames={holdFrames}
        handle={handle}
      />
    </AbsoluteFill>
  );
};

const BackgroundTexture: React.FC = () => {
  // Very subtle radial glow behind the card — gives the shadow something to sit against.
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 900px 900px at 50% 55%, rgba(48,59,47,0.22) 0%, rgba(20,20,20,0) 70%)",
        pointerEvents: "none",
      }}
    />
  );
};

const TitleHeader: React.FC<{ title: string; fps: number; frame: number }> = ({
  title,
  fps,
  frame,
}) => {
  const enter = useSpring("emphasis", frame, fps, 4);
  const y = interpolate(enter, [0, 1], [24, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: TITLE_TOP,
        left: 0,
        right: 0,
        height: TITLE_HEIGHT,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 72px",
        opacity: enter,
        transform: `translateY(${y}px)`,
      }}
    >
      <span
        style={{
          fontSize: 92,
          fontWeight: weights.black,
          color: colors.white,
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          textAlign: "center",
          textShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {title}
      </span>
    </div>
  );
};

const CardStage: React.FC<{
  trackX: number;
  specs: SlideSpec[];
  perSlide: number;
  transitionFrames: number;
}> = ({ trackX, specs, perSlide, transitionFrames }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: CARD_TOP,
        left: SIDE_MARGIN,
        width: CARD_W,
        height: CARD_H,
        borderRadius: radii.lg,
        overflow: "hidden",
        boxShadow: [
          "0 60px 120px rgba(0,0,0,0.55)",
          "0 20px 40px rgba(0,0,0,0.4)",
          "0 0 0 1px rgba(255,255,255,0.06)",
          "inset 0 1px 0 rgba(255,255,255,0.08)",
        ].join(", "),
      }}
    >
      {/* Inner scale wrapper: native 1080x1350 content, scaled to 900x1125. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${SCALE})`,
          transformOrigin: "top left",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            transform: `translateX(${trackX}px)`,
            height: SLIDE_H,
            width: specs.length * SLIDE_W,
          }}
        >
          {specs.map((spec, i) => {
            const start = Math.max(0, i * perSlide - transitionFrames);
            const duration = perSlide + transitionFrames + 30;
            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  width: SLIDE_W,
                  height: SLIDE_H,
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                <Sequence from={start} durationInFrames={duration}>
                  <CarouselSlide
                    spec={{
                      ...spec,
                      slideIndex: i,
                      totalSlides: specs.length,
                      showProgress: false, // reel owns progress
                    }}
                    durationFrames={perSlide}
                    widthOverride={SLIDE_W}
                    heightOverride={SLIDE_H}
                  />
                </Sequence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ReelFooter: React.FC<{
  slideIdx: number;
  total: number;
  swipe: number;
  intra: number;
  holdFrames: number;
  handle: string;
}> = ({ slideIdx, total, swipe, intra, holdFrames, handle }) => {
  const hintStart = holdFrames - 18;
  const hintProgress = interpolate(intra, [hintStart, holdFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const hintOpacity = hintProgress * (1 - swipe);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: FRAME_H - (CARD_TOP + CARD_H), // 385
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        paddingBottom: 60,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {Array.from({ length: total }).map((_, i) => {
          const active = i === slideIdx + (swipe > 0.5 ? 1 : 0);
          return (
            <span
              key={i}
              style={{
                width: active ? 14 : 10,
                height: active ? 14 : 10,
                borderRadius: "50%",
                background: active ? colors.accentGold : "rgba(255,255,255,0.22)",
                boxShadow: active ? `0 0 18px ${colors.accentGold}` : undefined,
              }}
            />
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          opacity: hintOpacity * 0.9,
          transform: `translateX(${interpolate(hintProgress, [0, 1], [-10, 0])}px)`,
        }}
      >
        <span
          style={{
            fontSize: typeScale.sm,
            fontWeight: weights.semibold,
            color: "rgba(255,255,255,0.65)",
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Swipe
        </span>
        <svg width="34" height="18" viewBox="0 0 34 18">
          <path
            d="M2,9 L30,9 M24,3 L30,9 L24,15"
            fill="none"
            stroke="rgba(255,255,255,0.65)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
        <img
          src={staticFile("profile.png")}
          alt=""
          width={40}
          height={40}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: "1.5px solid rgba(255,255,255,0.25)",
            objectFit: "cover",
          }}
        />
        <span
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.55)",
            fontWeight: weights.semibold,
            letterSpacing: 0.5,
          }}
        >
          {handle}
        </span>
      </div>
    </div>
  );
};
