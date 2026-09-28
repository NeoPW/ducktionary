/**
 * A backup snapshot: the whole library plus the user's settings as one JSON document. The same
 * format is used for cloud backups and for exported backup files.
 *
 * No React Native imports — settings storage is passed in, so this runs in Node tests too.
 */
import type { SQLiteDatabase } from "expo-sqlite";

import { insertBookRow, listBooks } from "@/db/books";
import { notifyLibraryChanged } from "@/db/events";
import type { Acquisition, Book, BookDraft, BookFormat } from "@/types";

/** Bump when the snapshot shape changes; older formats must keep restoring. */
export const SNAPSHOT_FORMAT = 1;

/** Settings that travel with a backup (the rest is device-specific). */
export const BACKUP_SETTING_KEYS = [
  "theme.v1",
  "goose.enabled",
  "stats.range",
  "stats.chart",
  "stats.chartStyle",
  "add.searchSort",
] as const;

export type SnapshotBook = Omit<Book, "id">;

export type Snapshot = {
  app: "ducktionary";
  format: number;
  /** Local database schema version at the time of the backup (informational). */
  schemaVersion: number;
  appVersion: string;
  createdAt: string;
  books: SnapshotBook[];
  settings: Partial<Record<(typeof BACKUP_SETTING_KEYS)[number], string>>;
};

export type SettingsStore = {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
};

export class SnapshotError extends Error {}

export async function buildSnapshot(
  db: SQLiteDatabase,
  { appVersion, settings, now = new Date() }: { appVersion: string; settings: SettingsStore; now?: Date },
): Promise<Snapshot> {
  const version = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const books = (await listBooks(db)).map(({ id: _id, ...book }) => book);
  const saved: Snapshot["settings"] = {};
  for (const key of BACKUP_SETTING_KEYS) {
    const value = settings.get(key);
    if (value != null) saved[key] = value;
  }
  return {
    app: "ducktionary",
    format: SNAPSHOT_FORMAT,
    schemaVersion: version?.user_version ?? 0,
    appVersion,
    createdAt: now.toISOString(),
    books,
    settings: saved,
  };
}

// ─── Validation ─────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const FORMATS: readonly BookFormat[] = ["hardcover", "paperback", "ebook"];
const ACQUISITIONS: readonly Acquisition[] = ["bought", "gift", "borrowed"];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const textOrNull = (v: unknown, max: number) => v === null || text(v, max);
const numberOrNull = (v: unknown, min: number, max: number) =>
  v === null || (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max);
const texts = (v: unknown, maxItems: number, maxLength: number): v is string[] =>
  Array.isArray(v) && v.length <= maxItems && v.every((item) => text(item, maxLength));

