import type { SQLiteDatabase } from "expo-sqlite";

import { insertBook } from "@/db/books";
import type { Acquisition, BookDraft, BookFormat, IsoDate } from "@/types";

const cover = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

function sample(
  isbn: string,
  title: string,
  authors: string[],
  pages: number,
  startedAt: IsoDate | null,
  finishedAt: IsoDate,
  rating: number | null,
  categories: string[],
  copy: Copy,
  comment: string | null = null,
): BookDraft {
  const [format, acquisition, price] = copy;
  return {
    isbn,
    title,
    authors,
    pages,
    coverUrl: cover(isbn),
    startedAt,
    finishedAt,
    rating,
    comment,
    categories,
    format,
    acquisition,
    priceCents: price != null ? Math.round(price * 100) : null,
  };
}

/** [format, how you got it, price in euros] — any part may be unknown. */
type Copy = [BookFormat | null, Acquisition | null, number | null];

/**
 * ~2 years of reading (30 books) across 2025–2026, varied enough to exercise every stat: overlapping
 * reads, books without a start date, unrated books, short/medium/long books, repeat authors.
 */
const SAMPLE_BOOKS: BookDraft[] = [
  // 2025
  sample("9780060850524", "Brave New World", ["Aldous Huxley"], 240, "2025-01-03", "2025-01-12", 4, ["Classics", "Dystopia"], ["paperback", "bought", 9.99]),
  sample("9780062316097", "Sapiens", ["Yuval Noah Harari"], 456, "2025-01-15", "2025-02-20", 4.5, ["Non-fiction", "History"], ["hardcover", "gift", null], "Big-picture history, hard to put down."),
  sample("9780345391803", "The Hitchhiker's Guide to the Galaxy", ["Douglas Adams"], 216, "2025-02-22", "2025-02-27", 5, ["Science fiction", "Humour"], ["paperback", "borrowed", null], "Don't panic."),
  sample("9780375704024", "Norwegian Wood", ["Haruki Murakami"], 389, null, "2025-03-30", 3.5, ["Literary fiction", "Romance"], ["paperback", "bought", 12.5]),
  sample("9780307387899", "The Road", ["Cormac McCarthy"], 256, "2025-04-05", "2025-04-11", 4, ["Literary fiction", "Dystopia"], ["ebook", "bought", 4.99]),
  sample("9780374533557", "Thinking, Fast and Slow", ["Daniel Kahneman"], 528, "2025-04-12", "2025-06-08", 3.5, ["Non-fiction", "Psychology"], ["paperback", "bought", 16.99]),
  sample("9780140177398", "Of Mice and Men", ["John Steinbeck"], 107, "2025-05-03", "2025-05-05", 4, ["Classics", "Literary fiction"], ["paperback", "borrowed", null]),
  sample("9780441569595", "Neuromancer", ["William Gibson"], 317, "2025-06-10", "2025-06-28", 3, ["Science fiction", "Cyberpunk"], ["ebook", "bought", 6.99]),
  sample("9780765350381", "Mistborn: The Final Empire", ["Brandon Sanderson"], 669, "2025-07-01", "2025-07-24", 5, ["Fantasy"], ["paperback", "bought", 11.99]),
  sample("9781984822178", "Normal People", ["Sally Rooney"], 304, "2025-08-02", "2025-08-09", null, ["Literary fiction", "Romance"], ["ebook", "bought", 8.99]),
  sample("9780451524935", "Nineteen Eighty-Four", ["George Orwell"], 318, "2025-09-01", "2025-09-15", 4.5, ["Classics", "Dystopia"], ["paperback", "bought", 8.5]),
  sample("9781250301697", "The Silent Patient", ["Alex Michaelides"], 352, "2025-10-03", "2025-10-08", 3, ["Thriller", "Mystery"], ["ebook", "bought", 5.99]),
  sample("9780141439518", "Pride and Prejudice", ["Jane Austen"], 480, null, "2025-11-15", 4, ["Classics", "Romance"], [null, null, null]),
  sample("9780735211292", "Atomic Habits", ["James Clear"], 323, "2025-12-01", "2025-12-20", 3.5, ["Non-fiction", "Self-help"], ["hardcover", "gift", null]),
  // 2026
  sample("9780441172719", "Dune", ["Frank Herbert"], 612, "2026-01-04", "2026-01-29", 5, ["Science fiction", "Classics"], ["hardcover", "bought", 24.99], "The spice must flow."),
  sample("9780441478125", "The Left Hand of Darkness", ["Ursula K. Le Guin"], 304, "2026-01-30", "2026-02-08", 4.5, ["Science fiction", "Classics"], ["paperback", "borrowed", null]),
  sample("9780547928227", "The Hobbit", ["J. R. R. Tolkien"], 300, "2026-02-10", "2026-02-21", 4.5, ["Fantasy", "Classics"], ["hardcover", "gift", null]),
  sample("9780399590504", "Educated", ["Tara Westover"], 384, "2026-02-22", "2026-03-10", 4.5, ["Non-fiction", "Memoir"], ["hardcover", "bought", 22]),
  sample("9780765382030", "The Three-Body Problem", ["Cixin Liu"], 400, "2026-03-12", "2026-04-02", 4, ["Science fiction"], ["paperback", "bought", 13.99]),
  sample("9780316556347", "Circe", ["Madeline Miller"], 404, "2026-04-04", "2026-04-19", 4.5, ["Fantasy", "Mythology"], ["hardcover", "bought", 26.5]),
  sample("9780593135204", "Project Hail Mary", ["Andy Weir"], 496, "2026-05-02", "2026-05-11", 4.5, ["Science fiction"], ["hardcover", "bought", 27.99], "Rocky!"),
  sample("9780553418026", "The Martian", ["Andy Weir"], 387, "2026-05-13", "2026-05-18", 4, ["Science fiction"], ["paperback", "borrowed", null]),
  sample("9780684801223", "The Old Man and the Sea", ["Ernest Hemingway"], 127, "2026-06-01", "2026-06-03", 3.5, ["Classics"], ["paperback", "bought", 7.99]),
  sample("9780525559474", "The Midnight Library", ["Matt Haig"], 304, null, "2026-06-07", 3, ["Literary fiction", "Fantasy"], ["ebook", "bought", 7.99]),
  sample("9780756404741", "The Name of the Wind", ["Patrick Rothfuss"], 662, "2026-06-10", "2026-07-12", 5, ["Fantasy"], ["paperback", "bought", 14.99]),
  sample("9780593318171", "Klara and the Sun", ["Kazuo Ishiguro"], 303, "2026-07-15", "2026-07-26", null, ["Literary fiction", "Science fiction"], ["ebook", "bought", 9.99]),
  sample("9780804172448", "Station Eleven", ["Emily St. John Mandel"], 333, "2026-08-01", "2026-08-14", 4, ["Literary fiction", "Dystopia"], ["paperback", null, null]),
  // Read alongside Station Eleven — overlapping days must not be double-counted.
  sample("9780143110439", "A Gentleman in Moscow", ["Amor Towles"], 462, "2026-08-10", "2026-09-05", 5, ["Historical fiction"], ["hardcover", "gift", null]),
  sample("9781635575637", "Piranesi", ["Susanna Clarke"], 272, "2026-09-12", "2026-09-19", 4.5, ["Fantasy", "Mystery"], ["hardcover", "bought", 21.99]),
  sample("9780451526342", "Animal Farm", ["George Orwell"], 141, "2026-09-21", "2026-09-23", 4.5, ["Classics", "Dystopia"], ["paperback", "bought", 6.5]),
];

/** Dev-only helpers to populate or wipe the library while building screens. */
export async function seedSampleBooks(db: SQLiteDatabase) {
  for (const book of SAMPLE_BOOKS) {
    await insertBook(db, book);
  }
}

export async function clearAllData(db: SQLiteDatabase) {
  await db.execAsync("DELETE FROM book_categories; DELETE FROM books; DELETE FROM categories;");
}
