import { useSQLiteContext } from "expo-sqlite";
import { useCallback } from "react";

import { getBook, listBooks, listCategories } from "@/db/books";
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

/** Category names in use, most used first — suggestions for the book form. */
export function useCategories() {
  const db = useSQLiteContext();
  const load = useCallback(() => listCategories(db), [db]);
  return useFocusLoader(load);
}
