export type LengthClass = "short" | "medium" | "long";

export const LENGTH_CLASSES: readonly { value: LengthClass; label: string; range: string }[] = [
  { value: "short", label: "Short", range: "under 150 pages" },
  { value: "medium", label: "Medium", range: "150–499 pages" },
  { value: "long", label: "Long", range: "500+ pages" },
];

/** Derived from the page count (never stored), so it follows edits automatically. */
export function lengthClass(pages: number | null): LengthClass | null {
  if (pages == null || pages <= 0) return null;
  if (pages < 150) return "short";
  if (pages < 500) return "medium";
  return "long";
}

export function lengthClassLabel(pages: number | null): string | null {
  const value = lengthClass(pages);
  return value ? (LENGTH_CLASSES.find((c) => c.value === value)?.label ?? null) : null;
}
