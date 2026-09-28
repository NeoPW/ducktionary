import { StyleSheet } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { fonts, spacing } from "@/theme/tokens";

type StatTileProps = {
  label: string;
  value: string;
  detail?: string;
};

/** One figure: label, value (sans, never serif), optional context line. */
export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <Card
      style={styles.tile}
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
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    padding: spacing.md,
    gap: 2,
  },
  value: { fontFamily: fonts.sansBold, fontSize: 22, lineHeight: 28 },
});
