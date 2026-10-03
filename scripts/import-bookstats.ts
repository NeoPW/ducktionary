/**
 * Converts a Bookstats CSV export ("Bookstats_YYYYMMDD-HHMM.csv", German column names, ";"-separated) into a
 * Ducktionary backup file, for loading a real library as example data (see local/README.md).
 *
 *   npm run import:bookstats -- local/bookstats.csv [local/example-library.json]
 *
 * Only read books ("Gelesen") are taken. Shop add-ons are cut from titles and series are picked out of them
 * ("(Name, Band 2)", "Name 2: …", shared "Name - …" prefixes); series the titles don't give away can be set in
 * "bookstats-series.json" next to the CSV (see below). Check the result — the app validates the file
 * again when it loads it. The output is a normal backup, so it can also be imported in Settings.
 */
import fs from "node:fs";
import path from "node:path";

import { loadEnv } from "./env.ts";

type Series = { name: string; position: number | null };
type Book = {
  isbn: string | null;
  title: string;
  authors: string[];
  pages: number | null;
  coverUrl: string | null;
  startedAt: string | null;
  finishedAt: string;
  rating: number | null;
  comment: string | null;
  categories: string[];
  priceCents: number | null;
  format: "hardcover" | "paperback" | "ebook" | null;
  acquisition: "bought" | "gift" | "borrowed" | null;
  series: Series | null;
  createdAt: string;
};

const [input, output = "local/example-library.json"] = process.argv.slice(2);
if (!input) {
  console.error("Usage: npm run import:bookstats -- <export.csv> [output.json]");
  process.exit(1);
}

// ─── CSV ────────────────────────────────────────────────────────────────────

/** Semicolon-separated, fields in double quotes with "" as an escaped quote. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ";") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

// ─── Fields ─────────────────────────────────────────────────────────────────

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** "18.07.2026" → "2026-07-18". */
function isoDate(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

/** A valid ISBN-13 (from 13 or 10 digits), or null. */
function isbn13(raw: string): string | null {
  const s = raw.replace(/[\s-]/g, "").toUpperCase();
  const check13 = (d: string) => String((10 - ([...d].reduce((sum, c, i) => sum + Number(c) * (i % 2 ? 3 : 1), 0) % 10)) % 10);
  if (/^97[89]\d{10}$/.test(s)) return check13(s.slice(0, 12)) === s[12] ? s : null;
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = [...s].reduce((acc, c, i) => acc + (c === "X" ? 10 : Number(c)) * (10 - i), 0);
    if (sum % 11 !== 0) return null;
    const core = `978${s.slice(0, 9)}`;
    return core + check13(core);
  }
  return null;
}

const FORMATS: Record<string, Book["format"]> = { "e-book": "ebook", ebook: "ebook", taschenbuch: "paperback", hardcover: "hardcover" };
/** A prize ("Gewinn") cost nothing, like a gift. */
const ACQUISITIONS: Record<string, Book["acquisition"]> = { kauf: "bought", geschenk: "gift", gewinn: "gift", leihe: "borrowed" };

// ─── Titles and series ──────────────────────────────────────────────────────

/** Subtitles that are shop copy, not part of the title. */
const MARKETING =
  /\b(roman|thriller|psychothriller|romantasy|fantasy|saga|farbschnitt|auflage|ausgabe|tiktok|booktok|leser|fans|buch zu[rm]|ausgezeichnet|prequel|epische[rn]?|spannende|knisternde|dramatische|auftakt|bestseller|sensation|liebesroman|bittersweet|must-read|der neue|lesebändchen|luxusausgabe|ein unwiderstehliches)\b/i;
const JUNK_PARENS = /farbschnitt|auflage|ausgabe|garantie/i;

const number = (s: string) => Number(s.replace(",", "."));
/** "Mistborn 1", "Die Scheibenwelt, Band 2", "The Expanse, 1" → name and number. */
function seriesFrom(text: string): Series | null {
  const t = clean(text);
  const m = t.match(/^(.+?),?\s+(?:Band|Bd\.|Buch|Book|Teil)\s*(\d+(?:[.,]\d+)?)$/i) ?? t.match(/^(.+?),?\s+(\d+(?:[.,]\d+)?)$/);
  if (m) return { name: clean(m[1]), position: number(m[2]) };
  return null;
}

/** "Ein Sherlock-Holmes-Roman" → "Sherlock Holmes", "Tintenwelt-Trilogie" → "Tintenwelt". */
const seriesName = (name: string) =>
  name
    .replace(/^Ein(?:e)?\s+(.+)-(?:Roman|Krimi|Thriller)$/i, (_all, who: string) => who.replace(/-/g, " "))
    .replace(/-(?:Reihe|Trilogie|Dilogie|Saga|Serie)$/i, "");