function checkBook(b: unknown, index: number): SnapshotBook {
  const where = `Book ${index + 1}`;
  if (!isObject(b)) throw new SnapshotError(`${where} is not readable.`);
  if (!text(b.title, 500) || !b.title.trim()) throw new SnapshotError(`${where} has no title.`);
  if (!texts(b.authors, 50, 300)) throw new SnapshotError(`${where} has an invalid author list.`);
  if (!texts(b.categories, 50, 100)) throw new SnapshotError(`${where} has an invalid category list.`);
  if (!(text(b.finishedAt, 10) && ISO_DATE.test(b.finishedAt))) throw new SnapshotError(`${where} has no valid finish date.`);
  if (!(b.startedAt === null || (text(b.startedAt, 10) && ISO_DATE.test(b.startedAt)))) {
    throw new SnapshotError(`${where} has an invalid start date.`);
  }
  if (!textOrNull(b.isbn, 20)) throw new SnapshotError(`${where} has an invalid ISBN.`);
  if (!(b.coverUrl === null || (text(b.coverUrl, 2000) && /^https:\/\//.test(b.coverUrl)))) {
    throw new SnapshotError(`${where} has an invalid cover link.`);
  }
  if (!textOrNull(b.comment, 20_000)) throw new SnapshotError(`${where} has an invalid comment.`);
  if (!numberOrNull(b.pages, 1, 100_000)) throw new SnapshotError(`${where} has an invalid page count.`);
  if (!numberOrNull(b.rating, 0.5, 5)) throw new SnapshotError(`${where} has an invalid rating.`);
  if (!numberOrNull(b.priceCents, 0, 100_000_000)) throw new SnapshotError(`${where} has an invalid price.`);
  if (!(b.format === null || FORMATS.includes(b.format as BookFormat))) throw new SnapshotError(`${where} has an unknown format.`);
  if (!(b.acquisition === null || ACQUISITIONS.includes(b.acquisition as Acquisition))) {
    throw new SnapshotError(`${where} has an unknown "how you got it".`);
  }
  if (!text(b.createdAt, 40)) throw new SnapshotError(`${where} has no creation time.`);
  return {
    title: b.title,
    authors: b.authors,
    categories: b.categories,
    finishedAt: b.finishedAt,
    startedAt: b.startedAt as string | null,
    isbn: b.isbn as string | null,
    coverUrl: b.coverUrl as string | null,
    comment: b.comment as string | null,
    pages: b.pages as number | null,
    rating: b.rating as number | null,
    priceCents: b.priceCents as number | null,
    format: b.format as BookFormat | null,
    acquisition: b.acquisition as Acquisition | null,
    createdAt: b.createdAt,
  };
}

/** Checks untrusted JSON (a cloud row or an imported file) and returns a clean snapshot. */
export function validateSnapshot(input: unknown): Snapshot {
  if (!isObject(input) || input.app !== "ducktionary") throw new SnapshotError("This isn't a Ducktionary backup.");
  if (typeof input.format !== "number" || input.format < 1) throw new SnapshotError("This backup is damaged.");
  if (input.format > SNAPSHOT_FORMAT) {
    throw new SnapshotError("This backup was made by a newer version of Ducktionary. Update the app, then try again.");
  }
  if (!Array.isArray(input.books) || input.books.length > 100_000) throw new SnapshotError("This backup has no readable books.");
  const settings: Snapshot["settings"] = {};
  if (isObject(input.settings)) {
    for (const key of BACKUP_SETTING_KEYS) {
      const value = input.settings[key];
      if (text(value, 200_000)) settings[key] = value;
    }
  }
  return {
    app: "ducktionary",
    format: input.format,
    schemaVersion: typeof input.schemaVersion === "number" ? input.schemaVersion : 0,
    appVersion: text(input.appVersion, 32) ? input.appVersion : "unknown",
    createdAt: text(input.createdAt, 40) ? input.createdAt : new Date(0).toISOString(),
    books: input.books.map(checkBook),
    settings,
  };
}

// ─── Restore ────────────────────────────────────────────────────────────────

/**
 * Replaces the whole library with the snapshot in one transaction (all or nothing), then writes the
 * backed-up settings. Returns the number of books restored.
 */
export async function restoreSnapshot(db: SQLiteDatabase, snapshot: Snapshot, settings: SettingsStore): Promise<number> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync("DELETE FROM book_categories; DELETE FROM books; DELETE FROM categories;");
    // Oldest first, so row ids keep the original order.
    for (const { createdAt, ...book } of [...snapshot.books].reverse()) {
      const draft: BookDraft = book;
      await insertBookRow(txn, draft, createdAt);
    }
  });
  for (const key of BACKUP_SETTING_KEYS) {
    const value = snapshot.settings[key];
    if (value != null) settings.set(key, value);
  }
  notifyLibraryChanged();
  return snapshot.books.length;
}

/** Stable fingerprint of what a backup contains (ignores when it was taken) — skips identical uploads. */
export function contentHash(snapshot: Snapshot): string {
  const source = stableStringify([snapshot.books, snapshot.settings]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${source.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/** JSON with object keys sorted, so the same content always gives the same string. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
