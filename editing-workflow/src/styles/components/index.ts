/**
 * Subtitle style components — orthogonal building blocks for composing
 * subtitle presets.
 *
 * A subtitle style is a composition of four axes:
 *   1. text_treatment   — color/blend math    (treatments.ts)
 *   2. layout           — placement strategy  (layouts.ts)
 *   3. chunking         — words on screen     (chunking.ts)
 *   4. typography       — font/weight/case    (style-specific, no component yet)
 *
 * Example composition:
 *
 *   import {
 *     XRAY_DIFFERENCE_TREATMENT,
 *     CENTER_STACKED_LAYOUT,
 *     ONE_WORD_AT_A_TIME,
 *   } from "./components";
 *
 *   const subs: SubsSpec = {
 *     enabled: true,
 *     ...XRAY_DIFFERENCE_TREATMENT,
 *     ...CENTER_STACKED_LAYOUT,
 *     ...ONE_WORD_AT_A_TIME,
 *     font_family: "Montserrat",
 *     font_weight_standard: 900,
 *     case_standard: "upper",
 *     // ...remaining required SubsSpec fields
 *   };
 *
 * Spread order = override precedence. Later spreads win. Add per-style
 * overrides AFTER the component spreads to tweak a single knob.
 */

export {
  XRAY_DIFFERENCE_TREATMENT,
  SOLID_TREATMENT,
} from "./treatments";

export {
  CENTER_STACKED_LAYOUT,
  HORIZONTAL_FLOW_LAYOUT,
} from "./layouts";

export {
  ONE_WORD_AT_A_TIME,
  RAPID_FIRE,
  NORMAL_PHRASE,
} from "./chunking";
