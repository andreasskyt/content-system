/**
 * Layout components — placement strategy for words within a caption block.
 *
 * Each component sets the `layout` block plus the spatial anchors
 * (vertical_position_pct_from_top, horizontal_alignment, max_width_pct)
 * that the layout depends on. Spread one into a `SubsSpec` literal to pick
 * the placement.
 *
 * Adding a new layout: declare its constant here, extend the
 * `LayoutSpec.word_arrangement` union in types.ts, and either teach an
 * existing renderer to honor the new value or add a new sub-component
 * that handles it.
 */

import type { SubsSpec, LayoutSpec } from "../types";

type LayoutComponent = Pick<
  SubsSpec,
  | "layout"
  | "vertical_position_pct_from_top"
  | "horizontal_alignment"
  | "max_width_pct"
>;

const BASE_LAYOUT: LayoutSpec = {
  word_arrangement: "horizontal",
  step_shift_pct: [],
  single_keyword_scale_multiplier: 1,
  sequential_reveal: false,
  per_word_y_step_pct: 0,
  helper_words: [],
  helper_word_size_pct_height: 0,
  bracket_word_size_pct_height: 0,
  bracket_offset_y_pct: 0,
  carrier_lockup: {
    enabled: false,
    carrier_size_pct_height: 0,
    carrier_font_weight: 400,
    carrier_case: "lower",
    row_gap_pct: 0,
  },
};

/**
 * Center of frame, horizontally and vertically. Every word in the active
 * line is pinned to the same anchor point and stacks on top of every
 * other word. With `inactive_opacity: 0` only the active word is visible,
 * and the next active word appears in the exact same spot — zero horizontal
 * drift between word swaps.
 *
 * Pairs naturally with XRAY_DIFFERENCE_TREATMENT for the strict X-ray look.
 * Pair with a chunking component (ONE_WORD_AT_A_TIME, etc.) to control
 * how many words can occupy the anchor simultaneously.
 */
export const CENTER_STACKED_LAYOUT: LayoutComponent = {
  vertical_position_pct_from_top: 50,
  horizontal_alignment: "center",
  max_width_pct: 90,
  layout: {
    ...BASE_LAYOUT,
    word_arrangement: "stacked-anchor",
  },
};

/**
 * Standard left-to-right flow with words on a single horizontal line.
 * Position and alignment configurable per style — this component owns
 * the `word_arrangement: "horizontal"` choice and the layout defaults
 * that go with it.
 *
 * Pair with a serif/sans typography and a solid treatment for classic
 * captions. With xray treatment, horizontal flow is not yet wired in the
 * XRayInvertCaptions renderer.
 */
export const HORIZONTAL_FLOW_LAYOUT: LayoutComponent = {
  vertical_position_pct_from_top: 85,
  horizontal_alignment: "center",
  max_width_pct: 90,
  layout: {
    ...BASE_LAYOUT,
    word_arrangement: "horizontal",
  },
};
