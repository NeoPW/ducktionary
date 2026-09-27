import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";

import { getBook, listBooks } from "@/db/books";
import { useFocusLoader } from "@/hooks/use-focus-loader";

export function useBooks() {
  const db = useSQLiteContext();
  const load = useCallback(() => listBooks(db), [db]);
  return useFocusLoader(load);
}

export function useBook(id: number) {
  const db = useSQLiteContext();
  const load = useCallback(() => getBook(db, id), [db, id]);
  return useFocusLoader(load);
}
