import { deviceLanguage, fetchJson } from "@/api/http";
import { cleanSubjects, type SearchResult } from "@/api/search-result";
import type { BookDraft, BookFormat } from "@/types";
import { blankDraft } from "@/utils/book-draft";
import { todayIso } from "@/utils/dates";
import { normalizeIsbn } from "@/utils/isbn";

const BASE_URL = "https://openlibrary.org";
const SOURCE = "Open Library";
const HEADERS = { "User-Agent": "Ducktionary/1.0 (personal book tracker)" };
const FIELDS = [
  "key",
  "title",
  "author_name",
  "number_of_pages_median",
  "subject",
  "cover_i",
  "first_publish_year",
  "readinglog_count",
  "ratings_average",
  "ratings_count",
  "editions",
  "editions.title",
  "editions.number_of_pages",
  "editions.cover_i",
  "editions.isbn",
].join(",");

type SearchEditionDoc = {
  title?: string;
  number_of_pages?: number;
  cover_i?: number;
  isbn?: string[];
};

type WorkDoc = {
  key: string;
  title: string;
  author_name?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  cover_i?: number;
  first_publish_year?: number;
  /** Open Library users who logged the book as want-to-read, reading or read. */
  readinglog_count?: number;
  ratings_average?: number;
  ratings_count?: number;
  editions?: { docs?: SearchEditionDoc[] };
};

export function coverUrlForId(coverId: number) {
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
}

export function coverUrlForIsbn(isbn: string) {
  return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
}

/** Text search by title/author. */
export async function searchOpenLibrary(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const docs = await search({ q: query.trim(), limit: "20" }, signal);
  return docs.map((doc) => toResult(doc, null));
}

/** Search-index lookup by ISBN. Fast, but misses editions the index doesn't know. */
export async function searchOpenLibraryByIsbn(isbn: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const docs = await search({ isbn, limit: "5" }, signal);
  return docs.map((doc) => toResult(doc, isbn));
}

async function search(params: Record<string, string>, signal?: AbortSignal): Promise<WorkDoc[]> {
  const url = `${BASE_URL}/search.json?${new URLSearchParams({ ...params, fields: FIELDS, lang: deviceLanguage() })}`;
  const body = await fetchJson<{ docs?: WorkDoc[] }>(url, { source: SOURCE, signal, headers: HEADERS });
  return body?.docs ?? [];
}

function toResult(doc: WorkDoc, knownIsbn: string | null): SearchResult {
  const edition = doc.editions?.docs?.[0];
  const isbn = knownIsbn ?? firstIsbn13(edition?.isbn);
  const coverId = edition?.cover_i ?? doc.cover_i;

  return {
    key: `ol:${doc.key}`,
    source: "openlibrary",
    year: doc.first_publish_year ?? null,
    readers: doc.readinglog_count ?? 0,
    rating:
      doc.ratings_count && doc.ratings_average
        ? { average: doc.ratings_average, count: doc.ratings_count }
        : null,
    draft: blankDraft(todayIso(), {
      isbn,
      title: edition?.title ?? doc.title,
      authors: doc.author_name ?? [],
      pages: edition?.number_of_pages ?? doc.number_of_pages_median ?? null,
      coverUrl: coverId ? coverUrlForId(coverId) : isbn ? coverUrlForIsbn(isbn) : null,
      categories: cleanSubjects(doc.subject ?? []),
    }),
  };
}

type EditionRecord = {
  title?: string;
  authors?: { key: string }[];
  number_of_pages?: number;
  covers?: number[];
  subjects?: string[];
  works?: { key: string }[];
  /** Free text, e.g. "Hardcover", "Mass Market Paperback", "E-book". */
  physical_format?: string;
};

type WorkRecord = {
  subjects?: string[];
  authors?: { author?: { key: string } }[];
};

/**
 * Direct edition lookup (`/isbn/<isbn>.json`). Knows editions the search index lacks, and Open Library
 * may import unknown ISBNs from partner catalogues on the fly. Costs a few extra requests for names.
 */
export async function lookupOpenLibraryEdition(isbn: string, signal?: AbortSignal): Promise<BookDraft | null> {
  const get = <T>(path: string) => fetchJson<T>(`${BASE_URL}${path}.json`, { source: SOURCE, signal, headers: HEADERS });

  const edition = await get<EditionRecord>(`/isbn/${isbn}`);
  if (!edition?.title) return null;

  // Work and author records only add detail; a failure there shouldn't lose the book.
  const optional = <T>(promise: Promise<T | null>) => promise.catch(() => null);
  const workKey = edition.works?.[0]?.key;
  const work = workKey ? await optional(get<WorkRecord>(workKey)) : null;

  const authorKeys = (
    edition.authors?.map((a) => a.key) ??
    work?.authors?.flatMap((a) => (a.author ? [a.author.key] : [])) ??
    []
  ).slice(0, 3);
  const authors = await Promise.all(authorKeys.map((key) => optional(get<{ name?: string }>(key))));

  const coverId = edition.covers?.find((id) => id > 0);

  return blankDraft(todayIso(), {
    isbn,
    title: edition.title,
    authors: authors.flatMap((a) => (a?.name ? [a.name] : [])),
    pages: edition.number_of_pages ?? null,
    coverUrl: coverId ? coverUrlForId(coverId) : coverUrlForIsbn(isbn),
    categories: cleanSubjects(edition.subjects ?? work?.subjects ?? []),
    format: formatFromPhysical(edition.physical_format),
  });
}

/** Maps Open Library's free-text physical format onto ours, or null when it's unclear. */
export function formatFromPhysical(physical: string | undefined): BookFormat | null {
  const text = (physical ?? "").toLowerCase();
  if (/e-?book|kindle|epub|electronic/.test(text)) return "ebook";
  if (/hard ?(cover|back)|hardbound/.test(text)) return "hardcover";
  if (/paper ?(back|bound)|softcover|soft cover|mass market/.test(text)) return "paperback";
  return null;
}

function firstIsbn13(isbns: string[] | undefined): string | null {
  for (const candidate of isbns ?? []) {
    const isbn = normalizeIsbn(candidate);
    if (isbn) return isbn;
  }
  return null;
}
