import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export function CategoryChips({ categories }: { categories: string[] }) {
  const { colors } = useTheme();
  if (categories.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {categories.map((name) => (
        <View key={name} style={[styles.chip, { borderColor: colors.secondary }]}>
          <AppText variant="caption" color="secondary">
            {name}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
