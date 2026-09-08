import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";
import { AnimatedText, StaggeredMotion, useViewportRect } from "remotion-bits";
import * as LucideIcons from "lucide-react";

const ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  TrendingUp: LucideIcons.TrendingUp,
  TrendingDown: LucideIcons.TrendingDown,
  Puzzle: LucideIcons.Puzzle,
  Lock: LucideIcons.Lock,
  Unlock: LucideIcons.Unlock,
  Lightbulb: LucideIcons.Lightbulb,
  Rocket: LucideIcons.Rocket,
  Target: LucideIcons.Target,
  Shield: LucideIcons.Shield,
  Zap: LucideIcons.Zap,
  Cog: LucideIcons.Cog,
  CheckCircle: LucideIcons.CheckCircle,
  XCircle: LucideIcons.XCircle,
  AlertTriangle: LucideIcons.AlertTriangle,
  ArrowRight: LucideIcons.ArrowRight,
  ArrowUp: LucideIcons.ArrowUp,
  RefreshCw: LucideIcons.RefreshCw,
  Link: LucideIcons.Link,
  Unlink: LucideIcons.Unlink,
  Layers: LucideIcons.Layers,
  Building: LucideIcons.Building,
  Users: LucideIcons.Users,
  DollarSign: LucideIcons.DollarSign,
  BarChart: LucideIcons.BarChart3,
  PieChart: LucideIcons.PieChart,
  Activity: LucideIcons.Activity,
  Hammer: LucideIcons.Hammer,
  Wrench: LucideIcons.Wrench,
  FlaskConical: LucideIcons.FlaskConical,
  Brain: LucideIcons.Brain,
  Eye: LucideIcons.Eye,
  Heart: LucideIcons.Heart,
  Star: LucideIcons.Star,
  Crown: LucideIcons.Crown,
  Trophy: LucideIcons.Trophy,
  Flag: LucideIcons.Flag,
  Clock: LucideIcons.Clock,
  Calendar: LucideIcons.Calendar,
  Mail: LucideIcons.Mail,
  MessageSquare: LucideIcons.MessageSquare,
  Phone: LucideIcons.Phone,
  X: LucideIcons.X,
  Check: LucideIcons.Check,
  Settings: LucideIcons.Settings,
  Search: LucideIcons.Search,
  Globe: LucideIcons.Globe,
  Database: LucideIcons.Database,
  Server: LucideIcons.Server,
  Cpu: LucideIcons.Cpu,
};

interface Props {
  visualIcons?: string[];
  visualLayout?: "single" | "pair" | "sequence";
  headline?: string;
  bgColor: string;
  fps: number;
}

export const VisualScene: React.FC<Props> = ({
  visualIcons = [],
  visualLayout = "single",
  headline,
  bgColor,
  fps,
}) => {
  const frame = useCurrentFrame();
  const rect = useViewportRect();
  const isDark = bgColor === "#000000";
  const iconColor = "#BCAC8B";
  const textColor = isDark ? "#FFFFFF" : "#303b2f";

  const icons = visualIcons
    .map((name) => ICON_MAP[name])
    .filter(Boolean);

  if (icons.length === 0) {
    icons.push(LucideIcons.Zap);
  }

  const iconSize = visualLayout === "single" ? rect.vmin * 25 : rect.vmin * 16;

  const renderIcon = (Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>, index: number) => {
    const delay = index * 8;
    const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });
    const scale = Math.max(0, s);
    const rotate = (1 - s) * 15;

    return (
      <div
        key={index}
        style={{
          transform: `scale(${scale}) rotate(${rotate}deg)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={iconSize} color={iconColor} strokeWidth={1.5} />
      </div>
    );
  };

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: rect.vmin * 4,
      }}
    >
      {/* Icons */}
      {visualLayout === "single" && icons.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          {renderIcon(icons[0], 0)}
        </div>
      )}

      {visualLayout === "pair" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: rect.vmin * 8 }}>
          {icons.slice(0, 2).map((Icon, i) => renderIcon(Icon, i))}
        </div>
      )}

      {visualLayout === "sequence" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: rect.vmin * 4 }}>
          {icons.slice(0, 3).map((Icon, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: rect.vmin * 4 }}>
              {renderIcon(Icon, i)}
              {i < Math.min(icons.length, 3) - 1 && (
                <div style={{
                  opacity: spring({ frame: frame - (i + 1) * 8 - 5, fps, config: { damping: 15 } }),
                  color: "rgba(188,172,139,0.4)",
                  fontSize: rect.vmin * 4,
                }}>
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Optional headline */}
      {headline && (
        <AnimatedText
          transition={{
            split: "word",
            splitStagger: 4,
            opacity: [0, 1],
            y: [rect.vmin * 2, 0],
            duration: 12,
            delay: Math.round(fps * 0.5),
            easing: "easeOutCubic",
          }}
          style={{
            fontSize: rect.vmin * 3.5,
            fontWeight: 500,
            color: "rgba(188,172,139,0.7)",
            fontFamily: "Poppins, system-ui, sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textAlign: "center",
            display: "block",
            width: "100%",
          }}
        >
          {headline}
        </AnimatedText>
      )}
    </AbsoluteFill>
  );
};
