/**
 * Subtle SVG noise texture overlay to eliminate gradient banding.
 * Place after any GradientTransition or solid background.
 */
export const NoiseOverlay: React.FC<{ opacity?: number }> = ({ opacity = 0.035 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      backgroundSize: "200px 200px",
      opacity,
      mixBlendMode: "overlay",
      pointerEvents: "none",
    }}
  />
);
