import { router, useLocalSearchParams } from "expo-router";
import type { ReactNode } from "react";

import { Button } from "@/components/button";
import { EmptyScreen } from "@/components/empty-state";
import { LoadingScreen } from "@/components/screen";
import { useBook } from "@/hooks/use-books";
import type { Book } from "@/types";

/** For `book/[id]` routes: loads that book and renders `children` with it, or loading / not-found. */
export function RouteBook({ children }: { children: (book: Book) => ReactNode }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const book = useBook(Number(id));

  if (book.status === "loading") return <LoadingScreen />;
  if (book.status === "error" || book.data == null) {
    return (
      <EmptyScreen
        mood="confused"
        title="Book not found"
        message={book.status === "error" ? book.error.message : "It may have been deleted."}
        action={<Button title="Back" onPress={() => router.back()} />}
      />
    );
  }
  return children(book.data);
}
