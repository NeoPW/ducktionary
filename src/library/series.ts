/**
 * Series sizes: how many books of a series are in the library (all time) — used by the library filter, the
 * series-length chart and the "longest series" highlight. Pure, testable in Node.
 */
import type { Book } from "@/types";

/** Length groups, as the series-length chart shows them. A standalone book counts as a single. */
export const SERIES_LENGTHS = [
  { value: "1", label: "Single" },
  { value: "2", label: "Duology" },
  { value: "3", label: "Trilogy" },
  { value: "4", label: "4 books" },
  { value: "5", label: "5 books" },
  { value: "6+", label: "6+ books" },
] as const;
export type SeriesLength = (typeof SERIES_LENGTHS)[number]["value"];

export type SeriesSizes = ReadonlyMap<string, number>;

const seriesKey = (name: string) => name.trim().toLowerCase();

/** Books per series in the whole library, keyed case-insensitively. */
export function seriesSizes(library: readonly Book[]): SeriesSizes {
  const sizes = new Map<string, number>();
  for (const book of library) {
    if (book.series) sizes.set(seriesKey(book.series.name), (sizes.get(seriesKey(book.series.name)) ?? 0) + 1);
  }
  return sizes;
}

/** How many books the book's series has in the library (1 for a standalone book). */
export function seriesSize(book: Book, sizes: SeriesSizes): number {
  return book.series ? (sizes.get(seriesKey(book.series.name)) ?? 1) : 1;
}

export function seriesLengthGroup(size: number): SeriesLength {
  return size >= 6 ? "6+" : (String(Math.max(1, size)) as SeriesLength);
}

export function sameSeries(a: string, b: string): boolean {
  return seriesKey(a) === seriesKey(b);
}

/** A series' books in reading order: by number in the series, then by finish date. */
export function seriesOrder(a: Book, b: Book): number {
  const pa = a.series?.position ?? Infinity;
  const pb = b.series?.position ?? Infinity;
  return pa - pb || a.finishedAt.localeCompare(b.finishedAt);
}
