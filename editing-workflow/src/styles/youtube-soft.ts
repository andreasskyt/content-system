/**
 * YouTube Soft — the plain "youtube" look (cumulative word-by-word build,
 * bottom center, words never shift) but with LandscapeSimple's soft blurred
 * shadow behind the letters instead of a background box. The halo only shows
 * where the footage is bright, so it survives white iPad-whiteboard footage
 * without reading as a sticker or a box.
 */

import type { EditStyle } from "./types";
import base from "./youtube";

const style: EditStyle = {
  ...base,
  meta: {
    name: "YouTube Soft",
    description:
      "White Poppins bold, single line, cumulative word-by-word build, bottom center, soft blurred letter shadow (no box, no outline).",
  },
  subs: {
    ...base.subs,
    text_shadow: {
      color_hex: "#000000",
      opacity: 0.26,
      blur_px: 24,
      offset_y_px: 0,
    },
  },
};

export default style;