/** ALL-CAPS words become normal words ("DRACHENFEUER" → "Drachenfeuer"). */
const unshout = (s: string) =>
  s.replace(/\b[A-ZÄÖÜ]{3,}\b/g, (w) => w.charAt(0) + w.slice(1).toLowerCase());

function parseTitle(raw: string): { title: string; series: Series | null } {
  let title = clean(raw.split(" | ")[0]);
  let series: Series | null = null;
  let position: number | null = null;

  // Parentheses: "(Name, Band 2)" / "(Name 1)" → series; "(2)" → number; shop notes → dropped.
  title = title.replace(/\s*\(([^()]*)\)/g, (_all, inner: string) => {
    const text = clean(inner);
    if (JUNK_PARENS.test(text)) return "";
    if (/^\d+$/.test(text)) {
      position = Number(text);
      return "";
    }
    series ??= seriesFrom(text) ?? (/\d/.test(text) ? null : { name: text, position: null });
    return "";
  });

  // Marketing subtitles, from the end: ": Roman", " - Ein unwiderstehliches Fantasy-Epos", …
  // (A full stop after a single capital is an initial or numeral — "Ursula K. Le Guin", "Teil V." — not a cut.)
  const cuts = [...title.matchAll(/:\s|\s[-–]\s|(?<!(?:^|\s)\p{Lu})\.\s/gu)].map((m) => m.index);
  for (const cut of cuts.reverse()) {
    if (!MARKETING.test(title.slice(cut))) break;
    title = clean(title.slice(0, cut));
  }

  // "Name 2: Title" / "Name 4 - Title" → series.
  const lead = title.match(/^(.+?)\s+(\d+)\s*(?::|\s[-–])\s*(.+)$/);
  if (lead && !series) series = { name: clean(lead[1]), position: Number(lead[2]) };
  // "Title - Name 1" (e.g. "Feuer - Die Chroniken von Andor 1").
  const tail = title.match(/^(.+?)\s[-–]\s(.+?)\s+(\d+)$/);
  if (tail && !series) {
    series = { name: clean(tail[2]), position: Number(tail[3]) };
    title = clean(tail[1]);
  }
  // "Title: Name-Reihe 03" → series, keep the title.
  const colon = title.match(/^(.+?):\s+(.+?)\s+(\d+)$/);
  if (colon && /reihe|serie|series|saga|trilogie|chronik/i.test(colon[2])) {
    series ??= { name: clean(colon[2]), position: Number(colon[3]) };
    title = clean(colon[1]);
  }
  // A leftover ": Die Tintenwelt-Reihe 01" style subtitle once the series is known.
  title = title.replace(/:\s+[^:]*(reihe|serie|series)\s+\d+$/i, "");

  const found = series as Series | null;
  return {
    title: unshout(title),
    series: found ? { name: seriesName(unshout(found.name)), position: found.position ?? position } : null,
  };
}

// ─── Authors ────────────────────────────────────────────────────────────────

/** "Pratchett, Terry" → "Terry Pratchett". */
function author(raw: string): string {
  const s = clean(raw);
  const m = s.match(/^([^,\s]+),\s*([^,]+)$/);
  return m ? `${clean(m[2])} ${m[1]}` : s;
}

// ─── Convert ────────────────────────────────────────────────────────────────

const [header, ...rows] = parseCsv(fs.readFileSync(input, "utf8").replace(/^﻿/, ""));
const col = (name: string) => {
  const i = header.findIndex((h) => clean(h) === name);
  if (i < 0) throw new Error(`Column "${name}" not found — is this a Bookstats export?`);
  return i;
};
const C = {
  title: col("Titel"),
  authors: col("Autor(en)"),
  isbn: col("ISBN"),
  genre: col("Genre"),
  pages: col("Seitenanzahl"),
  format: col("Buchart"),
  price: col("Preis"),
  got: col("Erhalten als"),
  status: col("Lesestatus"),
  start: col("Lesebeginn"),
  end: col("Leseende"),
  rating: col("Bewertung"),
  notes: col("Notizen"),
};

