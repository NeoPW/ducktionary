import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type PeriodStepperProps = {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
};

/** ‹ September 2026 › */
export function PeriodStepper({ label, onPrevious, onNext, canPrevious, canNext }: PeriodStepperProps) {
  return (
    <View style={styles.row}>
      <StepButton symbol="‹" label="Previous" onPress={onPrevious} disabled={!canPrevious} />
      <AppText variant="heading" style={styles.label} accessibilityRole="header">
        {label}
      </AppText>
      <StepButton symbol="›" label="Next" onPress={onNext} disabled={!canNext} />
    </View>
  );
}

function StepButton({
  symbol,
  label,
  onPress,
  disabled,
}: {
  symbol: string;
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.35 : 1 },
      ]}
    >
      <AppText variant="title" color="primary" style={styles.symbol}>
        {symbol}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  label: { flex: 1, textAlign: "center" },
  button: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  symbol: { lineHeight: 30, marginTop: -2 },
});
