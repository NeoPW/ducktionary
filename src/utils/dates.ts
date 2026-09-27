import type { IsoDate } from "@/types";

/** Parses `YYYY-MM-DD` as a local date (not UTC midnight, which can shift the day). */
export function parseIsoDate(iso: IsoDate): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): IsoDate {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function formatDate(iso: IsoDate): string {
  return parseIsoDate(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Whole days from start to end, counting both ends (started and finished the same day = 1). */
export function readingDays(start: IsoDate, end: IsoDate): number {
  const ms = parseIsoDate(end).getTime() - parseIsoDate(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}
