import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { Card } from "@/components/card";
import type { Summary } from "@/stats/summary";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";
import { DAYS, plural } from "@/utils/format";

type Highlight = { label: string; books: Book[]; value: (book: Book) => string };

/** Longest, fastest and favourite book of the period. Ties can be swiped through; tap to open. */
export function Highlights({ summary }: { summary: Summary }) {
  const { colors } = useTheme();
  const rows: Highlight[] = [];
  if (summary.longest.length > 0) {
    rows.push({ label: "Longest book", books: summary.longest, value: (b) => `${b.pages?.toLocaleString()} pages` });
  }
  if (summary.fastest) {
    const { days } = summary.fastest;
    rows.push({ label: "Fastest read", books: summary.fastest.books, value: () => plural(days, DAYS) });
  }
  if (summary.favourite.length > 0) {
    rows.push({ label: "Favourite", books: summary.favourite, value: (b) => `${b.rating} ★` });
  }
  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <AppText variant="heading">Highlights</AppText>
      <Card style={styles.card}>
        {rows.map((row, i) => (
          <View
            key={row.label}
            style={i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }}
          >
            {/* Remount when the tied books change so the pager starts at the first one. */}
            <HighlightRow key={row.books.map((b) => b.id).join(",")} highlight={row} />
          </View>
        ))}
      </Card>
    </View>
  );
}

function HighlightRow({ highlight }: { highlight: Highlight }) {
  const { colors } = useTheme();
  const { label, books, value } = highlight;
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const tied = books.length > 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          horizontal
          pagingEnabled
          nestedScrollEnabled
          scrollEnabled={tied}
          showsHorizontalScrollIndicator={false}
          data={books}
          keyExtractor={(book) => String(book.id)}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: position }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label}${tied ? `, ${position + 1} of ${books.length} tied` : ""}: ${item.title}, ${value(item)}`}
              accessibilityHint={tied ? "Swipe left or right for the other tied books" : undefined}
              android_ripple={{ color: colors.border }}
              onPress={() => router.navigate({ pathname: "/book/[id]", params: { id: item.id } })}
              style={[styles.page, { width }]}
            >
              <BookCover title={item.title} coverUrl={item.coverUrl} width={36} />
              <View style={styles.text}>
                <AppText variant="caption" color="muted">
                  {label}
                </AppText>
                <AppText variant="label" numberOfLines={1}>
                  {item.title}
                </AppText>
              </View>
              <AppText variant="label" color="muted">
                {value(item)}
              </AppText>
            </Pressable>
          )}
        />
      )}
      {tied && (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {books.map((book, i) => (
            <View
              key={book.id}
              style={[styles.dot, { backgroundColor: i === index ? colors.primary : colors.border }]}
            />
          ))}
          <AppText variant="caption" color="muted" style={styles.swipe}>
            {index + 1} of {books.length}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { overflow: "hidden" },
  page: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  text: { flex: 1, gap: 2 },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingBottom: spacing.sm,
    marginTop: -spacing.xs,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  swipe: { marginLeft: spacing.xs },
});
