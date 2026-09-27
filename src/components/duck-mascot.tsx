import Svg, { Circle, Ellipse, Path, Rect, Text as SvgText } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

export type DuckMood = "reading" | "sleepy" | "celebrating" | "confused" | "scanning";

type DuckMascotProps = {
  mood?: DuckMood;
  size?: number;
};

/** Placeholder vector duck. Swap the drawing for illustrated art later; the props stay the same. */
export function DuckMascot({ mood = "reading", size = 120 }: DuckMascotProps) {
  const { colors } = useTheme();
  const ink = "#2B2622";
  const wing = "#E3AE2A";

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel={`Duck mascot, ${mood}`}>
      {/* tail + body */}
      <Path d="M96 70 L114 58 L106 80 Z" fill={colors.accent} />
      <Ellipse cx={64} cy={82} rx={42} ry={27} fill={colors.accent} />
      <Path d="M58 76 Q76 66 92 80 Q78 94 60 88 Z" fill={wing} />

      {/* head + bill */}
      <Circle cx={42} cy={46} r={23} fill={colors.accent} />
      <Path d="M22 47 Q6 44 4 51 Q9 58 25 55 Z" fill={colors.primary} />

      {/* eye */}
      {mood === "sleepy" ? (
        <Path d="M31 42 Q36 46 41 42" stroke={ink} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      ) : (
        <>
          <Circle cx={36} cy={41} r={mood === "scanning" ? 5 : 4} fill={ink} />
          <Circle cx={37.5} cy={39.5} r={1.4} fill="#FFFFFF" />
        </>
      )}

      {mood === "reading" && (
        <>
          <Rect x={14} y={70} width={30} height={22} rx={2} fill={colors.secondary} />
          <Path d="M29 70 L29 92" stroke="#FFFFFF" strokeWidth={1.5} />
        </>
      )}
      {mood === "sleepy" && (
        <SvgText x={66} y={30} fontSize={18} fontWeight="bold" fill={colors.muted}>
          z z
        </SvgText>
      )}
      {mood === "confused" && (
        <SvgText x={64} y={32} fontSize={26} fontWeight="bold" fill={colors.primary}>
          ?
        </SvgText>
      )}
      {mood === "celebrating" && (
        <>
          <Circle cx={74} cy={18} r={3} fill={colors.primary} />
          <Circle cx={90} cy={30} r={2.5} fill={colors.secondary} />
          <Rect x={80} y={10} width={5} height={5} fill={colors.star} rotation={30} origin="82, 12" />
          <Circle cx={16} cy={20} r={2.5} fill={colors.secondary} />
        </>
      )}
    </Svg>
  );
}
