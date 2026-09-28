import type { Book, BookDraft, IsoDate } from "@/types";

/** An empty draft finished `today`, with `prefill` on top (search results, a scanned ISBN, …). */
export function blankDraft(today: IsoDate, prefill: Partial<BookDraft> = {}): BookDraft {
  return {
    isbn: null,
    title: "",
    authors: [],
    pages: null,
    coverUrl: null,
    startedAt: null,
    finishedAt: today,
    rating: null,
    comment: null,
    categories: [],
    priceCents: null,
    format: null,
    acquisition: null,
    ...prefill,
  };
}

/** The editable part of a saved book. */
export function bookToDraft({ id: _id, createdAt: _createdAt, ...draft }: Book): BookDraft {
  return draft;
}
