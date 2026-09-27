import { useState } from "react";
import { Modal, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { GradientSlider } from "@/components/color/gradient-slider";
import { radii, spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { contrast, hexToHsl, hslToHex, normalizeHex, type Hsl } from "@/utils/color";

/** A readability requirement shown live while picking, e.g. "text on cards ≥ 4.5:1". */
export type ContrastCheck = { label: string; against: string; min: number };

const SWATCHES = [
  "#FBF6EC", "#FFFFFF", "#F2F4FA", "#1E1A17", "#111111", "#2B2622",
  "#E8833A", "#C2566F", "#3B5BDB", "#3F7D4E", "#7B5EA7", "#F4C542",
];

type ColorPickerSheetProps = {
  title: string;
  initial: string;
  checks: ContrastCheck[];
  onDone: (hex: string) => void;
  onCancel: () => void;
};

/**
 * Bottom sheet with hue / saturation / lightness sliders, a hex field and quick swatches. Works on
 * a local copy and only reports the colour on "Done", so dragging doesn't re-theme the whole app.
 * Mount it only while open (`{editing && <ColorPickerSheet … />}`).
 */
export function ColorPickerSheet({ title, initial, checks, onDone, onCancel }: ColorPickerSheetProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [hsl, setHsl] = useState<Hsl>(() => hexToHsl(initial));
  const [hexText, setHexText] = useState(initial);
  const hex = hslToHex(hsl);

  const setFromHsl = (next: Hsl) => {
    setHsl(next);
    setHexText(hslToHex(next));
  };
  const setFromHex = (value: string) => {
    const normalized = normalizeHex(value);
    if (normalized) setFromHsl(hexToHsl(normalized));
  };

  const hueStops = [0, 60, 120, 180, 240, 300, 360].map((h) => hslToHex({ h, s: 100, l: 50 }));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cancel">
        <View
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.lg }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <View style={[styles.preview, { backgroundColor: hex, borderColor: colors.border }]} />
            <View style={styles.flex}>
              <AppText variant="heading">{title}</AppText>
              <TextInput
                value={hexText}
                onChangeText={setHexText}
                onSubmitEditing={() => setFromHex(hexText)}
                onBlur={() => setFromHex(hexText)}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                accessibilityLabel="Hex colour code"
                selectionColor={colors.primary}
                style={[styles.hexInput, typography.body, { color: colors.text, borderColor: colors.border }]}
              />
            </View>
          </View>

          <GradientSlider
            label="Hue"
            valueText={`${Math.round(hsl.h)} degrees`}
            value={hsl.h / 360}
            onChange={(v) => setFromHsl({ ...hsl, h: v * 360 })}
            stops={hueStops}
          />
          <GradientSlider
            label="Saturation"
            valueText={`${Math.round(hsl.s)} percent`}
            value={hsl.s / 100}
            onChange={(v) => setFromHsl({ ...hsl, s: v * 100 })}
            stops={[hslToHex({ ...hsl, s: 0 }), hslToHex({ ...hsl, s: 100 })]}
          />
          <GradientSlider
            label="Lightness"
            valueText={`${Math.round(hsl.l)} percent`}
            value={hsl.l / 100}
            onChange={(v) => setFromHsl({ ...hsl, l: v * 100 })}
            stops={["#000000", hslToHex({ ...hsl, l: 50 }), "#FFFFFF"]}
          />

          <View style={styles.swatches}>
            {SWATCHES.map((swatch) => (
              <Pressable
                key={swatch}
                accessibilityRole="button"
                accessibilityLabel={`Use ${swatch}`}
                onPress={() => setFromHex(swatch)}
                style={[styles.swatch, { backgroundColor: swatch, borderColor: colors.border }]}
              />
            ))}
          </View>

          {checks.map((check) => {
            const ratio = contrast(hex, check.against);
            const ok = ratio >= check.min;
            return (
              <AppText key={check.label} variant="caption" color={ok ? "muted" : "danger"}>
                {ok ? "✓" : "⚠"} {check.label}: {ratio.toFixed(1)}:1{ok ? "" : ` — aim for ${check.min}:1 or more`}
              </AppText>
            );
          })}

          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button title="Cancel" variant="ghost" onPress={onCancel} />
            </View>
            <View style={styles.flex}>
              <Button title="Done" onPress={() => onDone(hex)} />
            </View>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: radii.card + 6,
    borderTopRightRadius: radii.card + 6,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  preview: { width: 64, height: 64, borderRadius: radii.card, borderWidth: 1 },
  hexInput: {
    marginTop: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.cover,
    borderWidth: 1,
  },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 1 },
  actions: { flexDirection: "row", gap: spacing.md },
});
