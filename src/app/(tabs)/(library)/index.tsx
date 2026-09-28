import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookGrid } from "@/components/book-grid";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { SearchField } from "@/components/search-field";
import { clearAllData, seedSampleBooks } from "@/db/seed";
import { useBooks } from "@/hooks/use-books";
import { spacing } from "@/theme/tokens";
import type { Book } from "@/types";
import { acquisitionLabel, formatLabel } from "@/utils/book-attributes";
import { lengthClassLabel } from "@/utils/length-class";

function matches(book: Book, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  // Also matches length class, format and how you got it ("long", "e-book", "gift", …).
  return [
    book.title,
    ...book.authors,
    ...book.categories,
    lengthClassLabel(book.pages) ?? "",
    formatLabel(book.format) ?? "",
    acquisitionLabel(book.acquisition) ?? "",
  ].some((field) => field.toLowerCase().includes(q));
}

export default function LibraryScreen() {
  const db = useSQLiteContext();
  const books = useBooks();
  const [query, setQuery] = useState("");

  if (books.status === "loading") return <Screen>{null}</Screen>;

  if (books.status === "error") {
    return (
      <Screen contentStyle={styles.centered}>
        <EmptyState mood="confused" title="Couldn't open your library" message={books.error.message} />
      </Screen>
    );
  }

  if (books.data.length === 0) {
    return (
      <Screen contentStyle={styles.centered}>
        <EmptyState
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
      </Screen>
    );
  }

  const visible = books.data.filter((book) => matches(book, query));
  const total = books.data.length;

  return (
    <Screen scroll={false}>
      <BookGrid
        books={visible}
        header={
          <View style={styles.header}>
            <SearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Title, author, category or length"
              accessibilityLabel="Filter your library"
            />
            <AppText variant="caption" color="muted">
              {query.trim()
                ? `${visible.length} of ${total} books`
                : `${total} ${total === 1 ? "book" : "books"} read`}
            </AppText>
          </View>
        }
        empty={
          <EmptyState
            mood="confused"
            title="No matches"
            message={`Nothing in your library matches “${query.trim()}”.`}
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
  centered: { flexGrow: 1, justifyContent: "center" },
  header: { gap: spacing.sm },
});
