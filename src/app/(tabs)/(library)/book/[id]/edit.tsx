import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";

import { BookForm } from "@/components/book-form";
import { useConfirm } from "@/components/confirm-dialog";
import { RouteBook } from "@/components/route-book";
import { useToast } from "@/components/toast";
import { hasIsbn, updateBook } from "@/db/books";
import { useCategories } from "@/hooks/use-books";
import type { Book, BookDraft } from "@/types";
import { bookToDraft } from "@/utils/book-draft";

export default function EditBookScreen() {
  return <RouteBook>{(book) => <EditForm book={book} />}</RouteBook>;
}

function EditForm({ book }: { book: Book }) {
  const db = useSQLiteContext();
  const toast = useToast();
  const confirm = useConfirm();
  // Captured once so refetches on focus don't reset what the user is typing.
  const [initial] = useState(() => bookToDraft(book));
  const categories = useCategories();

  const save = async (draft: BookDraft) => {
    if (draft.isbn && draft.isbn !== book.isbn && (await hasIsbn(db, draft.isbn))) {
      const proceed = await confirm({
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
