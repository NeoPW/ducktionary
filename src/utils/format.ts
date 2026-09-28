/** Compact counts for small labels: 850, 4.4k, 12k, 1.2M. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export type Unit = { one: string; many: string };

export const BOOKS: Unit = { one: "book", many: "books" };
export const PAGES: Unit = { one: "page", many: "pages" };
export const DAYS: Unit = { one: "day", many: "days" };

/** 1 → "1 book", 1500 → "1,500 books" (number formatted to the phone's locale). */
export function plural(n: number, unit: Unit): string {
  return `${n.toLocaleString()} ${n === 1 ? unit.one : unit.many}`;
}
