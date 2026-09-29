/**
 * Finds the drawn mascot PNGs in assets/mascots/ and checks them against the art spec.
 * Shared by mascot-sync, mascot-gallery and mascot-icons.
 */
import fs from "node:fs";
import zlib from "node:zlib";

import {
  ART_SPEC,
  MOOD_FOLDER,
  MOODS,
  PEEK_FOLDER,
  PEEK_POSES,
  WALK_FOLDER,
  WALK_FRAMES,
  type Mood,
  type PeekPose,
  type WalkFrame,
} from "../src/components/mascot/art.ts";

export const root = new URL("..", import.meta.url);
export const artDir = new URL("assets/mascots/", root);

export type ArtFile = {
  /** Path relative to the repo root, e.g. "assets/mascots/goose/reading.png". */
  path: string;
  width: number;
  height: number;
  bytes: number;
  hasAlpha: boolean;
  /** False when the corner pixels are opaque, i.e. the background was probably not removed. */
  cornersClear: boolean | null;
};

/**
 * Only images with a real transparent background go into the app — a painted-on background (or a
 * painted checkerboard) would show as a box behind the goose. Size and weight are just warnings.
 */
export const isUsable = (file: ArtFile) => file.hasAlpha && file.cornersClear !== false;

export type ArtScan = {
  moods: Partial<Record<Mood, ArtFile>>;
  peek: Partial<Record<PeekPose, ArtFile>>;
  walk: Partial<Record<WalkFrame, ArtFile>>;
  warnings: string[];
  /** Every image still to draw, as repo-relative paths. */
  missing: string[];
};

/** Reads size and transparency from a PNG's header chunks. */
function readPng(file: URL): Omit<ArtFile, "path"> | null {
  const data = fs.readFileSync(file);
  const signature = "89504e470d0a1a0a";
  if (data.subarray(0, 8).toString("hex") !== signature) return null;
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const colorType = data[25];
  // 4 = grey + alpha, 6 = RGBA; palette/greyscale/RGB images can carry a tRNS chunk instead.
  let hasAlpha = colorType === 4 || colorType === 6;
  for (let offset = 8; !hasAlpha && offset + 8 <= data.length; ) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "tRNS") hasAlpha = true;
    if (type === "IDAT" || type === "IEND") break;
    offset += 12 + length;
  }
  return { width, height, bytes: data.length, hasAlpha, cornersClear: hasAlpha ? cornersClear(data, width, height) : null };
}

/**
 * Decodes an 8-bit, non-interlaced RGBA PNG just far enough to read the alpha of its four corners.
 * Returns null for other layouts (then only the header check applies).
 */
function cornersClear(data: Buffer, width: number, height: number): boolean | null {
  const [bitDepth, colorType, , , interlace] = data.subarray(24, 29);
  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) return null;
  const idat: Buffer[] = [];
  for (let offset = 8; offset + 8 <= data.length; ) {
    const length = data.readUInt32BE(offset);
    const type = data.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idat.push(data.subarray(offset + 8, offset + 8 + length));
    if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  let previous = Buffer.alloc(stride);
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const left = i >= bpp ? line[i - bpp] : 0;
      const up = previous[i];
      const upLeft = i >= bpp ? previous[i - bpp] : 0;
      if (filter === 1) line[i] = (line[i] + left) & 255;
      else if (filter === 2) line[i] = (line[i] + up) & 255;
      else if (filter === 3) line[i] = (line[i] + ((left + up) >> 1)) & 255;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        line[i] = (line[i] + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
      }
    }
    if (y === 0 || y === height - 1) rows.push(line);
    previous = line;
  }
  const alphaAt = (row: Buffer, x: number) => row[x * bpp + 3];
  const corners = rows.flatMap((row) => [alphaAt(row, 0), alphaAt(row, width - 1)]);
  return corners.every((alpha) => alpha < 16);
}

function check(path: string, info: Omit<ArtFile, "path">, spec: { width: number; height: number }, warnings: string[]) {
  const ratio = info.width / info.height;
  const wanted = spec.width / spec.height;
  if (Math.abs(ratio - wanted) > 0.02) {
    warnings.push(`${path}: ${info.width}×${info.height} — expected a ${spec.width}×${spec.height} shape (ratio ${wanted.toFixed(2)}).`);
  }
  if (info.width < spec.width / 2) warnings.push(`${path}: only ${info.width}px wide — use at least ${spec.width / 2}px (ideally ${spec.width}).`);
  if (!info.hasAlpha) {
    warnings.push(`${path}: no transparency (a painted checkerboard counts too) — not used in the app until the background is removed.`);
  } else if (info.cornersClear === false) {
    warnings.push(`${path}: the corners aren't transparent — not used in the app until the background is removed.`);
  }
  if (info.bytes > ART_SPEC.maxBytes) {
    warnings.push(`${path}: ${Math.round(info.bytes / 1024)} KB — compress it below ${ART_SPEC.maxBytes / 1024} KB (squoosh.app, TinyPNG).`);
  }
}

/** The three image sets: which folder, which names, which frame size. */
export const ART_SETS = [
  { key: "moods", folder: MOOD_FOLDER, names: MOODS, spec: ART_SPEC.mascot },
  { key: "peek", folder: PEEK_FOLDER, names: PEEK_POSES, spec: ART_SPEC.peek },
  { key: "walk", folder: WALK_FOLDER, names: WALK_FRAMES, spec: ART_SPEC.walk },
] as const;

export function scanArt(): ArtScan {
  const scan: ArtScan = { moods: {}, peek: {}, walk: {}, warnings: [], missing: [] };
  if (!fs.existsSync(artDir)) fs.mkdirSync(artDir, { recursive: true });

  const folders = fs.readdirSync(artDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const folder of folders) {
    const set = ART_SETS.find((s) => s.folder === folder.name);
    if (!set) {
      scan.warnings.push(`assets/mascots/${folder.name}/: unknown folder — use one of ${ART_SETS.map((s) => s.folder).join(", ")}.`);
      continue;
    }
    const names: readonly string[] = set.names;
    for (const entry of fs.readdirSync(new URL(`${folder.name}/`, artDir))) {
      if (entry.startsWith(".")) continue;
      const path = `assets/mascots/${folder.name}/${entry}`;
      const name = entry.replace(/\.png$/i, "");
      if (!/\.png$/i.test(entry)) {
        scan.warnings.push(`${path}: not a PNG — export as .png with a transparent background.`);
        continue;
      }
      if (!names.includes(name)) {
        scan.warnings.push(`${path}: unknown name — use ${names.map((n) => `${n}.png`).join(", ")}.`);
        continue;
      }
      const info = readPng(new URL(path, root));
      if (!info) {
        scan.warnings.push(`${path}: not a valid PNG file.`);
        continue;
      }
      check(path, info, set.spec, scan.warnings);
      (scan[set.key] as Record<string, ArtFile>)[name] = { path, ...info };
    }
  }

  for (const set of ART_SETS) {
    for (const name of set.names) {
      if (!(scan[set.key] as Record<string, ArtFile>)[name]) scan.missing.push(`assets/mascots/${set.folder}/${name}.png`);
    }
  }
  return scan;
}

export function pngDataUri(file: ArtFile): string {
  return `data:image/png;base64,${fs.readFileSync(new URL(file.path, root)).toString("base64")}`;
}
