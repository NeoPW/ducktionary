import type { IsoDate } from "@/types";
import { formatDate, parseIsoDate } from "@/utils/dates";

export type RangeKind = "year" | "month" | "all" | "custom";

export type StatsRange =
  | { kind: "year"; year: number }
  | { kind: "month"; year: number; month: number } // month: 1–12
  | { kind: "all" }
  | { kind: "custom"; from: IsoDate; to: IsoDate };

/** An inclusive span of dates. */
export type DateSpan = { from: IsoDate; to: IsoDate };

const pad = (n: number) => String(n).padStart(2, "0");

export function isoOf(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Day number that is safe to subtract (no DST drift). */
export function dayIndex(iso: IsoDate): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

export function isoFromDayIndex(index: number): IsoDate {
  const date = new Date(index * 86_400_000);
  return isoOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

/**
 * The full calendar span a range covers. "All time" runs from the first finished book to today.
 * Year and month keep their whole period (so charts show the empty months ahead too).
 */
export function resolveRange(range: StatsRange, earliest: IsoDate | null, today: IsoDate): DateSpan {
  switch (range.kind) {
    case "year":
      return { from: isoOf(range.year, 1, 1), to: isoOf(range.year, 12, 31) };
    case "month":
      return {
        from: isoOf(range.year, range.month, 1),
        to: isoOf(range.year, range.month, daysInMonth(range.year, range.month)),
      };
    case "all": {
      const from = earliest && earliest < today ? earliest : today;
      return { from, to: today };
    }
    case "custom":
      return range.from <= range.to ? { from: range.from, to: range.to } : { from: range.to, to: range.from };
  }
}

/** Days of the span that have already happened — the divisor for per-day rates. */
export function elapsedDays(span: DateSpan, today: IsoDate): number {
  const end = span.to < today ? span.to : today;
  return Math.max(0, dayIndex(end) - dayIndex(span.from) + 1);
}

export function rangeLabel(range: StatsRange): string {
  switch (range.kind) {
    case "year":
      return String(range.year);
    case "month":
      return parseIsoDate(isoOf(range.year, range.month, 1)).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    case "all":
      return "all time";
    case "custom":
      return `${formatDate(range.from)} – ${formatDate(range.to)}`;
  }
}

/** Moves a year/month range by `delta` periods. */
export function stepRange<R extends Extract<StatsRange, { kind: "year" | "month" }>>(range: R, delta: number): R {
  if (range.kind === "year") return { ...range, year: range.year + delta };
  const zeroBased = range.year * 12 + (range.month - 1) + delta;
  return { ...range, year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}
