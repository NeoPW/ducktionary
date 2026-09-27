import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ColorPickerSheet, type ContrastCheck } from "@/components/color/color-picker-sheet";
import { SchemePreview } from "@/components/color/scheme-preview";
import { EmptyState } from "@/components/empty-state";
import { TextField } from "@/components/form/text-field";
import { Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { BASE_FIELDS, resolveScheme, type BaseColors, type ThemeMode } from "@/theme/schemes";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { contrast } from "@/utils/color";
import { askToConfirm } from "@/utils/confirm";

const MODES: readonly { value: ThemeMode; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

/** What each colour must stay readable against (mirrors where the app uses it). */
function checksFor(key: keyof BaseColors, base: BaseColors): ContrastCheck[] {
  switch (key) {
    case "background":
      return [{ label: "Text on background", against: base.text, min: 4.5 }];
    case "surface":
      return [{ label: "Text on cards", against: base.text, min: 4.5 }];
    case "text":
      return [
        { label: "On background", against: base.background, min: 4.5 },
        { label: "On cards", against: base.surface, min: 4.5 },
      ];
    case "primary":
      return [{ label: "Visible on cards", against: base.surface, min: 3 }];
    case "accent":
      return [{ label: "Text on highlight", against: base.text, min: 4.5 }];
    case "secondary":
      return [{ label: "Chip text on cards", against: base.surface, min: 4.5 }];
  }
}

export default function EditSchemeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const scheme = theme.schemes.find((s) => s.id === id);
  const [mode, setMode] = useState<ThemeMode>(theme.isDark ? "dark" : "light");
  const [editing, setEditing] = useState<keyof BaseColors | null>(null);

  if (!scheme || scheme.builtIn) {
    return (
      <Screen contentStyle={styles.centered}>
        <EmptyState
          mood="confused"
          title="Can't edit this scheme"
          message={scheme ? "Built-in schemes stay as they are. Customise one to get your own copy." : "It may have been deleted."}
          action={<Button title="Back" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  const base = scheme[mode];
  const active = theme.activeSchemeId === scheme.id;
  const field = BASE_FIELDS.find((f) => f.key === editing);

  const remove = async () => {
    const ok = await askToConfirm({
      title: "Delete this scheme?",
      message: `“${scheme.name}” will be removed.${active ? " The app switches back to Duck pond." : ""}`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    router.back();
    theme.deleteScheme(scheme.id);
  };

  return (
    <Screen>
      <TextField
        label="Name"
        value={scheme.name}
        onChangeText={(name) => theme.renameScheme(scheme.id, name)}
        onEndEditing={(e) => !e.nativeEvent.text.trim() && theme.renameScheme(scheme.id, "My scheme")}
        maxLength={40}
      />

      <View style={styles.section}>
        <SegmentedControl options={MODES} value={mode} onChange={setMode} />
        <AppText variant="caption" color="muted">
          Light and dark each have their own colours. You&apos;re editing the {mode} version.
        </AppText>
      </View>

      <SchemePreview theme={resolveScheme(scheme, mode)} />

      <View style={[styles.list, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {BASE_FIELDS.map(({ key, label, hint }, i) => {
          const failing = checksFor(key, base).filter((check) => contrast(base[key], check.against) < check.min);
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={`${label}, ${base[key]}${failing.length ? ", hard to read" : ""}`}
              android_ripple={{ color: theme.colors.border }}
              onPress={() => setEditing(key)}
              style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border }]}
            >
              <View style={[styles.swatch, { backgroundColor: base[key], borderColor: theme.colors.border }]} />
              <View style={styles.flex}>
                <AppText variant="label">{label}</AppText>
                <AppText variant="caption" color={failing.length ? "danger" : "muted"}>
                  {failing.length ? `⚠ ${failing.map((f) => f.label.toLowerCase()).join(", ")} is hard to read` : hint}
                </AppText>
              </View>
              <AppText variant="caption" color="muted">
                {base[key]}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppText variant="caption" color="muted">
        Muted text, borders, button text and chart colours are worked out from these, and adjusted
        automatically so they stay readable.
      </AppText>

      {!active && <Button title="Use this scheme" onPress={() => theme.selectScheme(scheme.id)} />}
      <Button title="Delete scheme" variant="danger" onPress={remove} />

      {editing && field && (
        <ColorPickerSheet
          title={`${field.label} · ${mode}`}
          initial={base[editing]}
          checks={checksFor(editing, base)}
          onCancel={() => setEditing(null)}
          onDone={(hex) => {
            theme.setSchemeColor(scheme.id, mode, editing, hex);
            setEditing(null);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: "center" },
  section: { gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  list: { borderRadius: radii.card, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 1 },
});
