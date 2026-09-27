import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Disable for screens that render their own list. */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const { colors } = useTheme();

  if (!scroll) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.fill, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
});
