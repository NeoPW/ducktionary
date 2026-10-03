/** Ratings run from ¼ to 5 stars in quarter steps. */
export const RATING_STEP = 0.25;
export const MAX_RATING = 5;

/** Rounds to the nearest quarter star within ¼–5; anything else becomes unrated. */
export function normalizeRating(rating: number | null): number | null {
  if (rating == null || !Number.isFinite(rating)) return null;
  const rounded = Math.round(rating / RATING_STEP) * RATING_STEP;
  return rounded >= RATING_STEP ? Math.min(rounded, MAX_RATING) : null;
}

/**
 * Tapping a star fills it up to that star; tapping the last filled star again takes a quarter off each time,
 * until that star is empty (below one star: unrated).
 */
export function nextRating(current: number | null, star: number): number | null {
  const value = current ?? 0;
  if (value <= star - 1 || value > star) return star;
  const next = value - RATING_STEP;
  return next > 0 ? next : null;
}

const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** 4.75 → "4¾", 0.5 → "½". */
export function ratingLabel(rating: number): string {
  const whole = Math.floor(rating);
  return `${whole || (FRACTIONS[rating - whole] ? "" : "0")}${FRACTIONS[rating - whole] ?? ""}`;
}

/** Ratings grouped by whole star, for charts and the library filter: 0 = under one star, 1 = 1–1¾, …, 5 = five. */
export type StarGroup = 0 | 1 | 2 | 3 | 4 | 5;

export const STAR_GROUPS: readonly { value: StarGroup; label: string }[] = ([0, 1, 2, 3, 4, 5] as const).map((g) => ({
  value: g,
  label: g === MAX_RATING ? "5" : `${g === 0 ? "¼" : g}–${ratingLabel(g + 1 - RATING_STEP)}`,
}));

export const starGroup = (rating: number | null): StarGroup | null =>
  rating == null ? null : (Math.min(MAX_RATING, Math.floor(rating)) as StarGroup);
