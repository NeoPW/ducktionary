import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";

import { sortResults, type SearchResult, type SearchSort } from "@/api/search-result";
import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/button";
import { DuckMascot } from "@/components/duck-mascot";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { SearchField } from "@/components/search-field";
import { SegmentedControl } from "@/components/segmented-control";
import { useBookSearch } from "@/hooks/use-book-search";
import { usePreference } from "@/hooks/use-preference";
import { SETTING_KEYS } from "@/storage/keys";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { BookDraft } from "@/types";
import { blankDraft } from "@/utils/book-draft";
import { confirmBookHref } from "@/utils/confirm-route";
import { todayIso } from "@/utils/dates";
import { formatCount } from "@/utils/format";
import { normalizeIsbn } from "@/utils/isbn";

const SORTS: readonly { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "popular", label: "Most read" },
  { value: "rated", label: "Top rated" },
];

function openConfirm(draft: BookDraft) {
  router.push(confirmBookHref(draft));
}

export default function AddScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const search = useBookSearch(query);
  const [sort, setSort] = usePreference<SearchSort>(
    SETTING_KEYS.searchSort,
    SORTS.map((s) => s.value),
    "relevance",
  );
  // Re-ranks only the fetched (already relevant) results.
  const results = sortResults(search.results, sort);

  const enterManually = () => {
    const text = query.trim();
    const isbn = normalizeIsbn(text);
    openConfirm(blankDraft(todayIso(), isbn ? { isbn } : { title: text }));
  };

  const header = (
    <View style={styles.header}>
      {search.status === "idle" && (
        <View style={styles.hero}>
          <DuckMascot mood="scanning" size={96} />
          <AppText color="muted" style={styles.flex}>
            Scan the barcode on the back cover, or search by title, author or ISBN.
          </AppText>
        </View>
      )}
      <Button title="Scan barcode" onPress={() => router.push("/scan")} />
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Title, author or ISBN"
        accessibilityLabel="Search Open Library"
      />
      {search.results.length > 1 && <SegmentedControl options={SORTS} value={sort} onChange={setSort} />}
      {search.status === "loading" && <ActivityIndicator color={colors.primary} />}
    </View>
  );

  let empty = null;
  if (search.status === "error") {
    empty = (
      <EmptyState
        mood="confused"
        title="Search failed"
        message={search.error.message}
        action={<Button title="Try again" variant="secondary" onPress={search.retry} />}
      />
    );
  } else if (search.status === "done") {
    empty = (
      <EmptyState
        mood="confused"
        title="No books found"
        message="Open Library doesn't know this one. You can add it by hand."
      />
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={results}
        keyExtractor={(result) => result.key}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        renderItem={({ item }) => <ResultRow result={item} />}
        ListFooterComponent={
          <Button title="Enter manually" variant="ghost" onPress={enterManually} />
        }
      />
    </Screen>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  const { colors } = useTheme();
  const { draft, year } = result;
  const meta = [
    year,
    draft.pages ? `${draft.pages} pages` : null,
    result.readers > 0 ? `${formatCount(result.readers)} ${result.readers === 1 ? "reader" : "readers"}` : null,
    result.rating ? `★ ${result.rating.average.toFixed(1)} (${formatCount(result.rating.count)})` : null,
    result.source === "google" ? "Google Books" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openConfirm(draft)}
      android_ripple={{ color: colors.border }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <BookCover title={draft.title} coverUrl={draft.coverUrl} width={48} />
      <View style={styles.flex}>
        <AppText variant="heading" numberOfLines={2} style={styles.rowTitle}>
          {draft.title}
        </AppText>
        {draft.authors.length > 0 && (
          <AppText variant="label" color="muted" numberOfLines={1}>
            {draft.authors.join(", ")}
          </AppText>
        )}
        {meta ? (
          <AppText variant="caption" color="muted">
            {meta}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  rowTitle: { fontSize: 16, lineHeight: 21 },
});
