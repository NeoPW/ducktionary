/**
 * The library filter: which books to show. Stats bars link to it, the filter screen edits it, and it travels as
 * the library's `filter` route param. Every part is optional; lists mean "any of", `null` means "not set".
 * Pure, testable in Node.
 */
import { SERIES_LENGTHS, sameSeries, seriesLengthGroup, seriesSize, type SeriesLength, type SeriesSizes } from "@/library/series";
import type { Acquisition, Book, BookFormat, IsoDate } from "@/types";
import { acquisitionLabel, formatLabel, formatPrice, isAcquisition, isFormat, isPriced } from "@/utils/book-attributes";
import { formatDate, parseIsoDate, readingDays } from "@/utils/dates";
import { LENGTH_CLASSES, lengthClass, type LengthClass } from "@/utils/length-class";
import { STAR_GROUPS, starGroup, type StarGroup } from "@/utils/rating";

/** Inclusive; either end may be open. */
export type Range = { min?: number; max?: number };

export type LibraryFilter = {
  finished?: { from?: IsoDate; to?: IsoDate };
  categories?: string[];
  authors?: string[];
  /** Whole-star groups (see `starGroup`); null = not rated. */
  stars?: (StarGroup | null)[];
  lengthClasses?: (LengthClass | null)[];
  pages?: Range;
  readingDays?: Range;
  /** Bought books with a price in this range (cents). */
  priceCents?: Range;
  formats?: (BookFormat | null)[];
  acquisitions?: (Acquisition | null)[];
  series?: string;
  seriesLengths?: SeriesLength[];
};

export type FilterKey = keyof LibraryFilter;

const inRange = (value: number, { min = -Infinity, max = Infinity }: Range) => value >= min && value <= max;
const lower = (s: string) => s.toLowerCase();

/** `sizes` (see `seriesSizes`) is only needed for `seriesLengths`. */
export function matchesFilter(book: Book, filter: LibraryFilter, sizes?: SeriesSizes): boolean {
  const f = filter;
  if (f.finished && ((f.finished.from && book.finishedAt < f.finished.from) || (f.finished.to && book.finishedAt > f.finished.to))) {
    return false;
  }
  if (f.categories && !book.categories.some((c) => f.categories!.map(lower).includes(lower(c)))) return false;
  if (f.authors && !book.authors.some((a) => f.authors!.map(lower).includes(lower(a)))) return false;
  if (f.stars && !f.stars.includes(starGroup(book.rating))) return false;
  if (f.lengthClasses && !f.lengthClasses.includes(lengthClass(book.pages))) return false;
  if (f.pages && (book.pages == null || !inRange(book.pages, f.pages))) return false;
  if (f.readingDays && (!book.startedAt || !inRange(readingDays(book.startedAt, book.finishedAt), f.readingDays))) {
    return false;
  }
  if (f.priceCents && (book.priceCents == null || !isPriced(book.acquisition) || !inRange(book.priceCents, f.priceCents))) {
    return false;
  }
  if (f.formats && !f.formats.includes(book.format)) return false;
  if (f.acquisitions && !f.acquisitions.includes(book.acquisition)) return false;
  if (f.series && !(book.series && sameSeries(book.series.name, f.series))) return false;
  if (f.seriesLengths && !f.seriesLengths.includes(seriesLengthGroup(seriesSize(book, sizes ?? new Map())))) return false;
  return true;
}

/** Number of active parts — for the badge on the filter button. */
export function filterCount(filter: LibraryFilter): number {
  return Object.values(filter).filter((v) => v !== undefined).length;
}

export function withoutKey(filter: LibraryFilter, key: FilterKey): LibraryFilter {
  const { [key]: _removed, ...rest } = filter;
  return rest;
}

// ─── Chips ──────────────────────────────────────────────────────────────────

const list = (items: string[]) => (items.length <= 2 ? items.join(", ") : `${items.slice(0, 2).join(", ")} +${items.length - 2}`);

function rangeLabel({ min, max }: Range, unit: (n: number) => string): string {
  if (min != null && max != null) return min === max ? unit(min) : `${unit(min)} – ${unit(max)}`;
  if (min != null) return `${unit(min)} or more`;
  if (max != null) return `up to ${unit(max)}`;
  return "any";
}

