/**
 * YouTube Clean — the sooweigoh-reference look for the reels_from_youtube
 * landscape clips: whole 2-3 word phrases popping on at once (no word-by-word
 * build), white Poppins Bold, near-invisible soft shadow — but anchored
 * bottom-center instead of LandscapeSimple's mid-frame position.
 */

import type { EditStyle } from "./types";
import base from "./landscape-simple";

const style: EditStyle = {
  ...base,
  meta: {
    name: "YouTube Clean",
    description:
      "2-3 word whole-phrase chunks, white Poppins Bold, bottom center, minimal blurred shadow. sooweigoh-style captions for landscape clips.",
  },
  subs: {
    ...base.subs,
    // [YOUR_NAME]-tuned 2026-08-21: 40% up from the first 5.6 preview.
    font_size_pct_height: 7.8,
    // Bottom-center for these clips; 93 clears the iPad-overlay's bottom edge
    // in [YOUR_NAME]'s layouts while staying off the frame edge.
    vertical_position_pct_from_top: 93,
    text_shadow: {
      color_hex: "#000000",
      opacity: 0.16,
      blur_px: 16,
      offset_y_px: 0,
    },
  },
};

export default style;
