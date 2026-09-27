import { fetchJson } from "@/api/http";
import { cleanSubjects, type SearchResult } from "@/api/search-result";
import type { BookDraft } from "@/types";
import { todayIso } from "@/utils/dates";
import { normalizeIsbn } from "@/utils/isbn";

/**
 * Google Books needs an API key (the anonymous quota is 0). Set EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY in
 * `.env.local`; without it this source is skipped. The key ships inside the app, so restrict it to
 * the Books API in Google Cloud.
 */
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
const SOURCE = "Google Books";
const URL_BASE = "https://www.googleapis.com/books/v1/volumes";
const FIELDS =
  "items(id,volumeInfo(title,authors,pageCount,categories,imageLinks,industryIdentifiers,averageRating,ratingsCount,publishedDate))";

export const googleBooksEnabled = Boolean(API_KEY);

type Volume = {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    categories?: string[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
    averageRating?: number;
    ratingsCount?: number;
    publishedDate?: string;
  };
};

export async function searchGoogleBooks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  return request(query.trim(), "10", null, signal);
}

export async function lookupGoogleIsbn(isbn: string, signal?: AbortSignal): Promise<BookDraft | null> {
  const results = await request(`isbn:${isbn}`, "1", isbn, signal);
  return results[0]?.draft ?? null;
}

async function request(
  q: string,
  maxResults: string,
  knownIsbn: string | null,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  if (!API_KEY) return [];
  const params = new URLSearchParams({ q, maxResults, printType: "books", fields: FIELDS, key: API_KEY });
  const body = await fetchJson<{ items?: Volume[] }>(`${URL_BASE}?${params}`, { source: SOURCE, signal });
  return (body?.items ?? []).flatMap((volume) => {
    const result = toResult(volume, knownIsbn);
    return result ? [result] : [];
  });
}

function toResult(volume: Volume, knownIsbn: string | null): SearchResult | null {
  const info = volume.volumeInfo;
  if (!info.title) return null;

  const identifiers = info.industryIdentifiers ?? [];
  const isbn =
    knownIsbn ??
    normalizeIsbn(identifiers.find((id) => id.type === "ISBN_13")?.identifier ?? "") ??
    normalizeIsbn(identifiers.find((id) => id.type === "ISBN_10")?.identifier ?? "");
  const image = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  const year = Number(info.publishedDate?.slice(0, 4));

  return {
    key: `google:${volume.id}`,
    source: "google",
    year: Number.isFinite(year) && year > 0 ? year : null,
    readers: 0,
    rating:
      info.averageRating && info.ratingsCount
        ? { average: info.averageRating, count: info.ratingsCount }
        : null,
    draft: {
      isbn,
      title: info.title,
      authors: info.authors ?? [],
      pages: info.pageCount && info.pageCount > 0 ? info.pageCount : null,
      // Google hands out http:// links with a page-curl effect; ask for the plain https image.
      coverUrl: image ? image.replace(/^http:/, "https:").replace("&edge=curl", "") : null,
      startedAt: null,
      finishedAt: todayIso(),
      rating: null,
      comment: null,
      categories: cleanSubjects(info.categories ?? []),
    },
  };
}
