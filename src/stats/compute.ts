import { dayIndex, daysInMonth, elapsedDays, isoFromDayIndex, isoOf, type DateSpan } from "@/stats/range";
import type { Book, IsoDate } from "@/types";
import { parseIsoDate, readingDays } from "@/utils/dates";
import { LENGTH_CLASSES, lengthClass } from "@/utils/length-class";

export function booksInSpan(books: Book[], span: DateSpan): Book[] {
  return books.filter((book) => book.finishedAt >= span.from && book.finishedAt <= span.to);
}

// ─── Summary ────────────────────────────────────────────────────────────────

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
  longest: Book | null;
  fastest: { book: Book; days: number } | null;
  favourite: Book | null;
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
    longest: maxBy(withPages, (b) => b.pages!),
    fastest: timed.length
      ? timed.reduce((best, t) =>
          t.days < best.days || (t.days === best.days && (t.book.pages ?? 0) > (best.book.pages ?? 0)) ? t : best,
        )
      : null,
    favourite: maxBy(rated, (b) => b.rating!),
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

/** First item with the highest score — books arrive newest first, so ties favour recent reads. */
function maxBy<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  for (const item of items) if (best == null || score(item) > score(best)) best = item;
  return best;
}

function topCounts(names: string[], limit: number): { name: string; books: number }[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts]
    .map(([name, books]) => ({ name, books }))
    .sort((a, b) => b.books - a.books || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// ─── Charts ─────────────────────────────────────────────────────────────────

export type ChartKind =
  | "books-over-time"
  | "pages-over-time"
  | "categories"
  | "authors"
  | "ratings"
  | "length-class"
  | "length"
  | "reading-time";

export const CHARTS: readonly { kind: ChartKind; label: string }[] = [
  { kind: "books-over-time", label: "Books finished over time" },
  { kind: "pages-over-time", label: "Pages read over time" },
  { kind: "categories", label: "Categories" },
  { kind: "authors", label: "Authors" },
  { kind: "ratings", label: "Your ratings" },
  { kind: "length-class", label: "Short, medium & long" },
  { kind: "length", label: "Page count" },
  { kind: "reading-time", label: "Time per book" },
];

export type ChartStyle = "bar" | "line" | "pie";

export type Bar = { key: string; label: string; value: number };

/** How a pie slice is coloured: a fixed categorical slot, a step on the ordered ramp, or grey "Other". */
export type SliceColor = { kind: "categorical"; index: number } | { kind: "ordinal"; step: number } | { kind: "other" };
export type Slice = Bar & { color: SliceColor };

export type ChartData = {
  /** Columns for ordered buckets (time, ranges); rows for ranked names. */
  layout: "columns" | "rows";
  bars: Bar[];
  unit: { one: string; many: string };
  /** Styles that represent this data honestly. "bar" is always first. */
  styles: ChartStyle[];
  /** Present when "pie" is offered. */
  slices?: Slice[];
  /** Caveat shown under the chart, e.g. how many books were left out. */
  note: string | null;
};

const BOOKS = { one: "book", many: "books" };
const PAGES = { one: "page", many: "pages" };
const MAX_ROWS = 8;
/** Named pie slices get one of this many distinct colours; the rest fold into "Other". */
export const PIE_COLOURS = 3;
const ORDINAL_STEPS = 5;

/**
 * @param books books in the selected span
 * @param library every book — named pie slices take their colour from library-wide rank, so
 *   "Fantasy" keeps its colour when the range changes.
 */
export function buildChart(kind: ChartKind, books: Book[], span: DateSpan, library: Book[] = books): ChartData {
  switch (kind) {
    case "books-over-time":
      return {
        layout: "columns",
        bars: overTime(books, span, () => 1),
        unit: BOOKS,
        styles: ["bar", "line"],
        note: null,
      };

    case "pages-over-time": {
      const missing = books.filter((b) => b.pages == null).length;
      return {
        layout: "columns",
        bars: overTime(books, span, (b) => b.pages ?? 0),
        unit: PAGES,
        styles: ["bar", "line"],
        note: missing ? `${plural(missing, BOOKS)} without a page count not included.` : null,
      };
    }

    case "categories": {
      const uncategorized = books.filter((b) => b.categories.length === 0).length;
      const names = books.flatMap((b) => b.categories);
      return {
        layout: "rows",
        bars: ranked(names, "Other categories"),
        unit: BOOKS,
        styles: ["bar", "pie"],
        slices: namedSlices(names, library.flatMap((b) => b.categories)),
        note: joinNotes(
          "A book can have several categories.",
          uncategorized ? `${plural(uncategorized, BOOKS)} without a category.` : null,
        ),
      };
    }

    case "authors":
      return {
        layout: "rows",
        bars: ranked(books.flatMap((b) => b.authors), "Other authors"),
        unit: BOOKS,
        // No pie: most authors appear once, so it would be almost all "Other".
        styles: ["bar"],
        note: null,
      };

    case "ratings": {
      const unrated = books.filter((b) => b.rating == null).length;
      // One column per half star (½ … 5) so 4.5 isn't lumped in with 4 or 5.
      const bars = Array.from({ length: 10 }, (_, i) => {
        const stars = (i + 1) / 2;
        return {
          key: String(stars),
          label: `${Math.floor(stars) || ""}${stars % 1 ? "½" : ""}`,
          value: books.filter((b) => b.rating === stars).length,
        };
      });
      return {
        layout: "columns",
        bars,
        unit: BOOKS,
        // Ten half-star groups are too many slices for a readable pie.
        styles: ["bar", "line"],
        note: joinNotes("Stars you gave.", unrated ? `${plural(unrated, BOOKS)} not rated.` : null),
      };
    }

    case "length-class": {
      const missing = books.filter((b) => lengthClass(b.pages) == null).length;
      const bars = LENGTH_CLASSES.map((c) => ({
        key: c.value,
        label: c.label,
        value: books.filter((b) => lengthClass(b.pages) === c.value).length,
      }));
      return {
        layout: "columns",
        bars,
        unit: BOOKS,
        styles: ["bar", "line", "pie"],
        slices: orderedSlices(bars),
        note: joinNotes(
          LENGTH_CLASSES.map((c) => `${c.label}: ${c.range}.`).join(" "),
          missing ? `${plural(missing, BOOKS)} without a page count.` : null,
        ),
      };
    }

    case "length": {
      const buckets = [
        { label: "<200", max: 199 },
        { label: "200s", max: 299 },
        { label: "300s", max: 399 },
        { label: "400s", max: 499 },
        { label: "500+", max: Infinity },
      ];
      const missing = books.filter((b) => b.pages == null).length;
      const bars = histogram(books.flatMap((b) => (b.pages != null ? [b.pages] : [])), buckets);
      return {
        layout: "columns",
        bars,
        unit: BOOKS,
        styles: ["bar", "line", "pie"],
        slices: orderedSlices(bars),
        note: joinNotes("Pages per book.", missing ? `${plural(missing, BOOKS)} without a page count.` : null),
      };
    }

    case "reading-time": {
      const buckets = [
        { label: "≤1 wk", max: 7 },
        { label: "1–2 wk", max: 14 },
        { label: "2–4 wk", max: 28 },
        { label: "1–2 mo", max: 61 },
        { label: "2 mo+", max: Infinity },
      ];
      const days = books.flatMap((b) => (b.startedAt ? [readingDays(b.startedAt, b.finishedAt)] : []));
      const untimed = books.length - days.length;
      const bars = histogram(days, buckets);
      return {
        layout: "columns",
        bars,
        unit: BOOKS,
        styles: ["bar", "line", "pie"],
        slices: orderedSlices(bars),
        note: joinNotes(
          "From start to finish date.",
          untimed ? `${plural(untimed, BOOKS)} without a start date not included.` : null,
        ),
      };
    }
  }
}

/** Ordered groups (short → long): spread the non-empty ones along the ordinal ramp by position. */
function orderedSlices(bars: Bar[]): Slice[] {
  const lastIndex = Math.max(1, bars.length - 1);
  return bars.flatMap((bar, i) =>
    bar.value > 0
      ? [{ ...bar, color: { kind: "ordinal", step: Math.round((i / lastIndex) * (ORDINAL_STEPS - 1)) } as const }]
      : [],
  );
}

/**
 * Named groups: the library's top names each own a colour slot; everything else (in this span)
 * becomes one grey "Other" slice at the end.
 */
function namedSlices(names: string[], libraryNames: string[]): Slice[] {
  const coloured = topCounts(libraryNames, PIE_COLOURS).map((t) => t.name);
  const counts = topCounts(names, Infinity);
  const slices: Slice[] = coloured.flatMap((name, index) => {
    const value = counts.find((c) => c.name === name)?.books ?? 0;
    return value > 0 ? [{ key: name, label: name, value, color: { kind: "categorical", index } as const }] : [];
  });
  const rest = counts.filter((c) => !coloured.includes(c.name));
  if (rest.length > 0) {
    slices.push({
      key: "__other",
      label: `Other (${rest.length})`,
      value: rest.reduce((sum, r) => sum + r.books, 0),
      color: { kind: "other" },
    });
  }
  return slices;
}

type Bucket = { key: string; label: string; from: string; to: string };

/**
 * Splits a span into chart buckets: weeks for about a month, months up to two years, years beyond.
 * Month labels carry a short year when the span crosses years.
 */
export function timeBuckets(span: DateSpan): Bucket[] {
  const start = dayIndex(span.from);
  const end = dayIndex(span.to);
  const length = end - start + 1;
  const buckets: Bucket[] = [];

  if (length <= 45) {
    for (let day = start; day <= end; day += 7) {
      const from = isoFromDayIndex(day);
      buckets.push({
        key: from,
        label: parseIsoDate(from).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        from,
        to: isoFromDayIndex(Math.min(day + 6, end)),
      });
    }
    return buckets;
  }

  const [fromYear, fromMonth] = span.from.split("-").map(Number);
  const [toYear, toMonth] = span.to.split("-").map(Number);
  const months = (toYear - fromYear) * 12 + (toMonth - fromMonth) + 1;

  if (months <= 24) {
    const multiYear = fromYear !== toYear;
    for (let i = 0; i < months; i++) {
      const year = fromYear + Math.floor((fromMonth - 1 + i) / 12);
      const month = ((fromMonth - 1 + i) % 12) + 1;
      const monthName = parseIsoDate(isoOf(year, month, 1)).toLocaleDateString(undefined, { month: "short" });
      buckets.push({
        key: isoOf(year, month, 1),
        label: multiYear && (month === 1 || i === 0) ? `${monthName} ’${String(year).slice(2)}` : monthName,
        from: isoOf(year, month, 1),
        to: isoOf(year, month, daysInMonth(year, month)),
      });
    }
    return buckets;
  }

  for (let year = fromYear; year <= toYear; year++) {
    buckets.push({ key: String(year), label: String(year), from: isoOf(year, 1, 1), to: isoOf(year, 12, 31) });
  }
  return buckets;
}

function overTime(books: Book[], span: DateSpan, amount: (book: Book) => number): Bar[] {
  return timeBuckets(span).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    value: books
      .filter((b) => b.finishedAt >= bucket.from && b.finishedAt <= bucket.to)
      .reduce((sum, b) => sum + amount(b), 0),
  }));
}

/** Most frequent names first; everything past the top rows folds into one "Other" row. */
function ranked(names: string[], otherLabel: string): Bar[] {
  const all = topCounts(names, Infinity);
  const top = all.slice(0, MAX_ROWS).map(({ name, books }) => ({ key: name, label: name, value: books }));
  const rest = all.slice(MAX_ROWS);
  if (rest.length > 0) {
    top.push({
      key: "__other",
      label: `${otherLabel} (${rest.length})`,
      value: rest.reduce((sum, r) => sum + r.books, 0),
    });
  }
  return top;
}

function histogram(values: number[], buckets: { label: string; max: number }[]): Bar[] {
  return buckets.map((bucket, i) => {
    const min = i === 0 ? -Infinity : buckets[i - 1].max;
    return {
      key: bucket.label,
      label: bucket.label,
      value: values.filter((v) => v > min && v <= bucket.max).length,
    };
  });
}

export function plural(n: number, unit: { one: string; many: string }): string {
  return `${n.toLocaleString()} ${n === 1 ? unit.one : unit.many}`;
}

function joinNotes(...notes: (string | null)[]): string | null {
  const text = notes.filter(Boolean).join(" ");
  return text || null;
}
