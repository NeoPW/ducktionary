import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/app-text";
import { BookGrid } from "@/components/book-grid";
import { Button } from "@/components/button";
import { EmptyScreen, EmptyState } from "@/components/empty-state";
import { LoadingScreen, Screen } from "@/components/screen";
import { SearchField } from "@/components/search-field";
import { clearAllData, seedSampleBooks } from "@/db/seed";
import { useBooks } from "@/hooks/use-books";
import { decodeFilter, encodeFilter, filterChips, filterCount, matchesFilter, withoutKey } from "@/library/filter";
import { seriesSizes } from "@/library/series";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";
import { acquisitionLabel, formatLabel } from "@/utils/book-attributes";
import { BOOKS, plural } from "@/utils/format";
import { lengthClassLabel } from "@/utils/length-class";

// Material Symbols "filter_list" (Apache 2.0).
const FILTER_ICON = "M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z";

function matchesText(book: Book, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Also matches series, length class, format and how you got it ("mistborn", "long", "e-book", "gift", …).
  return [
    book.title,
    ...book.authors,
    ...book.categories,
    book.series?.name ?? "",
    lengthClassLabel(book.pages) ?? "",
    formatLabel(book.format) ?? "",
    acquisitionLabel(book.acquisition) ?? "",
  ].some((field) => field.toLowerCase().includes(q));
}

export default function LibraryScreen() {
  const db = useSQLiteContext();
  const books = useBooks();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  // The filter lives in the route, so the stats can link straight to a filtered library.
  const params = useLocalSearchParams<{ filter?: string }>();
  const filter = decodeFilter(params.filter);
  const activeFilters = filterCount(filter);

  if (books.status === "loading") return <LoadingScreen />;

  if (books.status === "error") {
    return <EmptyScreen mood="confused" title="Couldn't open your library" message={books.error.message} />;
  }

  if (books.data.length === 0) {
    return (
      <EmptyScreen
        mood="sleepy"
        title="No books yet"
        message="Honk one in! Scan a barcode or search for a book you've finished."
        action={
          <>
            <Button title="Add a book" onPress={() => router.navigate("/add")} />
            {__DEV__ && (
              <Button
                title="Load sample books (dev)"
                variant="ghost"
                onPress={async () => {
                  await seedSampleBooks(db);
                  await books.reload();
                }}
              />
            )}
          </>
        }
      />
    );
  }

  const sizes = seriesSizes(books.data);
  const visible = books.data.filter((book) => matchesFilter(book, filter, sizes) && matchesText(book, query));
  const total = books.data.length;
  const setFilter = (next: typeof filter) => router.setParams({ filter: encodeFilter(next) });

  return (
    <Screen scroll={false}>
      <BookGrid
        books={visible}
        header={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <View style={styles.flex}>
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Title, author, series or category"
                  accessibilityLabel="Search your library"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={activeFilters ? `Filter, ${activeFilters} active` : "Filter"}
                onPress={() => router.push({ pathname: "/filter", params: { filter: params.filter } })}
                style={[
                  styles.filterButton,
                  { backgroundColor: colors.surface, borderColor: activeFilters ? colors.primary : colors.border },
                ]}
              >
                <Svg width={22} height={22} viewBox="0 0 24 24">
                  <Path d={FILTER_ICON} fill={colors.text} />
                </Svg>
                {activeFilters > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <AppText variant="caption" style={{ color: colors.onPrimary }}>
                      {activeFilters}
                    </AppText>
                  </View>
                )}
              </Pressable>
            </View>
            {activeFilters > 0 && (
              <View style={styles.chips}>
                {filterChips(filter).map((chip) => (
                  <Pressable
                    key={chip.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove filter: ${chip.label}`}
                    onPress={() => setFilter(withoutKey(filter, chip.key))}
                    style={[styles.chip, { backgroundColor: colors.accent, borderColor: colors.accent }]}
                  >
                    <AppText variant="label" numberOfLines={1} style={styles.chipLabel}>
                      {chip.label}
                    </AppText>
                    <AppText variant="label">×</AppText>
                  </Pressable>
                ))}
                <Pressable accessibilityRole="button" onPress={() => setFilter({})} style={styles.clear} hitSlop={8}>
                  <AppText variant="label" color="primary">
                    Clear all
                  </AppText>
                </Pressable>
              </View>
            )}
            <AppText variant="caption" color="muted">
              {query.trim() || activeFilters
                ? `${visible.length} of ${plural(total, BOOKS)}`
                : `${plural(total, BOOKS)} read`}
            </AppText>
          </View>
        }
        empty={
          <EmptyState
            mood="confused"
            title="No matches"
            message={
              activeFilters
                ? "No book in your library matches this filter."
                : `Nothing in your library matches “${query.trim()}”.`
            }
            action={
              activeFilters ? <Button title="Clear filter" variant="secondary" onPress={() => setFilter({})} /> : undefined
            }
          />
        }
        footer={
          __DEV__ ? (
            <Button
              title="Clear all data (dev)"
              variant="ghost"
              onPress={async () => {
                await clearAllData(db);
                await books.reload();
              }}
            />
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  searchRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
  filterButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.card,
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: "100%",
  },
  chipLabel: { flexShrink: 1 },
  clear: { paddingHorizontal: spacing.xs },
});
