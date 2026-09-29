import { router } from "expo-router";
import { Pressable, StyleSheet, Switch, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { Mascot } from "@/components/mascot";
import { useGoose } from "@/components/goose/goose-visits";
import { Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { BackupSection } from "@/components/settings/backup-section";
import type { ColorScheme } from "@/theme/schemes";
import { radii, spacing } from "@/theme/tokens";
import { useTheme, type ThemePreference } from "@/theme/use-theme";

const MODES: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsScreen() {
  const { colors, preference, setPreference, schemes, activeSchemeId, selectScheme, duplicateScheme } = useTheme();
  const goose = useGoose();

  const customise = (id: string) => {
    const copyId = duplicateScheme(id);
    router.push({ pathname: "/settings/scheme/[id]", params: { id: copyId } });
  };

  return (
    <Screen>
      <View style={styles.section}>
        <AppText variant="heading">Appearance</AppText>
        <SegmentedControl options={MODES} value={preference} onChange={setPreference} />
        <AppText variant="caption" color="muted">
          System follows your phone&apos;s light or dark setting.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Colour scheme</AppText>
        {schemes.map((scheme) => (
          <SchemeRow
            key={scheme.id}
            scheme={scheme}
            selected={scheme.id === activeSchemeId}
            onSelect={() => selectScheme(scheme.id)}
            onEdit={() =>
              scheme.builtIn
                ? customise(scheme.id)
                : router.push({ pathname: "/settings/scheme/[id]", params: { id: scheme.id } })
            }
          />
        ))}
        <AppText variant="caption" color="muted">
          Built-in schemes stay as they are — “Customise” makes your own copy to edit.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="heading">Goose</AppText>
        <Card style={styles.gooseCard}>
          <Mascot mood="confused" size={64} />
          <View style={styles.flex}>
            <AppText variant="label">Surprise goose visits</AppText>
            <AppText variant="caption" color="muted">
              Every few minutes a goose or duckling may pop up or waddle by. Poke it and it runs.
            </AppText>
          </View>
          <Switch
            value={goose.enabled}
            onValueChange={goose.setEnabled}
            accessibilityLabel="Surprise goose visits"
            trackColor={{ true: colors.primary, false: colors.border }}
            thumbColor={colors.surface}
          />
        </Card>
        <Button title="Summon the goose" variant="secondary" onPress={goose.summon} />
      </View>

      <BackupSection />
    </Screen>
  );
}

function SchemeRow({
  scheme,
  selected,
  onSelect,
  onEdit,
}: {
  scheme: ColorScheme;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const { colors, isDark } = useTheme();
  const base = isDark ? scheme.dark : scheme.light;
  const swatches = [base.background, base.surface, base.primary, base.accent, base.secondary];

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.surface, borderColor: selected ? colors.primary : colors.border },
        selected && styles.rowSelected,
      ]}
    >
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={scheme.name}
        onPress={onSelect}
        style={styles.select}
      >
        <View style={styles.swatches}>
          {swatches.map((color, i) => (
            <View key={i} style={[styles.swatch, { backgroundColor: color, borderColor: colors.border }]} />
          ))}
        </View>
        <View style={styles.flex}>
          <AppText variant="label" numberOfLines={1}>
            {scheme.name}
          </AppText>
          <AppText variant="caption" color="muted">
            {scheme.builtIn ? "Built in" : "Your scheme"}
            {selected ? " · in use" : ""}
          </AppText>
        </View>
        {selected && (
          <AppText variant="label" color="primary">
            ✓
          </AppText>
        )}
      </Pressable>
      <View style={styles.edit}>
        <Button title={scheme.builtIn ? "Customise" : "Edit"} variant="ghost" onPress={onEdit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  gooseCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.card,
    borderWidth: 1,
    paddingLeft: spacing.md,
  },
  rowSelected: { borderWidth: 2 },
  select: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  swatches: { flexDirection: "row" },
  swatch: { width: 18, height: 30, borderWidth: StyleSheet.hairlineWidth, marginRight: -4, borderRadius: 4 },
  edit: { minWidth: 110 },
});
