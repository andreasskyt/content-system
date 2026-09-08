/**
 * Style loader. Discovers presets in this directory by filename.
 *
 * Adding a new style:
 *   1. Drop a new file at src/styles/<name>.ts that default-exports an EditStyle.
 *   2. That's it. Scripts can now load it via `loadStyle("<name>")`.
 */

import { readdirSync } from "fs";
import path from "path";
import type { EditStyle } from "./types";

const STYLES_DIR = __dirname;

export function listStyles(): string[] {
  return readdirSync(STYLES_DIR)
    .filter((f) => f.endsWith(".ts") && !["index.ts", "types.ts"].includes(f))
    .map((f) => f.replace(/\.ts$/, ""))
    .sort();
}

export function loadStyle(name: string): EditStyle {
  const known = listStyles();
  if (!known.includes(name)) {
    throw new Error(
      `Unknown style "${name}". Available: ${known.join(", ")}`
    );
  }
  const mod = require(path.join(STYLES_DIR, name));
  const style = (mod.default ?? mod.style) as EditStyle | undefined;
  if (!style) {
    throw new Error(
      `Style "${name}" did not export a default EditStyle. Add 'export default style' to src/styles/${name}.ts`
    );
  }
  return style;
}

export type { EditStyle } from "./types";
