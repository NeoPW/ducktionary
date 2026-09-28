import type { Book } from "@/types";
import { isPriced } from "@/utils/book-attributes";

/** Books with a price that counts as money spent. */
export function priced(books: Book[]): Book[] {
  return books.filter((b) => b.priceCents != null && isPriced(b.acquisition));
}

/** The most frequent names with how many books each, most first (ties alphabetical). */
export function topCounts(names: string[], limit: number): { name: string; books: number }[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, books]) => ({ name, books }))
    .sort((a, b) => b.books - a.books || a.name.localeCompare(b.name))
    .slice(0, limit);
}
