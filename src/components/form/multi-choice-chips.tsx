import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { FieldShell } from "@/components/form/text-field";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type MultiChoiceChipsProps<T extends string | number | null> = {
  label: string;
  options: readonly { value: T; label: string }[];
  /** Selected values; empty means "any". */
  values: readonly T[];
  onChange: (values: T[]) => void;
};

/** Pick any number of options (for filters); nothing picked means "any". Looks like `ChoiceChips`. */
export function MultiChoiceChips<T extends string | number | null>({ label, options, values, onChange }: MultiChoiceChipsProps<T>) {
  const { colors } = useTheme();
  return (
    <FieldShell label={label}>
      <View style={styles.row} accessibilityLabel={label}>
        {options.map((option, i) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              key={`${String(option.value)}-${i}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() =>
                onChange(selected ? values.filter((v) => v !== option.value) : [...values, option.value])
              }
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: colors.accent, borderColor: colors.accent }
                  : { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <AppText variant="label" color={selected ? "text" : "muted"}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
});
