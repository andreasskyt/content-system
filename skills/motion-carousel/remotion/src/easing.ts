import { spring, type SpringConfig } from "remotion";

export const springConfigs = {
  enter: { mass: 1, damping: 18, stiffness: 120 } satisfies SpringConfig,
  exit: { mass: 1, damping: 24, stiffness: 140 } satisfies SpringConfig,
  emphasis: { mass: 0.8, damping: 12, stiffness: 160 } satisfies SpringConfig,
  smooth: { mass: 1, damping: 28, stiffness: 100 } satisfies SpringConfig,
  snap: { mass: 0.6, damping: 20, stiffness: 200 } satisfies SpringConfig,
} as const;

export function useSpring(
  preset: keyof typeof springConfigs,
  frame: number,
  fps: number,
  delay = 0,
) {
  return spring({
    frame: frame - delay,
    fps,
    config: springConfigs[preset],
  });
}

export const durations = {
  micro: 3,
  enter: 12,
  exit: 8,
  transition: 18,
  hold: 20,
  slide: 90,
} as const;

export const STAGGER = 4;
