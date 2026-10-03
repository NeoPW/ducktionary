import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { FieldShell } from "@/components/form/text-field";
import { Star } from "@/components/star-rating";
import { spacing } from "@/theme/tokens";
import { MAX_RATING, nextRating, RATING_STEP, ratingLabel } from "@/utils/rating";

const STAR_SIZE = 36;

type RatingFieldProps = {
  value: number | null;
  onChange: (value: number | null) => void;
};

/** Tap a star to fill up to it; tap the last filled star again to take a quarter off, until it's gone. */
export function RatingField({ value, onChange }: RatingFieldProps) {
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
          const next = event.nativeEvent.actionName === "increment" ? current + RATING_STEP : current - RATING_STEP;
          onChange(next < RATING_STEP ? null : Math.min(MAX_RATING, next));
        }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable key={star} hitSlop={{ top: 8, bottom: 8 }} onPress={() => onChange(nextRating(value, star))}>
            <Star size={STAR_SIZE} fill={Math.max(0, Math.min(1, (value ?? 0) - (star - 1)))} />
          </Pressable>
        ))}
        <AppText variant="label" color="muted" style={styles.value}>
          {value == null ? "Tap to rate" : `${ratingLabel(value)} / 5`}
        </AppText>
      </View>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  value: { marginLeft: spacing.sm },
});
