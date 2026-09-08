import { useCurrentFrame } from "remotion";
import {
  GOLD,
  INK,
  HandText,
  SketchDefs,
  SketchPath,
  pen,
  ramp,
  sketchRect,
  wrapLabel,
} from "./Sketch";

/**
 * Hand-drawn 2x2 matrix that builds up across a carousel.
 *
 * stage 0  → axes + arrowheads draw, then axis labels write in
 * stage 1  → bottom-left quadrant draws (axes pre-drawn)
 * stage 2  → bottom-right
 * stage 3  → top-left
 * stage 4  → top-right
 * stage 5  → everything pre-drawn, all four lit, top-right glows and breathes
 *
 * Everything below the current stage is fully drawn at frame 0 so six separate
 * MP4s read as one continuous drawing when swiped.
 */

export type MatrixStage = 0 | 1 | 2 | 3 | 4 | 5;

type Props = {
  stage: MatrixStage;
  axisX: [string, string];
  axisY: [string, string];
  labels: [string, string, string, string]; // BL, BR, TL, TR
  /** Cover teaser: the finished matrix, blurred, fully visible at frame 0, dissolving while the real drawing starts. */
  teaser?: boolean;
};

// Plot geometry (1080 x 1350 frame). Origin is the bottom-left corner of the plot.
const OX = 262;
const OY = 868;
const W = 566;
const H = 566;
const TOP = OY - H;
const RIGHT = OX + W;
const MIDX = OX + W / 2;
const MIDY = OY - H / 2;

// Axes bow slightly so they read as drawn, not ruled.
const X_AXIS = `M ${OX - 10} ${OY + 2} Q ${OX + 150} ${OY - 7} ${OX + 300} ${OY + 1} T ${RIGHT + 16} ${OY - 3}`;
const Y_AXIS = `M ${OX + 1} ${OY + 10} Q ${OX - 6} ${OY - 150} ${OX + 2} ${OY - 300} T ${OX - 2} ${TOP - 16}`;
const X_HEAD = `M ${RIGHT - 8} ${OY - 20} L ${RIGHT + 18} ${OY - 2} L ${RIGHT - 6} ${OY + 15}`;
const Y_HEAD = `M ${OX - 18} ${TOP + 6} L ${OX} ${TOP - 18} L ${OX + 17} ${TOP + 5}`;

const GAP = 16;
const PAD = 10;

type Box = { x: number; y: number; w: number; h: number; seed: number };
const BOXES: Box[] = [
  { x: OX + GAP + 6, y: MIDY + GAP, w: W / 2 - GAP * 2 - 6, h: H / 2 - GAP * 2 - 6, seed: 3 }, // BL
  { x: MIDX + GAP, y: MIDY + GAP, w: W / 2 - GAP - PAD, h: H / 2 - GAP * 2 - 6, seed: 7 },   // BR
  { x: OX + GAP + 6, y: TOP + PAD, w: W / 2 - GAP * 2 - 6, h: H / 2 - GAP - PAD, seed: 11 }, // TL
  { x: MIDX + GAP, y: TOP + PAD, w: W / 2 - GAP - PAD, h: H / 2 - GAP - PAD, seed: 17 },    // TR
];
const BOX_PATHS = BOXES.map((b) => sketchRect(b.x, b.y, b.w, b.h, b.seed));

const splitTwo = (s: string): string[] => {
  const w = s.split(" ");
  return w.length > 1 ? [w[0], w.slice(1).join(" ")] : [s];
};

