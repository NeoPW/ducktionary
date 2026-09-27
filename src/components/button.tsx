import { Pressable, StyleSheet, type PressableProps } from "react-native";

import { AppText } from "@/components/app-text";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  title: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ title, variant = "primary", disabled, ...rest }: ButtonProps) {
  const { colors } = useTheme();

  const background =
    variant === "primary" ? colors.primary : variant === "secondary" ? colors.surface : "transparent";
  const textColor = variant === "primary" ? "onPrimary" : variant === "danger" ? "danger" : "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      android_ripple={{ color: colors.border, borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor:
            variant === "secondary" ? colors.border : variant === "danger" ? colors.danger : "transparent",
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
      ]}
      {...rest}
    >
      <AppText variant="label" color={textColor}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
