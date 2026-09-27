import { StyleSheet, Text, View } from "react-native";

import type { ResolvedTheme } from "@/theme/schemes";
import { fonts, radii, spacing, typography } from "@/theme/tokens";

/**
 * A miniature of the app drawn with an arbitrary scheme's colours (not the active theme), so a
 * scheme can be judged before it's switched on.
 */
export function SchemePreview({ theme }: { theme: ResolvedTheme }) {
  const { colors: c, charts } = theme;
  const bars = [0.45, 0.8, 0.6, 1, 0.7];

  return (
    <View
      style={[styles.screen, { backgroundColor: c.background, borderColor: c.border }]}
      accessibilityLabel="Preview of the colour scheme"
    >
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.cover, { backgroundColor: c.surface, borderColor: c.accent }]}>
          <Text style={[styles.coverTitle, { color: c.text }]}>Dune</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[typography.heading, { color: c.text }]}>Dune</Text>
          <Text style={[typography.label, { color: c.muted }]}>Frank Herbert</Text>
          <Text style={{ color: c.star, fontSize: 14 }}>★★★★½</Text>
          <View style={[styles.chip, { borderColor: c.secondary }]}>
            <Text style={[typography.caption, { color: c.secondary }]}>Science fiction</Text>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.button, { backgroundColor: c.primary }]}>
          <Text style={[typography.label, { color: c.onPrimary }]}>Add to library</Text>
        </View>
        <View style={[styles.segment, { backgroundColor: c.accent }]}>
          <Text style={[typography.label, { color: c.text }]}>Year</Text>
        </View>
      </View>

      <View style={[styles.card, styles.chartCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        {bars.map((h, i) => (
          <View key={`c${i}`} style={[styles.bar, { height: 40 * h, backgroundColor: c.chart }]} />
        ))}
        <View style={styles.gap} />
        {charts.ordinal.map((color, i) => (
          <View key={`o${i}`} style={[styles.bar, { height: 16 + i * 6, backgroundColor: color }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { padding: spacing.md, gap: spacing.md, borderRadius: radii.card, borderWidth: 1 },
  flex: { flex: 1, gap: 2 },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  cover: {
    width: 48,
    height: 72,
    borderRadius: radii.cover,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  coverTitle: { fontFamily: fonts.serif, fontSize: 12 },
  chip: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  button: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill },
  segment: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs + 2, borderRadius: radii.pill },
  chartCard: { alignItems: "flex-end", height: 72, gap: 6 },
  bar: { width: 14, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  gap: { width: spacing.md },
});