const skipped: string[] = [];
const books: Book[] = rows.flatMap((r): Book[] => {
  const finishedAt = isoDate(r[C.end]);
  if (clean(r[C.status]).toLowerCase() !== "gelesen" || !finishedAt) {
    skipped.push(clean(r[C.title]));
    return [];
  }
  const startedAt = isoDate(r[C.start]);
  const isbn = isbn13(r[C.isbn]);
  const pages = Number(r[C.pages]);
  const rating = Number(r[C.rating].replace(",", "."));
  const acquisition = ACQUISITIONS[clean(r[C.got]).toLowerCase()] ?? null;
  const price = Math.round(Number(r[C.price].replace(",", ".")) * 100);
  const { title, series } = parseTitle(r[C.title]);
  return [
    {
      isbn,
      title,
      authors: r[C.authors].split(/;|\s&\s/).map(author).filter(Boolean),
      pages: pages > 0 ? pages : null,
      coverUrl: null,
      startedAt: startedAt && startedAt <= finishedAt ? startedAt : null,
      finishedAt,
      rating: rating >= 0.25 ? Math.min(5, Math.round(rating * 4) / 4) : null,
      comment: clean(r[C.notes]) || null,
      categories: clean(r[C.genre]) ? [clean(r[C.genre])] : [],
      priceCents: acquisition === "bought" && price > 0 ? price : null,
      format: FORMATS[clean(r[C.format]).toLowerCase()] ?? null,
      acquisition,
      series,
      createdAt: `${finishedAt} 12:00:00`,
    },
  ];
});

// The same author written differently ("Mars Liane" / "Liane Mars"): use the most common spelling.
const nameKey = (name: string) => name.toLowerCase().split(" ").sort().join(" ");
const spellings = new Map<string, Map<string, number>>();
for (const name of books.flatMap((b) => b.authors)) {
  const forms = spellings.get(nameKey(name)) ?? new Map<string, number>();
  forms.set(name, (forms.get(name) ?? 0) + 1);
  spellings.set(nameKey(name), forms);
}
const usual = (name: string) => [...spellings.get(nameKey(name))!].sort((a, b) => b[1] - a[1])[0][0];
for (const book of books) book.authors = book.authors.map(usual);

// Several books of one author sharing "Name - …" / "Name – …" without a series yet: that name is the series.
const prefix = (title: string) => title.match(/^(.+?)\s[-–]\s/)?.[1];
for (const book of books) {
  const name = prefix(book.title);
  if (book.series || !name) continue;
  const siblings = books.filter((b) => prefix(b.title) === name && b.authors[0] === book.authors[0]);
  if (siblings.length > 1) book.series = { name, position: null };
}

// Series the titles don't give away: an optional "bookstats-series.json" next to the CSV,
// { "<title as imported>": { "name": "…", "position": 2 } | null }.
const overridesFile = path.join(path.dirname(input), "bookstats-series.json");
const overrides: Record<string, Series | null> = fs.existsSync(overridesFile)
  ? JSON.parse(fs.readFileSync(overridesFile, "utf8"))
  : {};
const unused = new Set(Object.keys(overrides));
for (const book of books) {
  if (!(book.title in overrides)) continue;
  book.series = overrides[book.title];
  unused.delete(book.title);
}
if (unused.size) console.warn(`Not in the export (check the spelling): ${[...unused].join("; ")}`);

// ─── Covers ─────────────────────────────────────────────────────────────────
// Open Library has covers for few German editions (and answers with a blank placeholder otherwise), so this asks
// the sources the app's own search uses, most exact first: this edition on Open Library, this edition on Google
// Books, then any edition by title and author. Answers are kept in "bookstats-covers.json" next to the CSV, so
// reruns don't ask again: delete it to look again, or put a cover link in by hand where none was found.

const GOOGLE_KEY = loadEnv().EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;
const coversFile = path.join(path.dirname(input), "bookstats-covers.json");
const coverCache: Record<string, string | null> = fs.existsSync(coversFile)
  ? JSON.parse(fs.readFileSync(coversFile, "utf8"))
  : {};

async function getJson<T>(url: string): Promise<T> {
  // Google Books answers bursts with 429/503: wait and retry a few times (2 s, 4 s, 8 s, 16 s).
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": "Ducktionary Bookstats import" } });
    if (response.ok) return (await response.json()) as T;
    if (![429, 503].includes(response.status) || attempt === 4) {
      throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000 * 2 ** attempt));
  }
}

async function openLibraryEdition(isbn: string) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
  const response = await fetch(`${url}?default=false`, { method: "HEAD" });
  return response.ok ? url : null;
}

/** A title search finds other books too: only take one whose title and an author's name match. */
type Wanted = { title: string; authors: string[] } | null;
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
function isWanted(wanted: Wanted, title = "", authors: string[] = []) {
  if (!wanted) return true;
  const found = words(title).join(" ");
  const names = new Set(authors.flatMap(words));
  return found.startsWith(words(wanted.title).join(" ")) && wanted.authors.flatMap(words).some((w) => w.length > 2 && names.has(w));
}

