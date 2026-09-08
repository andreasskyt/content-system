/**
 * BRAND brand tokens — canonical values from carousel-generator's template.html.
 * Do not import brand values from other Remotion projects; they drift.
 */

export const colors = {
  primary: "#303b2f",
  primaryLight: "#4C564A",
  primaryDark: "#161B15",
  accentGold: "#BCAC8B",
  lightBg: "#F5F1EA",
  lightBorder: "#E8E1D3",
  white: "#FFFFFF",
  textDark: "#1A1918",
  textMuted: "#8A8580",
  underlineRed: "#C8102E",
  gradient:
    "linear-gradient(165deg, #161B15 0%, #303b2f 50%, #4C564A 100%)",
} as const;

export const fonts = {
  display: "Poppins",
  /** [WEBSITE_DOMAIN] stack, used by the notebook style */
  siteDisplay: "'Bricolage Grotesque', 'Poppins', sans-serif",
  siteBody: "'Instrument Sans', system-ui, sans-serif",
  siteEmphasis: "'Playfair Display', Georgia, serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
} as const;

export const weights = {
  regular: 400,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

export type Surface = "light" | "white" | "gradient" | "black";

export const surfaceStyles: Record<Surface, { background: string; color: string }> = {
  light: { background: colors.lightBg, color: colors.textDark },
  white: { background: colors.white, color: colors.textDark },
  gradient: { background: colors.gradient, color: colors.white },
  black: { background: "#0A0A0A", color: colors.white },
};

/**
 * Type scale calibrated for 1080×1350 slides.
 */
export const typeScale = {
  xs: 20,
  sm: 28,
  base: 36,
  lg: 52,
  xl: 72,
  "2xl": 96,
  hero: 128,
} as const;

export const radii = {
  sm: 12,
  md: 20,
  lg: 32,
  pill: 9999,
} as const;
