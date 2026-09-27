import { googleBooksEnabled, lookupGoogleIsbn, searchGoogleBooks } from "@/api/google-books";
import { lookupOpenLibraryEdition, searchOpenLibrary, searchOpenLibraryByIsbn } from "@/api/open-library";
import type { BookSource, SearchResult } from "@/api/search-result";
import type { BookDraft } from "@/types";
import { normalizeIsbn } from "@/utils/isbn";

type Found = { draft: BookDraft; source: BookSource };

/**
 * Finds one book by ISBN, trying each source in turn until one knows it:
 * Open Library search index → Open Library edition record → Google Books (when a key is set).
 * Resolves null when nobody knows the ISBN. Rejects only if every source failed (e.g. offline).
 */
export async function findByIsbn(isbn: string, signal?: AbortSignal): Promise<Found | null> {
  const sources: (() => Promise<Found | null>)[] = [
    async () => {
      const [first] = await searchOpenLibraryByIsbn(isbn, signal);
      return first ? { draft: first.draft, source: "openlibrary" } : null;
    },
    async () => {
      const draft = await lookupOpenLibraryEdition(isbn, signal);
      return draft ? { draft, source: "openlibrary" } : null;
    },
  ];
  if (googleBooksEnabled) {
    sources.push(async () => {
      const draft = await lookupGoogleIsbn(isbn, signal);
      return draft ? { draft, source: "google" } : null;
    });
  }

  let firstError: unknown = null;
  let anyAnswered = false;
  for (const source of sources) {
    try {
      const found = await source();
      anyAnswered = true;
      if (found) return found;
    } catch (error) {
      if (signal?.aborted) throw error;
      firstError ??= error;
    }
  }
  if (!anyAnswered && firstError) throw firstError;
  return null;
}

/**
 * Search for the Add screen. An ISBN goes through `findByIsbn`; text asks Open Library and Google
 * Books in parallel and interleaves them, so a book only one of them knows still shows up near the top.
 */
export async function searchBooks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const isbn = normalizeIsbn(query);
  if (isbn) {
    const found = await findByIsbn(isbn, signal);
    return found
      ? [{ key: `isbn:${isbn}`, source: found.source, year: null, readers: 0, rating: null, draft: found.draft }]
      : [];
  }

  const [openLibrary, google] = await Promise.allSettled([
    searchOpenLibrary(query, signal),
    googleBooksEnabled ? searchGoogleBooks(query, signal) : Promise.resolve([]),
  ]);
  if (openLibrary.status === "rejected" && google.status === "rejected") throw openLibrary.reason;

  return mergeResults(
    openLibrary.status === "fulfilled" ? openLibrary.value : [],
    google.status === "fulfilled" ? google.value : [],
  );
}

/** Interleaves two ranked lists (a1, b1, a2, b2, …), dropping books already listed. */
export function mergeResults(primary: SearchResult[], secondary: SearchResult[]): SearchResult[] {
  const merged: SearchResult[] = [];
  const seen = new Set<string>();
  const add = (result: SearchResult | undefined) => {
    if (!result) return;
    const ids = identities(result);
    if (ids.some((id) => seen.has(id))) return;
    ids.forEach((id) => seen.add(id));
    merged.push(result);
  };
  for (let i = 0; i < Math.max(primary.length, secondary.length); i++) {
    add(primary[i]);
    add(secondary[i]);
  }
  return merged;
}

function identities({ draft }: SearchResult): string[] {
  const title = draft.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const author = (draft.authors[0] ?? "").toLowerCase().split(/\s+/).pop() ?? "";
  const ids = [`t:${title}|${author}`];
  if (draft.isbn) ids.push(`i:${draft.isbn}`);
  return ids;
}
