import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/app-text";
import { FieldShell } from "@/components/form/text-field";
import { radii, spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type ChipInputProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Tappable suggestions (e.g. categories already in the library). */
  suggestions?: string[];
};

/** A list of short values entered one at a time. Enter adds the typed value; tap a chip to remove it. */
export function ChipInput({ label, values, onChange, placeholder, suggestions = [] }: ChipInputProps) {
  const { colors } = useTheme();
  const [draft, setDraft] = useState("");

  const has = (name: string) => values.some((v) => v.toLowerCase() === name.toLowerCase());

  const add = (raw: string) => {
    const name = raw.trim();
    if (name && !has(name)) onChange([...values, name]);
    setDraft("");
  };

  const typed = draft.trim().toLowerCase();
  const visibleSuggestions = suggestions
    .filter((s) => !has(s) && (!typed || s.toLowerCase().includes(typed)))
    .slice(0, 8);

  return (
    <FieldShell label={label}>
      {values.length > 0 && (
        <View style={styles.wrap}>
          {values.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${value}`}
              onPress={() => onChange(values.filter((v) => v !== value))}
              style={[styles.chip, { backgroundColor: colors.secondary, borderColor: colors.secondary }]}
            >
              <AppText variant="caption" color="surface">
                {value}  ×
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={() => add(draft)}
        onBlur={() => add(draft)}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        style={[
          styles.input,
          typography.body,
          { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      />
      {visibleSuggestions.length > 0 && (
        <View style={styles.wrap}>
          {visibleSuggestions.map((suggestion) => (
            <Pressable
              key={suggestion}
              accessibilityRole="button"
              accessibilityLabel={`Add ${suggestion}`}
              onPress={() => add(suggestion)}
              style={[styles.chip, styles.suggestion, { borderColor: colors.border }]}
            >
              <AppText variant="caption" color="muted">
                + {suggestion}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  suggestion: { borderStyle: "dashed" },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
  },
});
