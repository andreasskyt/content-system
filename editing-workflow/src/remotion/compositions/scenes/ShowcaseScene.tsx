import { AbsoluteFill, staticFile } from "remotion";
import { ScrollingColumns, AnimatedText, useViewportRect } from "remotion-bits";

interface Props {
  imageSrcs?: string[];
  headline?: string;
  bgColor: string;
  fps: number;
}

export const ShowcaseScene: React.FC<Props> = ({
  imageSrcs,
  headline,
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";

  const images = (imageSrcs ?? []).map((s) =>
    s.startsWith("broll-inspiration/") ? staticFile(s) : s
  );

  // Distribute images across 3 columns with alternating directions
  const col1 = images.filter((_, i) => i % 3 === 0);
  const col2 = images.filter((_, i) => i % 3 === 1);
  const col3 = images.filter((_, i) => i % 3 === 2);

  // Ensure each column has at least one image by cycling
  const fill = (arr: string[]) => {
    if (arr.length > 0) return arr;
    return images.length > 0 ? [images[0]] : [];
  };

  const columns = [
    { images: fill(col1), speed: 80, direction: "up" as const },
    { images: fill(col2), speed: 60, direction: "down" as const },
    { images: fill(col3), speed: 70, direction: "up" as const },
  ];

  return (
    <AbsoluteFill>
      <ScrollingColumns
        columns={columns}
        height={rect.height * 0.35}
        gap={rect.vmin * 2}
        columnGap={rect.vmin * 2}
        style={{ opacity: 0.85 }}
        imageStyle={{ borderRadius: rect.vmin * 1.5 }}
      />

      {headline && (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            paddingBottom: rect.vmin * 6,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.65)",
              padding: `${rect.vmin * 1.5}px ${rect.vmin * 4}px`,
              borderRadius: rect.vmin * 1,
            }}
          >
            <AnimatedText
              transition={{
                split: "word",
                splitStagger: 3,
                opacity: [0, 1],
                y: [rect.vmin * 2, 0],
                duration: Math.round(fps * 0.6),
                delay: Math.round(fps * 0.4),
                easing: "easeOutCubic",
              }}
              style={{
                fontSize: rect.vmin * 5,
                fontWeight: 700,
                color: "#FFFFFF",
                fontFamily: "Poppins, system-ui, sans-serif",
                textAlign: "center",
              }}
            >
              {headline}
            </AnimatedText>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