export const SketchMatrix: React.FC<Props> = ({ stage, axisX, axisY, labels, teaser }) => {
  const frame = useCurrentFrame();
  // Teaser holds for 0.6s (the thumbnail), then dissolves over 1s while the axes draw underneath.
  const ghost = teaser ? 1 - ramp(frame, 18, 30) : 0;

  const pre = stage > 0;
  const xP = pre ? 1 : pen(ramp(frame, 12, 34));
  const yP = pre ? 1 : pen(ramp(frame, 38, 34));
  const xhP = pre ? 1 : pen(ramp(frame, 66, 10));
  const yhP = pre ? 1 : pen(ramp(frame, 74, 10));
  const xLab0 = pre ? 1 : ramp(frame, 84, 22);
  const xLab1 = pre ? 1 : ramp(frame, 98, 22);
  const yLab0 = pre ? 1 : ramp(frame, 114, 22);
  const yLab1 = pre ? 1 : ramp(frame, 128, 22);

  const glowBase = stage === 5 ? ramp(frame, 18, 50) : 0;
  const breathe = stage === 5 ? 0.5 + 0.5 * Math.sin(((frame - 68) / 30) * Math.PI * 0.9) : 0;

  return (
    <svg viewBox="0 0 1080 1350" width={1080} height={1350} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <defs>
        <SketchDefs />
        <filter id="teaser-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="11" />
        </filter>
      </defs>

      {ghost > 0 && (
        <g filter="url(#teaser-blur)" opacity={ghost}>
          {BOXES.map((b, i) => (
            <g key={`g${i}`}>
              <path d={BOX_PATHS[i]} fill={GOLD} opacity={0.14} />
              <SketchPath d={BOX_PATHS[i]} progress={1} stroke={GOLD} width={4.5} opacity={0.9} />
              <HandText x={b.x + b.w / 2} y={b.y + b.h / 2} lines={wrapLabel(labels[i])} progress={1} size={48} weight={700} anchor="middle" baseline="middle" color={GOLD} lineHeight={50} />
            </g>
          ))}
          <SketchPath d={X_AXIS} progress={1} />
          <SketchPath d={Y_AXIS} progress={1} />
          <SketchPath d={X_HEAD} progress={1} />
          <SketchPath d={Y_HEAD} progress={1} />
          <HandText x={OX + 2} y={OY + 54} lines={[axisX[0]]} progress={1} />
          <HandText x={RIGHT + 10} y={OY + 54} lines={[axisX[1]]} progress={1} anchor="end" />
          <HandText x={OX - 28} y={OY - 60} lines={splitTwo(axisY[0])} progress={1} anchor="end" size={32} lineHeight={38} />
          <HandText x={OX - 28} y={TOP + 30} lines={splitTwo(axisY[1])} progress={1} anchor="end" size={32} lineHeight={38} />
        </g>
      )}

      {BOXES.map((b, i) => {
        const q = i + 1;
        let outline = 0, fill = 0, label = 0, lit = 0;
        if (stage === 5) {
          outline = fill = label = 1;
          lit = i === 3 ? 1 : 0.55;
        } else if (q < stage) {
          outline = fill = label = 1;
          lit = 0.35;
        } else if (q === stage) {
          outline = pen(ramp(frame, 16, 44));
          fill = ramp(frame, 48, 24);
          label = ramp(frame, 60, 30);
          lit = 1;
        } else {
          return null;
        }
        const glowOpacity = stage === 5 ? (i === 3 ? glowBase * (0.32 + 0.14 * breathe) : glowBase * 0.08) : 0;
        return (
          <g key={i}>
            {glowOpacity > 0 && <path d={BOX_PATHS[i]} fill={GOLD} opacity={glowOpacity} filter="url(#glow)" />}
            <path d={BOX_PATHS[i]} fill={GOLD} opacity={fill * (0.05 + 0.12 * lit)} />
            <SketchPath d={BOX_PATHS[i]} progress={outline} stroke={GOLD} width={4.5} opacity={0.45 + 0.55 * lit} />
            <HandText
              x={b.x + b.w / 2}
              y={b.y + b.h / 2}
              lines={wrapLabel(labels[i])}
              progress={label}
              size={48}
              weight={700}
              anchor="middle"
              baseline="middle"
              color={GOLD}
              opacity={0.55 + 0.45 * lit}
              lineHeight={50}
            />
          </g>
        );
      })}

      <SketchPath d={X_AXIS} progress={xP} />
      <SketchPath d={Y_AXIS} progress={yP} />
      <SketchPath d={X_HEAD} progress={xhP} />
      <SketchPath d={Y_HEAD} progress={yhP} />

      <HandText x={OX + 2} y={OY + 54} lines={[axisX[0]]} progress={xLab0} />
      <HandText x={RIGHT + 10} y={OY + 54} lines={[axisX[1]]} progress={xLab1} anchor="end" />
      <HandText x={OX - 28} y={OY - 60} lines={splitTwo(axisY[0])} progress={yLab0} anchor="end" size={32} lineHeight={38} />
      <HandText x={OX - 28} y={TOP + 30} lines={splitTwo(axisY[1])} progress={yLab1} anchor="end" size={32} lineHeight={38} />
    </svg>
  );
};
