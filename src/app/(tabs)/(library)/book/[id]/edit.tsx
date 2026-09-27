import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";

import { BookForm } from "@/components/book-form";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Screen } from "@/components/screen";
import { useToast } from "@/components/toast";
import { hasIsbn, listCategories, updateBook } from "@/db/books";
import { useBook } from "@/hooks/use-books";
import { useFocusLoader } from "@/hooks/use-focus-loader";
import type { Book, BookDraft } from "@/types";
import { bookToDraft } from "@/utils/book-form";
import { askToConfirm } from "@/utils/confirm";

export default function EditBookScreen() {
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
          action={<Button title="Back" onPress={() => router.back()} />}
        />
      </Screen>
    );
  }

  return <EditForm book={book.data} />;
}

function EditForm({ book }: { book: Book }) {
  const db = useSQLiteContext();
  const toast = useToast();
  // Captured once so refetches on focus don't reset what the user is typing.
  const [initial] = useState(() => bookToDraft(book));
  const loadCategories = useCallback(() => listCategories(db), [db]);
  const categories = useFocusLoader(loadCategories);

  const save = async (draft: BookDraft) => {
    if (draft.isbn && draft.isbn !== book.isbn && (await hasIsbn(db, draft.isbn))) {
      const proceed = await askToConfirm({
        title: "ISBN already used",
        message: "Another book in your library has this ISBN. Save anyway?",
        confirmText: "Save anyway",
      });
      if (!proceed) return undefined;
    }
    await updateBook(db, book.id, draft);
    return () => {
      router.back();
      toast("Changes saved.", "reading");
    };
  };

  return (
    <BookForm
      initial={initial}
      submitLabel="Save changes"
      onSubmit={save}
      categorySuggestions={categories.data ?? []}
    />
  );
}

const styles = StyleSheet.create({
  centered: { flexGrow: 1, justifyContent: "center" },
});
