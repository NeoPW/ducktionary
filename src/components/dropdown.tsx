import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type DropdownProps<T extends string> = {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** A select field that opens a bottom sheet of options. */
export function Dropdown<T extends string>({ value, options, onChange, accessibilityLabel }: DropdownProps<T>) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}: ${current.label}`}
        onPress={() => setOpen(true)}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <AppText variant="heading" numberOfLines={1} style={styles.flex}>
          {current.label}
        </AppText>
        <AppText variant="label" color="primary">
          ▾
        </AppText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close">
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <AppText variant="label" color="muted" style={styles.sheetTitle}>
              {accessibilityLabel}
            </AppText>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  android_ripple={{ color: colors.border }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={styles.option}
                >
                  <AppText style={styles.flex} color={selected ? "text" : "muted"}>
                    {option.label}
                  </AppText>
                  {selected && (
                    <AppText variant="label" color="primary">
                      ✓
                    </AppText>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: radii.card + 6,
    borderTopRightRadius: radii.card + 6,
    paddingTop: spacing.lg,
  },
  sheetTitle: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: spacing.xl,
  },
});
