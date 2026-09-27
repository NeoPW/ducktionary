/** Dates are stored as local ISO dates: `YYYY-MM-DD`. */
export type IsoDate = string;

export type Book = {
  id: number;
  isbn: string | null;
  title: string;
  authors: string[];
  pages: number | null;
  coverUrl: string | null;
  startedAt: IsoDate | null;
  finishedAt: IsoDate;
  /** 0.5–5 in half-star steps, or null when unrated. */
  rating: number | null;
  comment: string | null;
  categories: string[];
  createdAt: string;
};

/** A book before it is saved — from Open Library, a scan, or manual entry. */
export type BookDraft = Omit<Book, "id" | "createdAt">;
