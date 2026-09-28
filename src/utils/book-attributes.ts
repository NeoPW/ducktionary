import type { Acquisition, BookFormat } from "@/types";

export const FORMATS: readonly { value: BookFormat; label: string }[] = [
  { value: "hardcover", label: "Hardcover" },
  { value: "paperback", label: "Paperback" },
  { value: "ebook", label: "E-book" },
];

export const ACQUISITIONS: readonly { value: Acquisition; label: string }[] = [
  { value: "bought", label: "Bought" },
  { value: "gift", label: "Gift" },
  { value: "borrowed", label: "Borrowed" },
];

export function isFormat(value: unknown): value is BookFormat {
  return FORMATS.some((f) => f.value === value);
}

export function isAcquisition(value: unknown): value is Acquisition {
  return ACQUISITIONS.some((a) => a.value === value);
}

export function formatLabel(format: BookFormat | null): string | null {
  return FORMATS.find((f) => f.value === format)?.label ?? null;
}

export function acquisitionLabel(acquisition: Acquisition | null): string | null {
  return ACQUISITIONS.find((a) => a.value === acquisition)?.label ?? null;
}

/** A price only counts for books you paid for (or where how you got it isn't recorded). */
export function isPriced(acquisition: Acquisition | null): boolean {
  return acquisition == null || acquisition === "bought";
}

export const CURRENCY = "EUR";

/** 1299 → "12,99 €" (formatted to the phone's locale). */
export function formatPrice(cents: number, { whole = false }: { whole?: boolean } = {}): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
}

/**
 * Parses what people type: "12,99", "12.99", "€ 12", "12,5 €", "1.299,00", "1,299.00". Returns
 * cents, null for empty input, or NaN when it isn't a clear price (e.g. "12,99," or "1,2,3").
 */
export function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[€\s]/g, "").replace(/eur$/i, "");
  if (!cleaned) return null;
  // Whole part: plain digits, or digits grouped in thousands ("1.299" / "1,299").
  const WHOLE = String.raw`(\d+|\d{1,3}(?:[.,]\d{3})+)`;
  const withDecimals = cleaned.match(new RegExp(`^${WHOLE}[.,](\\d{1,2})$`));
  const wholeOnly = cleaned.match(new RegExp(`^${WHOLE}$`));
  const match = withDecimals ?? wholeOnly;
  if (!match) return NaN;
  const whole = Number(match[1].replace(/[.,]/g, ""));
  const fraction = withDecimals ? Number(withDecimals[2].padEnd(2, "0")) : 0;
  return whole * 100 + fraction;
}
