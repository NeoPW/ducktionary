import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import type { Summary } from "@/stats/compute";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";

/** Longest, fastest and favourite book of the period — tap to open. */
export function Highlights({ summary }: { summary: Summary }) {
  const { colors } = useTheme();
  const rows: { label: string; book: Book; value: string }[] = [];
  if (summary.longest?.pages) {
    rows.push({ label: "Longest book", book: summary.longest, value: `${summary.longest.pages.toLocaleString()} pages` });
  }
  if (summary.fastest) {
    rows.push({
      label: "Fastest read",
      book: summary.fastest.book,
      value: `${summary.fastest.days} ${summary.fastest.days === 1 ? "day" : "days"}`,
    });
  }
  if (summary.favourite?.rating) {
    rows.push({ label: "Favourite", book: summary.favourite, value: `${summary.favourite.rating} ★` });
  }
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText variant="heading">Highlights</AppText>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {rows.map(({ label, book, value }, i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${book.title}, ${value}`}
            android_ripple={{ color: colors.border }}
            onPress={() => router.navigate({ pathname: "/book/[id]", params: { id: book.id } })}
            style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}
          >
            <BookCover title={book.title} coverUrl={book.coverUrl} width={36} />
            <View style={styles.text}>
              <AppText variant="caption" color="muted">
                {label}
              </AppText>
              <AppText variant="label" numberOfLines={1}>
                {book.title}
              </AppText>
            </View>
            <AppText variant="label" color="muted">
              {value}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { borderRadius: radii.card, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  text: { flex: 1, gap: 2 },
});
