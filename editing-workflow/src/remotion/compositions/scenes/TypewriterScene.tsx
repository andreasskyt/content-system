import { AbsoluteFill } from "remotion";
import { TypeWriter, useViewportRect } from "remotion-bits";

interface Props {
  typewriterText?: string;
  headline?: string;
  bgColor: string;
  fps: number;
}

export const TypewriterScene: React.FC<Props> = ({
  typewriterText,
  headline,
  bgColor,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: `0 ${rect.vw * 8}px`,
        gap: rect.vmin * 4,
      }}
    >
      {typewriterText && (
        <TypeWriter
          text={typewriterText}
          typeSpeed={2}
          cursor="|"
          style={{
            fontSize: rect.vmin * 5,
            fontWeight: 600,
            color: textColor,
            fontFamily: "Poppins, system-ui, sans-serif",
            textAlign: "center",
            lineHeight: 1.4,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
