import { Text, type TextProps } from "react-native";

import { typography, type ColorName, type TypographyVariant } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorName;
};

export function AppText({ variant = "body", color = "text", style, ...rest }: AppTextProps) {
  const { colors } = useTheme();
  return <Text style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
