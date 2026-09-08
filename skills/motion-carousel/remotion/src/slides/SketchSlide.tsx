import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SlideSpec } from "../CarouselSlide";
import { colors, fonts, weights } from "../theme";
import { useSpring } from "../easing";
import {
  GOLD,
  INK,
  HandText,
  SketchDefs,
  SketchPath,
  pen,
  ramp,
  sketchArrowHead,
  sketchLine,
  sketchRect,
} from "../components/Sketch";

/**
 * Notebook style, generic drawing. The whole drawing is data (spec.sketch):
 * strokes draw in like a pen, handwritten texts write in, fills fade.
 * Headline and body are Poppins and only ever fade. Layout is the same as
 * MatrixSlide so the two mix inside one carousel.
 *
 * Coordinates are in the 1080x1350 frame. Keep the drawing inside y 280..900
 * so it clears the headline (top) and body (bottom).
 */

export type SketchStroke = {
  /** Raw SVG path, or a shorthand: {rect} / {line} / {arrow}. */
  d?: string;
  rect?: [number, number, number, number, number?]; // x, y, w, h, seed
  line?: [number, number, number, number, number?]; // x1, y1, x2, y2, seed
  arrow?: [number, number, "up" | "right" | "down" | "left"]; // tip x, y, direction
  start?: number; // frame the pen starts
  dur?: number;   // frames to draw
  stroke?: "ink" | "gold" | string;
  width?: number;
  opacity?: number;
  /** Pre-drawn at frame 0 (carry-over from a previous slide). */
  pre?: boolean;
};

export type SketchText = {
  x: number;
  y: number;
  text: string | string[];
  start?: number;
  dur?: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  color?: "ink" | "gold" | string;
  weight?: number;
  pre?: boolean;
};

export type SketchFill = {
  rect: [number, number, number, number, number?];
  start?: number;
  dur?: number;
  opacity?: number; // final opacity of the gold wash
  glow?: boolean;
  pre?: boolean;
};

export type SketchSpec = {
  strokes?: SketchStroke[];
  texts?: SketchText[];
  fills?: SketchFill[];
};

const color = (c?: string) => (c === "gold" ? GOLD : c === "ink" || !c ? INK : c);

const pathOf = (s: SketchStroke): string => {
  if (s.d) return s.d;
  if (s.rect) return sketchRect(s.rect[0], s.rect[1], s.rect[2], s.rect[3], s.rect[4] ?? 1);
  if (s.line) return sketchLine(s.line[0], s.line[1], s.line[2], s.line[3], s.line[4] ?? 1);
  if (s.arrow) return sketchArrowHead(s.arrow[0], s.arrow[1], s.arrow[2]);
  return "";
};

export const SketchSlide: React.FC<{ spec: SlideSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sk = spec.sketch ?? {};

  // Text waits for the last pen stroke by default.
  const lastPen = Math.max(
    0,
    ...(sk.strokes ?? []).filter((s) => !s.pre).map((s) => (s.start ?? 16) + (s.dur ?? 40)),
    ...(sk.texts ?? []).filter((t) => !t.pre).map((t) => (t.start ?? 60) + (t.dur ?? 26)),
  );
  const headP = useSpring("enter", frame, fps, 4);
  const bodyP = useSpring("enter", frame, fps, Math.max(30, lastPen + 6));
  const subP = useSpring("enter", frame, fps, Math.max(52, lastPen + 28));

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div
        style={{
          position: "absolute",
          top: 92,
          left: 72,
          right: 72,
          textAlign: "center",
          fontFamily: fonts.siteDisplay,
          fontSize: 64,
          fontWeight: weights.bold,
          lineHeight: 1.04,
          letterSpacing: "-0.03em",
          textTransform: "uppercase",
          color: colors.white,
          whiteSpace: "pre-line",
          textWrap: "balance",
          opacity: headP,
          transform: `translateY(${interpolate(headP, [0, 1], [14, 0])}px)`,
        } as React.CSSProperties}
      >
        {spec.headline}
      </div>

      <svg viewBox="0 0 1080 1350" width={1080} height={1350} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <SketchDefs />
        </defs>
        {(sk.fills ?? []).map((f, i) => {
          const p = f.pre ? 1 : ramp(frame, f.start ?? 48, f.dur ?? 24);
          const d = sketchRect(f.rect[0], f.rect[1], f.rect[2], f.rect[3], f.rect[4] ?? 1);
          return (
            <g key={`f${i}`}>
              {f.glow && <path d={d} fill={GOLD} opacity={p * 0.32} filter="url(#glow)" />}
              <path d={d} fill={GOLD} opacity={p * (f.opacity ?? 0.17)} />
            </g>
          );
        })}
        {(sk.strokes ?? []).map((s, i) => (
          <SketchPath
            key={`s${i}`}
            d={pathOf(s)}
            progress={s.pre ? 1 : pen(ramp(frame, s.start ?? 16, s.dur ?? 40))}
            stroke={color(s.stroke)}
            width={s.width ?? 5}
            opacity={s.opacity ?? 1}
          />
        ))}
        {(sk.texts ?? []).map((t, i) => (
          <HandText
            key={`t${i}`}
            x={t.x}
            y={t.y}
            lines={Array.isArray(t.text) ? t.text : [t.text]}
            progress={t.pre ? 1 : ramp(frame, t.start ?? 60, t.dur ?? 26)}
            size={t.size ?? 36}
            anchor={t.anchor ?? "start"}
            color={color(t.color)}
            weight={t.weight ?? 600}
            baseline={t.anchor === "middle" ? "middle" : "auto"}
          />
        ))}
      </svg>

      <div
        style={{
          position: "absolute",
          top: 948,
          left: 96,
          right: 96,
          bottom: 84,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 22,
          textAlign: "center",
        }}
      >
        {spec.body && (
          <div
            style={{
              fontFamily: fonts.siteBody,
              fontSize: 30,
              lineHeight: 1.42,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 900,
              opacity: bodyP,
              transform: `translateY(${interpolate(bodyP, [0, 1], [18, 0])}px)`,
            }}
          >
            {spec.body}
          </div>
        )}
        {spec.subhead && (
          <div
            style={{
              fontFamily: "Caveat, 'Bradley Hand', cursive",
              fontWeight: 600,
              fontSize: 42,
              lineHeight: 1.1,
              color: colors.accentGold,
              opacity: subP,
              transform: `translateY(${interpolate(subP, [0, 1], [14, 0])}px)`,
            }}
          >
            {spec.subhead}
          </div>
        )}
      </div>
    </div>
  );
};
