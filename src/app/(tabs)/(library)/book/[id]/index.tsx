import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Alert, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/button";
import { CategoryChips } from "@/components/category-chips";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/components/toast";
import { deleteBook } from "@/db/books";
import { useBook } from "@/hooks/use-books";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";
import { formatDate, readingDays } from "@/utils/dates";
import { lengthClassLabel } from "@/utils/length-class";

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = useBook(Number(id));

  if (book.status === "loading") return <Screen>{null}</Screen>;

  if (book.status === "error" || book.data == null) {
    return (
      <Screen contentStyle={styles.centered}>
        <EmptyState
          mood="confused"
          title="Book not found"
          message={book.status === "error" ? book.error.message : "It may have been deleted."}
          action={<Button title="Back to library" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return <BookDetail book={book.data} />;
}

function BookDetail({ book }: { book: Book }) {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const toast = useToast();

  const confirmDelete = () =>
    Alert.alert("Delete this book?", `“${book.title}” will be removed from your library.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteBook(db, book.id);
          router.back();
          toast(`“${book.title}” was removed.`, "sleepy");
        },
      },
    ]);

  const facts: [label: string, value: string][] = [["Finished", formatDate(book.finishedAt)]];
  if (book.startedAt) {
    facts.push(["Started", formatDate(book.startedAt)]);
    facts.push(["Reading time", pluralDays(readingDays(book.startedAt, book.finishedAt))]);
  }
  if (book.pages) facts.push(["Length", `${lengthClassLabel(book.pages)} · ${book.pages} pages`]);
  if (book.isbn) facts.push(["ISBN", book.isbn]);

  const card = { backgroundColor: colors.surface, borderColor: colors.border };
  const openEdit = () => router.push({ pathname: "/book/[id]/edit", params: { id: book.id } });

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={openEdit}>
              <AppText variant="label" color="primary">
                Edit
              </AppText>
            </Pressable>
          ),
        }}
      />
      <View style={styles.hero}>
        <BookCover title={book.title} coverUrl={book.coverUrl} width={150} />
        <AppText variant="title" style={styles.center}>
          {book.title}
        </AppText>
        {book.authors.length > 0 && (
          <AppText color="muted" style={styles.center}>
            {book.authors.join(", ")}
          </AppText>
        )}
        {book.rating != null ? (
          <StarRating rating={book.rating} size={22} />
        ) : (
          <AppText variant="caption" color="muted">
            Not rated
          </AppText>
        )}
      </View>

      <View style={[styles.card, card]}>
        {facts.map(([label, value]) => (
          <View key={label} style={styles.fact}>
            <AppText variant="label" color="muted">
              {label}
            </AppText>
            <AppText variant="label">{value}</AppText>
          </View>
        ))}
      </View>

      <CategoryChips categories={book.categories} />

      {book.comment ? (
        <View style={[styles.card, card]}>
          <AppText variant="heading">Notes</AppText>
          <AppText>{book.comment}</AppText>
        </View>
      ) : null}

      <Button title="Delete book" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}

function pluralDays(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: "center" },
  hero: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  center: { textAlign: "center" },
  card: {
    padding: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.sm,
  },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
});
