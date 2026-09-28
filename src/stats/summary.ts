import { priced, topCounts } from "@/stats/helpers";
import { dayIndex, elapsedDays, type DateSpan } from "@/stats/range";
import type { Book, IsoDate } from "@/types";
import { readingDays } from "@/utils/dates";

export function booksInSpan(books: Book[], span: DateSpan): Book[] {
  return books.filter((book) => book.finishedAt >= span.from && book.finishedAt <= span.to);
}

export type Summary = {
  books: number;
  /** Sum over books that have a page count. */
  pages: number;
  /** Calendar days (within the span) on which at least one of these books was being read. */
  daysReading: number;
  avgRating: number | null;
  avgPages: number | null;
  avgDaysPerBook: number | null;
  /** Pages divided by the days of the span that have passed. */
  pagesPerDay: number | null;
  topCategory: { name: string; books: number } | null;
  /** Distinct authors. */
  authors: number;
  /** Money spent (cents) on bought books with a price, and how many that is. */
  spentCents: number;
  pricedBooks: number;
  /** Highlights keep every tied book (newest first) so ties can be browsed. Empty when none. */
  longest: Book[];
  fastest: { books: Book[]; days: number } | null;
  favourite: Book[];
};

/** `books` should already be limited to the span (see `booksInSpan`), newest first. */
export function summarize(books: Book[], span: DateSpan, today: IsoDate): Summary {
  const withPages = books.filter((b) => b.pages != null);
  const rated = books.filter((b) => b.rating != null);
  const timed = books
    .filter((b) => b.startedAt != null)
    .map((book) => ({ book, days: readingDays(book.startedAt!, book.finishedAt) }));

  const pages = withPages.reduce((sum, b) => sum + (b.pages ?? 0), 0);
  const elapsed = elapsedDays(span, today);

  return {
    books: books.length,
    pages,
    daysReading: countReadingDays(books, span),
    avgRating: rated.length ? average(rated.map((b) => b.rating!)) : null,
    avgPages: withPages.length ? pages / withPages.length : null,
    avgDaysPerBook: timed.length ? average(timed.map((t) => t.days)) : null,
    pagesPerDay: elapsed > 0 && withPages.length ? pages / elapsed : null,
    topCategory: topCounts(books.flatMap((b) => b.categories), 1)[0] ?? null,
    authors: new Set(books.flatMap((b) => b.authors.map((a) => a.toLowerCase()))).size,
    spentCents: priced(books).reduce((sum, b) => sum + b.priceCents!, 0),
    pricedBooks: priced(books).length,
    longest: allMaxBy(withPages, (b) => b.pages!),
    fastest: timed.length
      ? {
          books: allMaxBy(timed, (t) => -t.days).map((t) => t.book),
          days: Math.min(...timed.map((t) => t.days)),
        }
      : null,
    favourite: allMaxBy(rated, (b) => b.rating!),
  };
}

/** Union of reading intervals clipped to the span — overlapping books count each day once. */
export function countReadingDays(books: Book[], span: DateSpan): number {
  const spanStart = dayIndex(span.from);
  const spanEnd = dayIndex(span.to);
  const intervals = books
    .filter((b) => b.startedAt != null)
    .map((b) => [Math.max(dayIndex(b.startedAt!), spanStart), Math.min(dayIndex(b.finishedAt), spanEnd)] as const)
    .filter(([start, end]) => start <= end)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let current: [number, number] | null = null;
  for (const [start, end] of intervals) {
    if (current && start <= current[1] + 1) {
      current[1] = Math.max(current[1], end);
    } else {
      if (current) total += current[1] - current[0] + 1;
      current = [start, end];
    }
  }
  if (current) total += current[1] - current[0] + 1;
  return total;
}

function average(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Every item sharing the highest score, in input order (books arrive newest first). */
function allMaxBy<T>(items: T[], score: (item: T) => number): T[] {
  if (items.length === 0) return [];
  const best = Math.max(...items.map(score));
  return items.filter((item) => score(item) === best);
}
