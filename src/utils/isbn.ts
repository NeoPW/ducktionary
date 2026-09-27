/**
 * Returns the ISBN-13 for a valid ISBN-10/13 (hyphens and spaces allowed), or null.
 * Used both for typed searches and for scanned EAN-13 barcodes.
 */
export function normalizeIsbn(input: string): string | null {
  const compact = input.replace(/[\s-]/g, "").toUpperCase();

  if (/^\d{13}$/.test(compact)) {
    return (compact.startsWith("978") || compact.startsWith("979")) && isValidIsbn13(compact)
      ? compact
      : null;
  }
  if (/^\d{9}[\dX]$/.test(compact) && isValidIsbn10(compact)) {
    const core = `978${compact.slice(0, 9)}`;
    return core + isbn13CheckDigit(core);
  }
  return null;
}

function isValidIsbn10(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const value = isbn[i] === "X" ? 10 : Number(isbn[i]);
    sum += value * (10 - i);
  }
  return sum % 11 === 0;
}

function isValidIsbn13(isbn: string): boolean {
  return isbn13CheckDigit(isbn.slice(0, 12)) === isbn[12];
}

function isbn13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}