function spanLabel({ from, to }: { from?: IsoDate; to?: IsoDate }): string {
  if (from && to) {
    const [a, b] = [parseIsoDate(from), parseIsoDate(to)];
    const lastOfMonth = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate() === b.getDate();
    if (a.getDate() === 1 && lastOfMonth && a.getFullYear() === b.getFullYear()) {
      if (a.getMonth() === 0 && b.getMonth() === 11) return `Finished in ${a.getFullYear()}`;
      if (a.getMonth() === b.getMonth()) {
        return `Finished in ${a.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
      }
    }
    return from === to ? `Finished ${formatDate(from)}` : `Finished ${formatDate(from)} – ${formatDate(to)}`;
  }
  return from ? `Finished since ${formatDate(from)}` : to ? `Finished until ${formatDate(to)}` : "Any time";
}

const stars = (g: StarGroup | null) => (g == null ? "Not rated" : `${STAR_GROUPS[g].label} ★`);

/** One removable chip per active part, in a stable order. */
export function filterChips(filter: LibraryFilter): { key: FilterKey; label: string }[] {
  const f = filter;
  const chips: { key: FilterKey; label: string }[] = [];
  if (f.series) chips.push({ key: "series", label: `Series: ${f.series}` });
  if (f.finished) chips.push({ key: "finished", label: spanLabel(f.finished) });
  if (f.categories) chips.push({ key: "categories", label: list(f.categories) });
  if (f.authors) chips.push({ key: "authors", label: `By ${list(f.authors)}` });
  if (f.stars) chips.push({ key: "stars", label: list(f.stars.map(stars)) });
  if (f.lengthClasses) {
    const label = (c: LengthClass | null) => LENGTH_CLASSES.find((l) => l.value === c)?.label ?? "No page count";
    chips.push({ key: "lengthClasses", label: list(f.lengthClasses.map(label)) });
  }
  if (f.pages) chips.push({ key: "pages", label: rangeLabel(f.pages, (n) => `${n} pages`) });
  if (f.readingDays) chips.push({ key: "readingDays", label: `Read in ${rangeLabel(f.readingDays, (n) => `${n} days`)}` });
  if (f.priceCents) chips.push({ key: "priceCents", label: rangeLabel(f.priceCents, (n) => formatPrice(n)) });
  if (f.formats) chips.push({ key: "formats", label: list(f.formats.map((v) => formatLabel(v) ?? "Format not set")) });
  if (f.acquisitions) {
    chips.push({ key: "acquisitions", label: list(f.acquisitions.map((v) => acquisitionLabel(v) ?? "Not set how you got it")) });
  }
  if (f.seriesLengths) {
    const label = (v: SeriesLength) => SERIES_LENGTHS.find((l) => l.value === v)!.label;
    chips.push({ key: "seriesLengths", label: `Series: ${list(f.seriesLengths.map(label))}` });
  }
  return chips;
}

// ─── Route param ────────────────────────────────────────────────────────────

export function encodeFilter(filter: LibraryFilter): string | undefined {
  return filterCount(filter) ? JSON.stringify(filter) : undefined;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const strings = (v: unknown) =>
  Array.isArray(v) && v.length > 0 && v.every((s) => typeof s === "string" && s.length <= 200) ? (v as string[]) : undefined;
const nullableList = <T,>(v: unknown, ok: (x: unknown) => x is T) =>
  Array.isArray(v) && v.length > 0 && v.every((x) => x === null || ok(x)) ? (v as (T | null)[]) : undefined;
const range = (v: unknown): Range | undefined => {
  if (!isObj(v)) return undefined;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
  const r = { min: num(v.min), max: num(v.max) };
  return r.min == null && r.max == null ? undefined : Object.fromEntries(Object.entries(r).filter(([, x]) => x != null));
};

/** Reads the route param back; anything malformed is dropped rather than trusted. */
export function decodeFilter(param: string | string[] | undefined): LibraryFilter {
  if (typeof param !== "string" || !param) return {};
  let raw: unknown;
  try {
    raw = JSON.parse(param);
  } catch {
    return {};
  }
  if (!isObj(raw)) return {};
  const finished = isObj(raw.finished)
    ? {
        ...(typeof raw.finished.from === "string" && ISO.test(raw.finished.from) ? { from: raw.finished.from } : {}),
        ...(typeof raw.finished.to === "string" && ISO.test(raw.finished.to) ? { to: raw.finished.to } : {}),
      }
    : undefined;
  const filter: LibraryFilter = {
    finished: finished && (finished.from || finished.to) ? finished : undefined,
    categories: strings(raw.categories),
    authors: strings(raw.authors),
    stars: nullableList(raw.stars, (x): x is StarGroup => STAR_GROUPS.some((g) => g.value === x)),
    lengthClasses: nullableList(raw.lengthClasses, (x): x is LengthClass => x === "short" || x === "medium" || x === "long"),
    pages: range(raw.pages),
    readingDays: range(raw.readingDays),
    priceCents: range(raw.priceCents),
    formats: nullableList(raw.formats, isFormat),
    acquisitions: nullableList(raw.acquisitions, isAcquisition),
    series: typeof raw.series === "string" && raw.series.trim() ? raw.series.slice(0, 200) : undefined,
    seriesLengths: Array.isArray(raw.seriesLengths)
      ? (raw.seriesLengths.filter((v) => SERIES_LENGTHS.some((l) => l.value === v)) as SeriesLength[])
      : undefined,
  };
  if (filter.seriesLengths?.length === 0) filter.seriesLengths = undefined;
  return Object.fromEntries(Object.entries(filter).filter(([, v]) => v !== undefined)) as LibraryFilter;
}
