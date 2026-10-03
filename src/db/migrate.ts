import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Ordered schema migrations. Never edit a shipped entry — append a new one.
 * `PRAGMA user_version` records how many have been applied.
 */
const migrations: string[] = [
  `
  CREATE TABLE books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn        TEXT,
    title       TEXT NOT NULL,
    authors     TEXT NOT NULL DEFAULT '[]',
    pages       INTEGER,
    cover_url   TEXT,
    started_at  TEXT,
    finished_at TEXT NOT NULL,
    rating      REAL CHECK (rating IS NULL OR (rating >= 0.5 AND rating <= 5)),
    comment     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX books_finished_at ON books (finished_at);

  CREATE TABLE categories (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );

  CREATE TABLE book_categories (
    book_id     INTEGER NOT NULL REFERENCES books (id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
  );

  CREATE TABLE goals (
    year   INTEGER PRIMARY KEY,
    target INTEGER NOT NULL CHECK (target > 0)
  );
  `,
  // v2: the yearly reading goal was dropped in favour of range-based stats.
  `
  DROP TABLE IF EXISTS goals;
  `,
  // v3: price (whole cents, EUR), format and how the book was acquired.
  `
  ALTER TABLE books ADD COLUMN price_cents INTEGER;
  ALTER TABLE books ADD COLUMN format TEXT;
  ALTER TABLE books ADD COLUMN acquisition TEXT;
  `,
  // v4: series — books that belong together, with their number in the series (2.5 for a novella in between).
  `
  CREATE TABLE series (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );
  ALTER TABLE books ADD COLUMN series_id INTEGER REFERENCES series (id) ON DELETE SET NULL;
  ALTER TABLE books ADD COLUMN series_position REAL;
  CREATE INDEX books_series ON books (series_id);
  `,
  // v5: quarter-star ratings (¼ is the lowest). SQLite can't change a CHECK, so the table is rebuilt.
  // Writes run on expo-sqlite's transaction connections, where foreign keys were never on, so deleted books
  // left their category links behind; those are cleaned up first.
  `
  DELETE FROM book_categories
    WHERE book_id NOT IN (SELECT id FROM books) OR category_id NOT IN (SELECT id FROM categories);
  DELETE FROM categories WHERE id NOT IN (SELECT DISTINCT category_id FROM book_categories);
  UPDATE books SET series_id = NULL WHERE series_id NOT IN (SELECT id FROM series);
  CREATE TABLE books_new (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    isbn            TEXT,
    title           TEXT NOT NULL,
    authors         TEXT NOT NULL DEFAULT '[]',
    pages           INTEGER,
    cover_url       TEXT,
    started_at      TEXT,
    finished_at     TEXT NOT NULL,
    rating          REAL CHECK (rating IS NULL OR (rating >= 0.25 AND rating <= 5)),
    comment         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    price_cents     INTEGER,
    format          TEXT,
    acquisition     TEXT,
    series_id       INTEGER REFERENCES series (id) ON DELETE SET NULL,
    series_position REAL
  );
  INSERT INTO books_new (id, isbn, title, authors, pages, cover_url, started_at, finished_at, rating, comment,
                         created_at, price_cents, format, acquisition, series_id, series_position)
    SELECT id, isbn, title, authors, pages, cover_url, started_at, finished_at, rating, comment,
           created_at, price_cents, format, acquisition, series_id, series_position
    FROM books;
  -- Keep the id counter, so ids of deleted books are never handed out again.
  DELETE FROM sqlite_sequence WHERE name = 'books_new';
  UPDATE sqlite_sequence SET name = 'books_new' WHERE name = 'books';
  DROP TABLE books;
  ALTER TABLE books_new RENAME TO books;
  CREATE INDEX books_finished_at ON books (finished_at);
  CREATE INDEX books_series ON books (series_id);
  `,
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  if (current < migrations.length) {
    // SQLite's way to rebuild a table: foreign keys off, so dropping the old table doesn't cascade into
    // book_categories; checked before the commit instead. The PRAGMA only works outside a transaction and only
    // on its own connection — hence withTransactionAsync here, not the exclusive one (a separate connection).
    // Runs before the app renders, so nothing else can interleave.
    await db.execAsync("PRAGMA foreign_keys = OFF;");
    await db.withTransactionAsync(async () => {
      for (let version = current; version < migrations.length; version++) {
        await db.execAsync(migrations[version]);
      }
      const broken = await db.getAllAsync("PRAGMA foreign_key_check");
      if (broken.length) throw new Error(`Migration left ${broken.length} broken references`);
      // PRAGMA doesn't accept bound parameters; the value is a trusted integer.
      await db.execAsync(`PRAGMA user_version = ${migrations.length}`);
    });
  }
  await db.execAsync("PRAGMA foreign_keys = ON;");
}
