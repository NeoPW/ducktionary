import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import type { Bar } from "@/stats/charts";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

const BAR_THICKNESS = 14;

/**
 * Ranked horizontal bars with the value at each tip — every value is readable without tapping. Rows with books
 * behind them open those books when `onOpen` is given.
 */
export function RowChart({ bars, onOpen }: { bars: Bar[]; onOpen?: (bar: Bar) => void }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...bars.map((b) => b.value));

  return (
    <View style={styles.list}>
      {bars.map((bar) => (
        <Pressable
          key={bar.key}
          style={styles.row}
          disabled={!onOpen || !bar.filter || bar.value === 0}
          onPress={() => onOpen?.(bar)}
          accessibilityRole={onOpen && bar.filter ? "button" : undefined}
          accessibilityLabel={`${bar.label}: ${bar.value}`}
          accessibilityHint={onOpen && bar.filter ? "Shows these books in your library" : undefined}
        >
          <AppText variant="label" numberOfLines={1} style={styles.label}>
            {bar.label}
          </AppText>
          <View style={styles.track}>
            <View
              style={[
                styles.bar,
                // Leave room at the end of the track for the value label.
                { width: `${Math.max(2, (bar.value / max) * 82)}%`, backgroundColor: colors.chart },
              ]}
            />
            <AppText variant="caption" color="muted" style={styles.value}>
              {bar.value.toLocaleString()}
            </AppText>
          </View>
          <AppText variant="label" color="muted" style={styles.chevron}>
            {onOpen && bar.filter && bar.value > 0 ? "›" : ""}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { width: "38%" },
  track: { flex: 1, flexDirection: "row", alignItems: "center" },
  bar: {
    height: BAR_THICKNESS,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  value: { marginLeft: spacing.xs },
  chevron: { width: 10 },
});
