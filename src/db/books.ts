import type { SQLiteDatabase } from "expo-sqlite";

import type { Acquisition, Book, BookDraft, BookFormat } from "@/types";
import { notifyLibraryChanged } from "@/db/events";
import { ACQUISITIONS, FORMATS, isPriced } from "@/utils/book-attributes";

type BookRow = {
  id: number;
  isbn: string | null;
  title: string;
  authors: string;
  pages: number | null;
  cover_url: string | null;
  started_at: string | null;
  finished_at: string;
  rating: number | null;
  comment: string | null;
  price_cents: number | null;
  format: string | null;
  acquisition: string | null;
  created_at: string;
  categories: string;
};

const SELECT_BOOKS = `
  SELECT b.*,
    (SELECT json_group_array(c.name)
       FROM book_categories bc JOIN categories c ON c.id = bc.category_id
      WHERE bc.book_id = b.id) AS categories
  FROM books b
`;

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    isbn: row.isbn,
    title: row.title,
    authors: JSON.parse(row.authors) as string[],
    pages: row.pages,
    coverUrl: row.cover_url,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    rating: row.rating,
    comment: row.comment,
    categories: (JSON.parse(row.categories) as string[]).sort((a, b) => a.localeCompare(b)),
    priceCents: row.price_cents,
    format: FORMATS.some((f) => f.value === row.format) ? (row.format as BookFormat) : null,
    acquisition: ACQUISITIONS.some((a) => a.value === row.acquisition) ? (row.acquisition as Acquisition) : null,
    createdAt: row.created_at,
  };
}

/** Rounds to the nearest half star within 0.5–5; anything else becomes unrated. */
export function normalizeRating(rating: number | null): number | null {
  if (rating == null || !Number.isFinite(rating)) return null;
  const rounded = Math.round(rating * 2) / 2;
  return rounded >= 0.5 ? Math.min(rounded, 5) : null;
}

function cleanList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (trimmed && !seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

function toParams(draft: BookDraft) {
  const title = draft.title.trim();
  if (!title) throw new Error("A book needs a title.");
  return {
    $isbn: draft.isbn?.trim() || null,
    $title: title,
    $authors: JSON.stringify(cleanList(draft.authors)),
    $pages: draft.pages != null && draft.pages > 0 ? Math.round(draft.pages) : null,
    $cover_url: draft.coverUrl || null,
    $started_at: draft.startedAt || null,
    $finished_at: draft.finishedAt,
    $rating: normalizeRating(draft.rating),
    $comment: draft.comment?.trim() || null,
    // Prices only belong to bought books; a gift or loan never counts as money spent.
    $price_cents:
      draft.priceCents != null && draft.priceCents >= 0 && isPriced(draft.acquisition)
        ? Math.round(draft.priceCents)
        : null,
    $format: draft.format,
    $acquisition: draft.acquisition,
  };
}

async function setCategories(db: SQLiteDatabase, bookId: number, names: string[]) {
  await db.runAsync("DELETE FROM book_categories WHERE book_id = ?", bookId);
  for (const name of cleanList(names)) {
    await db.runAsync("INSERT OR IGNORE INTO categories (name) VALUES (?)", name);
    await db.runAsync(
      "INSERT OR IGNORE INTO book_categories (book_id, category_id) SELECT ?, id FROM categories WHERE name = ?",
      bookId,
      name,
    );
  }
  await deleteUnusedCategories(db);
}

async function deleteUnusedCategories(db: SQLiteDatabase) {
  await db.runAsync(
    "DELETE FROM categories WHERE id NOT IN (SELECT DISTINCT category_id FROM book_categories)",
  );
}

/** All finished books, most recently finished first. */
export async function listBooks(db: SQLiteDatabase): Promise<Book[]> {
  const rows = await db.getAllAsync<BookRow>(
    `${SELECT_BOOKS} ORDER BY b.finished_at DESC, b.created_at DESC, b.id DESC`,
  );
  return rows.map(toBook);
}

export async function getBook(db: SQLiteDatabase, id: number): Promise<Book | null> {
  const row = await db.getFirstAsync<BookRow>(`${SELECT_BOOKS} WHERE b.id = ?`, id);
  return row ? toBook(row) : null;
}

export async function insertBook(db: SQLiteDatabase, draft: BookDraft): Promise<number> {
  let id = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    id = await insertBookRow(txn, draft);
  });
  notifyLibraryChanged();
  return id;
}

/**
 * Inserts one book inside a transaction the caller already holds (used by restore, which writes a
 * whole library in one transaction). `createdAt` keeps the original "added" time when given.
 */
export async function insertBookRow(txn: SQLiteDatabase, draft: BookDraft, createdAt?: string): Promise<number> {
  const result = await txn.runAsync(
    `INSERT INTO books (isbn, title, authors, pages, cover_url, started_at, finished_at, rating, comment,
                        price_cents, format, acquisition, created_at)
     VALUES ($isbn, $title, $authors, $pages, $cover_url, $started_at, $finished_at, $rating, $comment,
             $price_cents, $format, $acquisition, COALESCE($created_at, datetime('now')))`,
    { ...toParams(draft), $created_at: createdAt ?? null },
  );
  const id = result.lastInsertRowId;
  await setCategories(txn, id, draft.categories);
  return id;
}

export async function updateBook(db: SQLiteDatabase, id: number, draft: BookDraft): Promise<void> {
  const params = toParams(draft);
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE books SET isbn = $isbn, title = $title, authors = $authors, pages = $pages,
         cover_url = $cover_url, started_at = $started_at, finished_at = $finished_at,
         rating = $rating, comment = $comment,
         price_cents = $price_cents, format = $format, acquisition = $acquisition
       WHERE id = $id`,
      { ...params, $id: id },
    );
    await setCategories(txn, id, draft.categories);
  });
  notifyLibraryChanged();
}

export async function deleteBook(db: SQLiteDatabase, id: number): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM books WHERE id = ?", id);
    await deleteUnusedCategories(txn);
  });
  notifyLibraryChanged();
}

/** All category names in use, most used first — offered as suggestions in the book form. */
export async function listCategories(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT c.name FROM categories c
       JOIN book_categories bc ON bc.category_id = c.id
      GROUP BY c.id ORDER BY count(*) DESC, c.name COLLATE NOCASE`,
  );
  return rows.map((row) => row.name);
}

/** True when a book with this ISBN is already in the library (used to warn on re-scan). */
export async function hasIsbn(db: SQLiteDatabase, isbn: string): Promise<boolean> {
  const row = await db.getFirstAsync<{ found: number }>(
    "SELECT EXISTS (SELECT 1 FROM books WHERE isbn = ?) AS found",
    isbn,
  );
  return row?.found === 1;
}
