import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { Card } from "@/components/card";
import { encodeFilter } from "@/library/filter";
import type { Summary } from "@/stats/summary";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";
import { BOOKS, DAYS, plural } from "@/utils/format";

/** One thing a highlight points at — a book or a series. Tied items can be swiped through. */
type Item = { key: string; title: string; coverUrl: string | null; value: string; open: () => void };
type Highlight = { label: string; items: Item[] };

const openBook = (book: Book) => () => router.navigate({ pathname: "/book/[id]", params: { id: book.id } });
const bookItems = (books: Book[], value: (book: Book) => string): Item[] =>
  books.map((book) => ({
    key: `book-${book.id}`,
    title: book.title,
    coverUrl: book.coverUrl,
    value: value(book),
    open: openBook(book),
  }));

/**
 * Longest, fastest and slowest read, favourite and longest series of the period. Ties can be swiped through;
 * tap to open.
 */
export function Highlights({ summary }: { summary: Summary }) {
  const { colors } = useTheme();
  const rows: Highlight[] = [];
  if (summary.longest.length > 0) {
    const pages = (b: Book) => `${b.pages?.toLocaleString()} pages`;
    rows.push({ label: "Longest book", items: bookItems(summary.longest, pages) });
  }
  if (summary.fastest) {
    const { days } = summary.fastest;
    rows.push({ label: "Fastest read", items: bookItems(summary.fastest.books, () => plural(days, DAYS)) });
  }
  if (summary.slowest && summary.slowest.days !== summary.fastest?.days) {
    const { days } = summary.slowest;
    rows.push({ label: "Longest read", items: bookItems(summary.slowest.books, () => plural(days, DAYS)) });
  }
  if (summary.favourite.length > 0) {
    rows.push({ label: "Favourite", items: bookItems(summary.favourite, (b) => `${b.rating} ★`) });
  }
  if (summary.longestSeries.length > 0) {
    rows.push({
      label: "Longest series",
      items: summary.longestSeries.map((series) => ({
        key: `series-${series.name}`,
        title: series.name,
        coverUrl: series.books[0]?.coverUrl ?? null,
        value: plural(series.size, BOOKS),
        open: () => router.navigate({ pathname: "/", params: { filter: encodeFilter({ series: series.name }) } }),
      })),
    });
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
            <HighlightRow key={row.items.map((item) => item.key).join(",")} highlight={row} />
          </View>
        ))}
      </Card>
    </View>
  );
}

function HighlightRow({ highlight }: { highlight: Highlight }) {
  const { colors } = useTheme();
  const { label, items } = highlight;
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const tied = items.length > 1;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          horizontal
          pagingEnabled
          nestedScrollEnabled
          scrollEnabled={tied}
          showsHorizontalScrollIndicator={false}
          data={items}
          keyExtractor={(item) => item.key}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item, index: position }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${label}${tied ? `, ${position + 1} of ${items.length} tied` : ""}: ${
                item.title
              }, ${item.value}`}
              accessibilityHint={tied ? "Swipe left or right for the others that tie" : undefined}
              android_ripple={{ color: colors.border }}
              onPress={item.open}
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
                {item.value}
              </AppText>
            </Pressable>
          )}
        />
      )}
      {tied && (
        <View style={styles.dots} importantForAccessibility="no-hide-descendants">
          {items.map((item, i) => (
            <View
              key={item.key}
              style={[styles.dot, { backgroundColor: i === index ? colors.primary : colors.border }]}
            />
          ))}
          <AppText variant="caption" color="muted" style={styles.swipe}>
            {index + 1} of {items.length}
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
