import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type SegmentedControlProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: colors.accent }]}
          >
            <AppText variant="label" color={selected ? "text" : "muted"} numberOfLines={1}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
});
