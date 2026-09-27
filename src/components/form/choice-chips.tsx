import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { FieldShell } from "@/components/form/text-field";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type ChoiceChipsProps<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  /** Tapping the selected chip again clears the choice. */
  onChange: (value: T | null) => void;
};

/** Pick one of a few options, or none. */
export function ChoiceChips<T extends string>({ label, options, value, onChange }: ChoiceChipsProps<T>) {
  const { colors } = useTheme();
  return (
    <FieldShell label={label}>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityHint={selected ? "Tap again to clear" : undefined}
              onPress={() => onChange(selected ? null : option.value)}
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
