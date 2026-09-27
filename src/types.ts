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
  /** Whole cents (EUR). Only meaningful for bought books. */
  priceCents: number | null;
  format: BookFormat | null;
  acquisition: Acquisition | null;
  createdAt: string;
};

export type BookFormat = "hardcover" | "paperback" | "ebook";
export type Acquisition = "bought" | "gift" | "borrowed";

/** A book before it is saved — from Open Library, a scan, or manual entry. */
export type BookDraft = Omit<Book, "id" | "createdAt">;
