import { staticFile } from "remotion";
import { colors, weights, type Surface } from "../theme";

export const Lockup: React.FC<{ surface: Surface }> = ({ surface }) => {
  const onGradient = surface === "gradient" || surface === "black";
  const textColor = onGradient ? colors.white : colors.textDark;
  const subColor = onGradient ? "rgba(255,255,255,0.72)" : colors.textMuted;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 64,
        display: "flex",
        alignItems: "center",
        gap: 18,
      }}
    >
      <img
        src={staticFile("profile.png")}
        alt="BRAND"
        width={96}
        height={96}
        style={{
          width: 96,
          height: 96,
          borderRadius: "50%",
          objectFit: "cover",
          border: onGradient
            ? "2px solid rgba(255,255,255,0.35)"
            : "2px solid rgba(26,25,24,0.12)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            fontSize: 26,
            fontWeight: weights.bold,
            color: textColor,
            letterSpacing: 1,
          }}
        >
          BRAND
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: weights.regular,
            color: subColor,
            marginTop: 4,
          }}
        >
          @[IG_HANDLE]
        </span>
      </div>
    </div>
  );
};
