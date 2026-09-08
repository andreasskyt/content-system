import { interpolate } from "remotion";
import { getLength } from "@remotion/paths";
import { colors } from "../theme";

/**
 * Notebook-style drawing primitives. Everything "drawn" animates like a pen:
 * paths draw in along their length, handwritten text reveals left-to-right.
 * Poppins headline/body never draws, it fades (see MatrixSlide / SketchSlide).
 *
 * Shared by SketchMatrix (the 2x2) and SketchSlide (arbitrary drawings from JSON).
 */

export const HAND_FONT = "Caveat, 'Bradley Hand', cursive";
export const INK = "rgba(255,255,255,0.78)";
export const GOLD = colors.accentGold;

export function ramp(frame: number, start: number, dur: number): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** easeOutCubic: the pen slows down at the end of a stroke. */
export function pen(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Deterministic jitter so repeated shapes are each their own wobbly version. */
export function jitter(seed: number, n: number, amp = 4): number {
  return Math.sin(seed * 12.9898 + n * 78.233) * amp;
}

/** Closed rectangle with bowed sides. Different seed = different shape. */
export function sketchRect(x: number, y: number, w: number, h: number, seed: number): string {
  const j = (n: number, amp = 4) => jitter(seed, n, amp);
  const x0 = x + j(1);
  const y0 = y + j(2);
  return [
    `M ${x0} ${y0}`,
    `Q ${x + w / 2} ${y + j(3, 5) - 2} ${x + w + j(4)} ${y + j(5)}`,
    `Q ${x + w + j(6, 5) + 2} ${y + h / 2} ${x + w + j(7)} ${y + h + j(8)}`,
    `Q ${x + w / 2} ${y + h + j(9, 5) + 2} ${x + j(10)} ${y + h + j(11)}`,
    `Q ${x + j(12, 5) - 2} ${y + h / 2} ${x0 + j(13, 1.5)} ${y0 + 6}`,
  ].join(" ");
}

/** Straight-ish line with a slight bow, plus an optional arrowhead path. */
export function sketchLine(x1: number, y1: number, x2: number, y2: number, seed = 1): string {
  const mx = (x1 + x2) / 2 + jitter(seed, 1, 6);
  const my = (y1 + y2) / 2 + jitter(seed, 2, 6);
  return `M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`;
}

export function sketchArrowHead(x: number, y: number, dir: "up" | "right" | "down" | "left"): string {
  const s = 18;
  switch (dir) {
    case "up":    return `M ${x - s} ${y + s} L ${x} ${y} L ${x + s} ${y + s}`;
    case "down":  return `M ${x - s} ${y - s} L ${x} ${y} L ${x + s} ${y - s}`;
    case "left":  return `M ${x + s} ${y - s} L ${x} ${y} L ${x + s} ${y + s}`;
    default:      return `M ${x - s} ${y - s} L ${x} ${y} L ${x - s} ${y + s}`;
  }
}

/** Put once inside <defs>. */
export const SketchDefs: React.FC = () => (
  <>
    <filter id="sketch" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="9" result="n" />
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="26" />
    </filter>
  </>
);

/** A path that draws in. progress 0..1 (already eased by the caller, or pass raw and set eased). */
export const SketchPath: React.FC<{
  d: string;
  progress: number;
  stroke?: string;
  width?: number;
  opacity?: number;
  eased?: boolean;
}> = ({ d, progress, stroke = INK, width = 5, opacity = 1, eased = false }) => {
  const len = getLength(d);
  const p = eased ? pen(progress) : progress;
  return (
    <path
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={len}
      strokeDashoffset={len * (1 - p)}
      opacity={opacity}
      filter="url(#sketch)"
    />
  );
};

/**
 * Handwritten text that reveals like it's being written. Multi-line via `lines`.
 */
export const HandText: React.FC<{
  x: number;
  y: number;
  lines: string[];
  progress: number;
  size?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  weight?: number;
  lineHeight?: number;
  opacity?: number;
  baseline?: "middle" | "auto";
}> = ({ x, y, lines, progress, size = 36, anchor = "start", color = INK, weight = 600, lineHeight, opacity = 1, baseline = "auto" }) => {
  const lh = lineHeight ?? size * 1.05;
  // Handwriting always reveals left to right, whatever the anchor.
  const clip = `inset(0 ${100 - progress * 100}% 0 0)`;
  const yStart = baseline === "middle" ? y - ((lines.length - 1) / 2) * lh : y;
  return (
    <text
      x={x}
      y={yStart}
      textAnchor={anchor}
      dominantBaseline={baseline === "middle" ? "middle" : undefined}
      fontFamily={HAND_FONT}
      fontWeight={weight}
      fontSize={size}
      fill={color}
      opacity={opacity}
      style={{ clipPath: clip }}
    >
      {lines.map((ln, i) => (
        <tspan key={i} x={x} y={yStart + i * lh}>
          {ln}
        </tspan>
      ))}
    </text>
  );
};

/** Labels longer than ~10 chars wrap at the word boundary nearest the middle. */
export function wrapLabel(label: string, max = 10): string[] {
  if (label.length <= max) return [label];
  const words = label.split(" ");
  if (words.length === 1) return [label];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ").length;
    const b = words.slice(i).join(" ").length;
    const diff = Math.abs(a - b);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}