async function google(q: string, wanted: Wanted = null) {
  if (!GOOGLE_KEY) return null;
  type Volume = { volumeInfo?: { title?: string; authors?: string[]; imageLinks?: { thumbnail?: string; smallThumbnail?: string } } };
  const fields = "items(volumeInfo(title,authors,imageLinks))";
  const params = new URLSearchParams({ q, maxResults: "10", printType: "books", fields, key: GOOGLE_KEY });
  const body = await getJson<{ items?: Volume[] }>(`https://www.googleapis.com/books/v1/volumes?${params}`);
  const image = body.items
    ?.filter(({ volumeInfo: v }) => isWanted(wanted, v?.title, v?.authors))
    .map(({ volumeInfo: v }) => v?.imageLinks?.thumbnail ?? v?.imageLinks?.smallThumbnail)
    .find(Boolean);
  // Like the app: https, and without the page-curl effect.
  return image ? image.replace(/^http:/, "https:").replace("&edge=curl", "") : null;
}

async function openLibrarySearch(title: string, authors: string[]) {
  const params = new URLSearchParams({ title, author: authors[0] ?? "", fields: "title,author_name,cover_i", limit: "10" });
  type Doc = { title?: string; author_name?: string[]; cover_i?: number };
  const body = await getJson<{ docs?: Doc[] }>(`https://openlibrary.org/search.json?${params}`);
  const id = body.docs?.find((d) => d.cover_i && isWanted({ title, authors }, d.title, d.author_name))?.cover_i;
  return id ? `https://covers.openlibrary.org/b/id/${id}-M.jpg` : null;
}

async function findCover(book: Book): Promise<string | null> {
  const author = book.authors[0] ?? "";
  // "The Hobbit - Hin und zurück" → also try "The Hobbit".
  const short = book.title.split(/:\s|\s[-–]\s/)[0];
  const tries = [
    ...(book.isbn ? [() => openLibraryEdition(book.isbn!), () => google(`isbn:${book.isbn}`)] : []),
    ...[...new Set([book.title, short])].flatMap((title) => [
      () => google(`intitle:${title} inauthor:${author}`, { title, authors: book.authors }),
      () => openLibrarySearch(title, book.authors),
    ]),
  ];
  for (const attempt of tries) {
    const url = await attempt();
    if (url) return url;
  }
  return null;
}

const coverKey = (book: Book) => book.isbn ?? `${book.title} / ${book.authors.join(", ")}`;
let coverErrors = 0;
const queue = books.filter((b) => !(coverKey(b) in coverCache));
if (queue.length) console.log(`Looking up ${queue.length} covers${GOOGLE_KEY ? "" : " (no Google Books key in .env.local)"}…`);
await Promise.all(
  Array.from({ length: 2 }, async () => {
    for (let book = queue.shift(); book; book = queue.shift()) {
      try {
        coverCache[coverKey(book)] = await findCover(book);
      } catch (error) {
        coverErrors++;
        console.warn(`Cover for "${book.title}": ${(error as Error).message}`);
      }
    }
  }),
);
fs.writeFileSync(coversFile, JSON.stringify(coverCache, null, 1));
for (const book of books) book.coverUrl = coverCache[coverKey(book)] ?? null;

books.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
const snapshot = {
  app: "ducktionary",
  format: 2,
  schemaVersion: 5,
  appVersion: "bookstats-import",
  createdAt: new Date().toISOString(),
  books,
  settings: {},
};
fs.writeFileSync(output, JSON.stringify(snapshot, null, 1));

console.log(`${books.length} books → ${output}${skipped.length ? ` (skipped, not read: ${skipped.length})` : ""}`);
const noCover = books.filter((b) => !b.coverUrl).map((b) => b.title);
console.log(`Covers: ${books.length - noCover.length} of ${books.length}${noCover.length ? ` — none for: ${noCover.join("; ")}` : ""}`);
if (coverErrors) console.log(`${coverErrors} cover lookups failed (e.g. offline); run again to retry them.`);
const bySeries = new Map<string, string[]>();
for (const b of books) if (b.series) bySeries.set(b.series.name, [...(bySeries.get(b.series.name) ?? []), `${b.series.position ?? "?"}`]);
console.log(`Series: ${[...bySeries].map(([name, nos]) => `${name} (${nos.sort().join(", ")})`).join("; ") || "none"}`);
