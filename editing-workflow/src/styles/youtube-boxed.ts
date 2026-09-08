/**
 * YouTube Boxed — the plain "youtube" look plus a faded black background box
 * behind the text, for footage with white/bright areas (e.g. iPad whiteboard
 * overlays) where bare white Poppins would disappear. Same cumulative
 * word-by-word build, bottom-center, words never shift.
 */

import type { EditStyle } from "./types";
import base from "./youtube";

const style: EditStyle = {
  ...base,
  meta: {
    name: "YouTube Boxed",
    description:
      "White Poppins bold on a ~60% black box, single line, cumulative word-by-word build, bottom center. For videos with white backgrounds.",
  },
  subs: {
    ...base.subs,
    background_box: {
      color_hex: "#000000",
      opacity: 0.6,
      padding_pct_of_font: 0.28,
    },
  },
};

export default style;
