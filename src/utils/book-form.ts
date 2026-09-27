import { coverUrlForIsbn } from "@/api/open-library";
import type { Book, BookDraft, IsoDate } from "@/types";
import { normalizeIsbn } from "@/utils/isbn";

/** Editable form state: text inputs stay strings until validation. */
export type BookFormState = {
  title: string;
  authors: string[];
  isbn: string;
  pages: string;
  coverUrl: string | null;
  startedAt: IsoDate | null;
  finishedAt: IsoDate | null;
  rating: number | null;
  comment: string;
  categories: string[];
};

export type BookFormErrors = Partial<Record<"title" | "isbn" | "pages" | "startedAt" | "finishedAt", string>>;

export function draftToForm(draft: BookDraft): BookFormState {
  return {
    title: draft.title,
    authors: draft.authors,
    isbn: draft.isbn ?? "",
    pages: draft.pages != null ? String(draft.pages) : "",
    coverUrl: draft.coverUrl,
    startedAt: draft.startedAt,
    finishedAt: draft.finishedAt,
    rating: draft.rating,
    comment: draft.comment ?? "",
    categories: draft.categories,
  };
}

/** Validates the form; returns either errors or a draft ready to save. */
export function formToDraft(
  form: BookFormState,
  today: IsoDate,
): { ok: true; draft: BookDraft } | { ok: false; errors: BookFormErrors } {
  const errors: BookFormErrors = {};

  const title = form.title.trim();
  if (!title) errors.title = "Every book needs a title.";

  const isbnText = form.isbn.trim();
  const isbn = isbnText ? normalizeIsbn(isbnText) : null;
  if (isbnText && !isbn) errors.isbn = "That doesn't look like a valid ISBN.";

  const pagesText = form.pages.trim();
  const pages = pagesText ? Number(pagesText) : null;
  if (pages != null && (!/^\d+$/.test(pagesText) || pages < 1 || pages > 20000)) {
    errors.pages = "Pages should be a whole number.";
  }

  if (!form.finishedAt) errors.finishedAt = "When did you finish it?";
  else if (form.finishedAt > today) errors.finishedAt = "That's in the future — no time-travelling ducks.";

  if (form.startedAt && form.startedAt > today) {
    errors.startedAt = "That's in the future.";
  } else if (form.startedAt && form.finishedAt && form.startedAt > form.finishedAt) {
    errors.startedAt = "Started after you finished?";
  }

  if (Object.keys(errors).length > 0 || !form.finishedAt) return { ok: false, errors };

  return {
    ok: true,
    draft: {
      title,
      authors: form.authors,
      isbn,
      pages,
      coverUrl: form.coverUrl ?? (isbn ? coverUrlForIsbn(isbn) : null),
      startedAt: form.startedAt,
      finishedAt: form.finishedAt,
      rating: form.rating,
      comment: form.comment.trim() || null,
      categories: form.categories,
    },
  };
}

/** An empty draft for manual entry, optionally prefilled from what the user searched for. */
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
    ...prefill,
  };
}

/** The editable part of a saved book. */
export function bookToDraft({ id: _id, createdAt: _createdAt, ...draft }: Book): BookDraft {
  return draft;
}
