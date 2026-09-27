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
];

export async function migrateDbIfNeeded(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const current = row?.user_version ?? 0;
  if (current >= migrations.length) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let version = current; version < migrations.length; version++) {
      await txn.execAsync(migrations[version]);
    }
    // PRAGMA doesn't accept bound parameters; the value is a trusted integer.
    await txn.execAsync(`PRAGMA user_version = ${migrations.length}`);
  });
}
