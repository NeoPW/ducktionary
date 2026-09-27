import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/components/app-text";
import { radii, spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type TextFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
  error?: string | null;
};

export function TextField({ label, error, multiline, ...rest }: TextFieldProps) {
  const { colors } = useTheme();
  return (
    <FieldShell label={label} error={error}>
      <TextInput
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          typography.body,
          multiline && styles.multiline,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
        {...rest}
      />
    </FieldShell>
  );
}

/** Label + control + error message, shared by all form fields. */
export function FieldShell({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <AppText variant="label" color="muted">
        {label}
      </AppText>
      {children}
      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  multiline: { minHeight: 120, paddingTop: spacing.md },
});
