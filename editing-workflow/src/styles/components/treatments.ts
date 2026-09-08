/**
 * Text treatments — color/blend math for word glyphs.
 *
 * Orthogonal to layout. Spread one of these into a `SubsSpec` literal to
 * pick the treatment. Today the renderer dispatch in StyledCaptions.tsx
 * checks `text_treatment` to route to the right component path.
 *
 * Adding a new treatment: declare its constant here, extend the
 * `TextTreatment` union in types.ts, and add a dispatch case in
 * StyledCaptions.tsx (and/or its sub-components).
 */

import type { SubsSpec } from "../types";

type TreatmentComponent = Pick<
  SubsSpec,
  "text_treatment" | "xray_difference" | "color_standard_hex"
>;

/**
 * Pure white text composited over the video via mix-blend-mode: difference.
 * Each glyph shows the channel-by-channel negative of the video underneath.
 *
 * Inactive words sit at `inactive_opacity` (0 = hidden, 0.3 = ghost). The
 * color MUST be #FFFFFF for the inversion math to land correctly — this
 * component owns that constraint so consuming styles can't break it.
 */
export const XRAY_DIFFERENCE_TREATMENT: TreatmentComponent = {
  text_treatment: "xray-difference",
  xray_difference: {
    inactive_opacity: 0.0,
    blend_mode: "difference",
  },
  color_standard_hex: "#FFFFFF",
};

/**
 * Plain solid-color glyphs. Reads `color_standard_hex` from the style;
 * this component leaves the color untouched so consumers can pick any hex.
 *
 * This is the implicit default — declaring it explicitly is only useful
 * when you want to make the choice visible at the composition site.
 */
export const SOLID_TREATMENT: Pick<SubsSpec, "text_treatment"> = {
  text_treatment: "solid",
};
