import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { FieldShell } from "@/components/form/text-field";
import { Star } from "@/components/star-rating";
import { spacing } from "@/theme/tokens";

const STAR_SIZE = 36;

type RatingFieldProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

/** Tap the left half of a star for a half rating, the right half for a full one. Tap again to clear. */
export function RatingField({ value, onChange }: RatingFieldProps) {
  const set = (next: number | null) => onChange(next === value ? null : next);

  return (
    <FieldShell label="Rating">
      <View
        style={styles.row}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Rating"
        accessibilityValue={{ text: value == null ? "Not rated" : `${value} out of 5 stars` }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          const current = value ?? 0;
          const next = event.nativeEvent.actionName === "increment" ? current + 0.5 : current - 0.5;
          onChange(next < 0.5 ? null : Math.min(5, next));
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            hitSlop={{ top: 8, bottom: 8 }}
            onPress={(event) => set(event.nativeEvent.locationX < STAR_SIZE / 2 ? star - 0.5 : star)}
          >
            <Star size={STAR_SIZE} fill={Math.max(0, Math.min(1, (value ?? 0) - (star - 1)))} />
          </Pressable>
        ))}
        <AppText variant="label" color="muted" style={styles.value}>
          {value == null ? "Tap to rate" : `${value} / 5`}
        </AppText>
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  value: { marginLeft: spacing.sm },
});
