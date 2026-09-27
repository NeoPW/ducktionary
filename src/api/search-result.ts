import type { BookDraft } from "@/types";

export type BookSource = "openlibrary" | "google";

export type SearchResult = {
  /** Unique per result, prefixed by source. */
  key: string;
  source: BookSource;
  year: number | null;
  /** How many Open Library readers logged this book — a rough popularity signal (0 for Google). */
  readers: number;
  /** Community rating (1–5), or null when nobody has rated it. */
  rating: { average: number; count: number } | null;
  draft: BookDraft;
};

export type SearchSort = "relevance" | "popular" | "rated";

// Weighted ("Bayesian") rating: each book's average is pulled toward a typical rating until it has
// enough votes, so one 5★ vote doesn't beat 4.3★ from hundreds of readers.
const PRIOR_RATING = 3.8;
const PRIOR_WEIGHT = 10;

export function weightedRating(rating: SearchResult["rating"]): number | null {
  if (!rating) return null;
  return (PRIOR_RATING * PRIOR_WEIGHT + rating.average * rating.count) / (PRIOR_WEIGHT + rating.count);
}

/** Re-orders fetched results. Ties (and unrated books, which go last) keep the relevance order. */
export function sortResults(results: SearchResult[], sort: SearchSort): SearchResult[] {
  if (sort === "popular") return [...results].sort((a, b) => b.readers - a.readers);
  if (sort === "rated") {
    return [...results].sort(
      (a, b) => (weightedRating(b.rating) ?? -1) - (weightedRating(a.rating) ?? -1),
    );
  }
  return results;
}

const NOISE =
  /new york times|nyt|bestseller|reviewed|accessible book|protected daisy|in library|lending library|large type|open library|staff picks|award|translations|^fiction$|^general$|^english$|^juvenile|^readers$/i;

/**
 * Subjects from book databases are noisy ("nyt:hardcover-fiction=2021-05-23",
 * "Fiction, science fiction, general", "Fiction / Science Fiction / General").
 * Picks up to `limit` short, readable categories.
 */
export function cleanSubjects(subjects: string[], limit = 3): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const raw of subjects) {
    if (/[:=()]/.test(raw)) continue;

    // "Fiction, science fiction, action & adventure" → "science fiction"
    const parts = raw
      .split(/,|\s\/\s/)
      .map((part) => part.trim())
      .filter((part) => part && !/^(fiction|general)$/i.test(part));
    let name = (parts[0] ?? "").replace(/\bsci-fi\b|\bscience-fiction\b/gi, "science fiction").trim();

    if (!name || name.length > 28 || NOISE.test(name)) continue;
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
    if (result.length === limit) break;
  }
  return result;
}
