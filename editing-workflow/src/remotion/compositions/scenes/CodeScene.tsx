import { AbsoluteFill } from "remotion";
import { CodeBlock, useViewportRect } from "remotion-bits";

interface Props {
  codeSnippet?: string;
  codeLanguage?: string;
  bgColor: string;
  fps: number;
}

export const CodeScene: React.FC<Props> = ({
  codeSnippet,
  codeLanguage = "typescript",
  bgColor,
  fps,
}) => {
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: `${rect.vmin * 6}px`,
      }}
    >
      <CodeBlock
        code={codeSnippet ?? "// no code provided"}
        language={codeLanguage}
        theme={isDark ? "dark" : "light"}
        fontSize={rect.vmin * 2.8}
        lineHeight={1.6}
        padding={rect.vmin * 3}
        showLineNumbers
        lineNumberColor={isDark ? "#555" : "#aaa"}
        style={{
          borderRadius: rect.vmin * 1.5,
          width: "100%",
          maxWidth: rect.width * 0.9,
        }}
        transition={{
          opacity: [0, 1],
          y: [rect.vmin * 1, 0],
          duration: Math.round(fps * 0.3),
          lineStagger: 3,
          lineStaggerDirection: "forward",
          easing: "easeOutCubic",
        }}
      />
    </AbsoluteFill>
  );
};
