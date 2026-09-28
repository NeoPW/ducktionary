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

/** "just now", "5 minutes ago", "3 hours ago", "2 days ago", then a date. */
export function timeAgo(iso: string, now = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"} ago`;
  if (seconds < 60) return "just now";
  if (seconds < 3600) return plural(Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return plural(Math.floor(seconds / 3600), "hour");
  if (seconds < 7 * 86_400) return plural(Math.floor(seconds / 86_400), "day");
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
