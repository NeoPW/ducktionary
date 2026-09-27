import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type StatTileProps = {
  label: string;
  value: string;
  detail?: string;
};

/** One figure: label, value (sans, never serif), optional context line. */
export function StatTile({ label, value, detail }: StatTileProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ""}`}
    >
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
      <AppText numberOfLines={1} adjustsFontSizeToFit style={styles.value}>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {detail}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: 2,
  },
  value: { fontFamily: fonts.sansBold, fontSize: 22, lineHeight: 28 },
});
