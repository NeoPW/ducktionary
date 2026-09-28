import { useSegments } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type ScreenProps = {
  children: ReactNode;
  /** Wrap content in a ScrollView. Disable for screens that render their own list (and pad it with `useBottomInset`). */
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Room to leave below the content for Android's navigation bar. Tab screens get 0 — the tab bar
 * already sits above it; screens outside the tabs (settings) draw edge to edge and need the inset.
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  const inTabs = useSegments()[0] === "(tabs)";
  return inTabs ? 0 : insets.bottom;
}

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const { colors } = useTheme();
  const bottomInset = useBottomInset();

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
      contentContainerStyle={[styles.content, { paddingBottom: spacing.lg + bottomInset }, contentStyle]}
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
