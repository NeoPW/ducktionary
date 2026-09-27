import { DateTimePicker } from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { FieldShell } from "@/components/form/text-field";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { IsoDate } from "@/types";
import { formatDate, parseIsoDate, toIsoDate, todayIso } from "@/utils/dates";

/*
 * The Android (Material 3) picker works in UTC midnights: it reads the initial value's UTC day and
 * returns the picked day at 00:00 UTC. iOS works in local time. Convert at this boundary only.
 */
const isAndroid = Platform.OS === "android";

function toPickerDate(iso: IsoDate): Date {
  if (!isAndroid) return parseIsoDate(iso);
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromPickerDate(date: Date): IsoDate {
  if (!isAndroid) return toIsoDate(date);
  return toIsoDate(new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

type DateFieldProps = {
  label: string;
  value: IsoDate | null;
  onChange: (value: IsoDate | null) => void;
  /** Shows a "Clear" action for optional dates. */
  clearable?: boolean;
  minimumDate?: IsoDate | null;
  maximumDate?: IsoDate | null;
  error?: string | null;
};

export function DateField({
  label,
  value,
  onChange,
  clearable,
  minimumDate,
  maximumDate,
  error,
}: DateFieldProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const picker = (
    <DateTimePicker
      value={toPickerDate(value ?? maximumDate ?? todayIso())}
      mode="date"
      display={isAndroid ? "default" : "compact"}
      accentColor={colors.primary}
      minimumDate={minimumDate ? toPickerDate(minimumDate) : undefined}
      maximumDate={maximumDate ? toPickerDate(maximumDate) : undefined}
      onValueChange={(_, date) => {
        setOpen(false);
        onChange(fromPickerDate(date));
      }}
      onDismiss={() => setOpen(false)}
    />
  );

  // iOS renders the compact picker inline; Android opens a dialog while `open` is set.
  const showInlinePicker = !isAndroid && value != null;

  return (
    <FieldShell label={label} error={error}>
      <View style={styles.row}>
        {showInlinePicker ? (
          <View style={styles.flex}>{picker}</View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value ? formatDate(value) : "not set"}`}
            onPress={() => (isAndroid ? setOpen(true) : onChange(maximumDate ?? todayIso()))}
            style={[
              styles.button,
              { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border },
            ]}
          >
            <AppText color={value ? "text" : "muted"}>{value ? formatDate(value) : "Add date"}</AppText>
          </Pressable>
        )}
        {clearable && value ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onChange(null)}>
            <AppText variant="label" color="primary">
              Clear
            </AppText>
          </Pressable>
        ) : null}
      </View>
      {isAndroid && open ? picker : null}
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1, alignItems: "flex-start" },
  button: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
  },
});
