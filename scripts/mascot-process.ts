/**
 * Turns raw generated mascot images into app-ready ones.
 *
 *   docs/mascot-art/raw/goose/<mood>.png           →  assets/mascots/goose/<mood>.png
 *   docs/mascot-art/raw/goose-peek/<pose>.png      →  assets/mascots/goose-peek/<pose>.png
 *   docs/mascot-art/raw/goose-walk/<frame>.png     →  assets/mascots/goose-walk/<frame>.png
 *
 * For each image: remove the background (solid colour or a painted checkerboard), redraw an even
 * white sticker edge, crop, then fit it into the standard frame and save a compact PNG.
 * Then run `npm run mascots` (the npm script does this for you).
 *
 *   npm run mascots:process
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import zlib from "node:zlib";

import { ART_SPEC, MOOD_FOLDER, MOODS, PEEK_FOLDER, PEEK_POSES, WALK_FOLDER, WALK_FRAMES } from "../src/components/mascot/art.ts";
import { artDir, root } from "./mascot-art.ts";

type Rendered = { pixels: Buffer; width: number; height: number };
const { Resvg } = createRequire(import.meta.url)("@resvg/resvg-js") as {
  Resvg: new (svg: string, options?: object) => { render(): Rendered };
};

const rawDir = new URL("docs/mascot-art/raw/", root);

/** Straight (not premultiplied) RGBA pixels. */
type Img = { width: number; height: number; data: Uint8ClampedArray };

// ─── Reading and writing images ─────────────────────────────────────────────

function sniff(buf: Buffer): { mime: string; width: number; height: number } | null {
  if (buf.subarray(1, 4).toString("ascii") === "PNG") {
    return { mime: "image/png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 9; ) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { mime: "image/jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  }
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") {
    const chunk = buf.subarray(12, 16).toString("ascii");
    if (chunk === "VP8 ") return { mime: "image/webp", width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = buf.readUInt32LE(21);
      return { mime: "image/webp", width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { mime: "image/webp", width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  }
  return null;
}

/** Renders an SVG and returns straight-alpha pixels (resvg hands them back premultiplied). */
function renderSvg(svg: string): Img {
  const out = new Resvg(svg).render();
  const data = new Uint8ClampedArray(out.pixels);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a > 0 && a < 255) {
      data[i] = (data[i] * 255) / a;
      data[i + 1] = (data[i + 1] * 255) / a;
      data[i + 2] = (data[i + 2] * 255) / a;
    }
  }
  return { width: out.width, height: out.height, data };
}

function decode(file: URL): Img {
  const buf = fs.readFileSync(file);
  const info = sniff(buf);
  if (!info) throw new Error("unsupported image — use PNG, JPEG or WebP");
  const { width, height, mime } = info;
  return renderSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="data:${mime};base64,${buf.toString("base64")}" width="${width}" height="${height}"/></svg>`,
  );
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** RGBA PNG with per-row adaptive filtering and maximum deflate — smaller than a plain encode. */
function encodePng({ width, height, data }: Img): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const candidate = Buffer.alloc(stride);
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = Buffer.from(data.buffer, data.byteOffset + y * stride, stride);
    let best = 0;
    let bestScore = Infinity;
    let bestRow = row;
    for (let filter = 0; filter <= 4; filter++) {
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const left = i >= 4 ? row[i - 4] : 0;
        const up = previous[i];
        const upLeft = i >= 4 ? previous[i - 4] : 0;
        let predicted = 0;
        if (filter === 1) predicted = left;
        else if (filter === 2) predicted = up;
        else if (filter === 3) predicted = (left + up) >> 1;
        else if (filter === 4) {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        }
        const value = (row[i] - predicted) & 255;
        candidate[i] = value;
        score += value < 128 ? value : 256 - value;
      }
      if (score < bestScore) {
        bestScore = score;
        best = filter;
        bestRow = Buffer.from(candidate);
      }
    }
    raw[y * (stride + 1)] = best;
    bestRow.copy(raw, y * (stride + 1) + 1);
    previous = Buffer.from(row);
  }
  const chunk = (type: string, body: Buffer) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length, 0);
    head.write(type, 4, "ascii");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── Background removal ─────────────────────────────────────────────────────

const neutral = (d: Uint8ClampedArray, i: number) =>
  Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) <= 14;

type Rgb = [number, number, number];

/**
 * Reads the square size and offset of a painted checkerboard from the top row and left column.
 * `matches(patch)` says how well a set of pixels follows that grid (0.5 = random, 1 = perfect).
 */
function checkerGrid(img: Img, a: Rgb, b: Rgb) {
  const { width: w, height: h, data: d } = img;
  const tone = (p: number) => {
    const i = p * 4;
    const da = Math.abs(d[i] - a[0]) + Math.abs(d[i + 1] - a[1]) + Math.abs(d[i + 2] - a[2]);
    const db = Math.abs(d[i] - b[0]) + Math.abs(d[i + 1] - b[1]) + Math.abs(d[i + 2] - b[2]);
    if (Math.min(da, db) > 40) return -1;
    return da <= db ? 0 : 1;
  };
  const runs = (pixels: number[]) => {
    const changes: number[] = [];
    let last = -1;
    pixels.forEach((p, k) => {
      const t = tone(p);
      if (t === -1) return;
      if (last !== -1 && t !== last) changes.push(k);
      last = t;
    });
    return changes;
  };
  const top = runs(Array.from({ length: w }, (_, x) => x));
  const left = runs(Array.from({ length: h }, (_, y) => y * w));
  const gaps = [...top, ...left].slice(1).map((v, k, all) => (k === 0 ? 0 : v - all[k - 1])).filter((g) => g >= 3 && g <= 128);
  if (top.length < 3 || left.length < 3 || gaps.length < 4) return null;
  const size = gaps.sort((x, y) => x - y)[Math.floor(gaps.length / 2)];
  const ox = top[0] % size;
  const oy = left[0] % size;
  return {
    matches(patch: number[]) {
      let agree = 0;
      let counted = 0;
      for (const p of patch) {
        const t = tone(p);
        if (t === -1) continue;
        const parity = (Math.floor((p % w - ox) / size) + Math.floor((Math.floor(p / w) - oy) / size)) & 1;
        counted++;
        if (t === parity) agree++;
      }
      return counted < patch.length * 0.8 ? 0 : Math.max(agree, counted - agree) / counted;
    },
  };
}

/**
 * Finds the background from the image border (a solid colour, or the two tones of a painted
 * checkerboard) and flood-fills it away from the outside. Only neutral greys/whites count as
 * background, so cream feathers and the outline stop the fill. The old white sticker edge goes too;
 * `addStickerEdge` redraws an even one.
 */
function removeBackground(img: Img): { removed: number; colours: string[] } {
  const { width: w, height: h, data: d } = img;
  const edge: number[] = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);

  const transparentEdge = edge.filter((p) => d[p * 4 + 3] < 32).length / edge.length;
  const counts = new Map<number, number>();
  for (const p of edge) {
    const i = p * 4;
    if (d[i + 3] < 32 || !neutral(d, i)) continue;
    const key = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  const colours: Rgb[] = [];
  let covered = 0;
  for (const [key, count] of ranked) {
    if (colours.length === 4 || covered / edge.length > 0.9) break;
    colours.push([((key >> 10) << 3) + 4, (((key >> 5) & 31) << 3) + 4, ((key & 31) << 3) + 4]);
    covered += count;
  }
  if (transparentEdge < 0.6 && colours.length === 0) return { removed: 0, colours: [] };

  const isBackground = (p: number) => {
    const i = p * 4;
    if (d[i + 3] < 32) return true;
    if (!neutral(d, i)) return false;
    return colours.some(([r, g, b]) => Math.abs(d[i] - r) <= 18 && Math.abs(d[i + 1] - g) <= 18 && Math.abs(d[i + 2] - b) <= 18);
  };

  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  for (const p of edge) {
    if (!seen[p] && isBackground(p)) {
      seen[p] = 1;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q >= 0 && q < w * h && !seen[q] && isBackground(q)) {
        seen[q] = 1;
        queue[tail++] = q;
      }
    }
  }

  // A painted checkerboard can also sit in fully enclosed gaps (e.g. between a wing and the body).
  // Measure the checkerboard's grid from the image border, then clear an enclosed patch only if its
  // tones actually follow that grid — soft whitish shading inside the drawing never does.
  const grid = colours.length >= 2 ? checkerGrid(img, colours[0], colours[1]) : null;
  if (grid) {
    for (let start = 0; start < w * h; start++) {
      if (seen[start] || !isBackground(start)) continue;
      const patch: number[] = [start];
      seen[start] = 2;
      for (let k = 0; k < patch.length; k++) {
        const p = patch[k];
        const x = p % w;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
          if (q >= 0 && q < w * h && !seen[q] && isBackground(q)) {
            seen[q] = 2;
            patch.push(q);
          }
        }
      }
      if (patch.length >= 400 && grid.matches(patch) >= 0.85) for (const p of patch) seen[p] = 1;
    }
  }

  let removed = 0;
  for (let p = 0; p < w * h; p++) {
    if (seen[p] === 1) {
      d[p * 4 + 3] = 0;
      removed++;
    }
  }
  const hex = (c: number[]) => `#${c.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  return { removed: removed / (w * h), colours: transparentEdge >= 0.6 ? ["transparent"] : colours.map(hex) };
}

/** Clears stray specks: anything not connected to a large part of the drawing. */
function dropSpecks(img: Img) {
  const { width: w, height: h, data: d } = img;
  const label = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (label[start] !== -1 || d[start * 4 + 3] < 32) continue;
    const id = sizes.length;
    const stack = [start];
    label[start] = id;
    let size = 0;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const q = p + dy * w + dx;
          if ((dx === -1 && x === 0) || (dx === 1 && x === w - 1) || q < 0 || q >= w * h) continue;
          if (label[q] === -1 && d[q * 4 + 3] >= 32) {
            label[q] = id;
            stack.push(q);
          }
        }
      }
    }
    sizes.push(size);
  }
  const largest = Math.max(0, ...sizes);
  for (let p = 0; p < w * h; p++) {
    if (label[p] >= 0 && sizes[label[p]] < largest * 0.01) d[p * 4 + 3] = 0;
  }
}

/** Paints an even white sticker edge `radius` px wide under the drawing (anti-aliased). */
function addStickerEdge(img: Img, radius: number) {
  const { width: w, height: h, data: d } = img;
  // Chamfer (3-4) distance to the drawing, in 1/3 px units.
  const dist = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) dist[p] = d[p * 4 + 3] >= 128 ? 0 : 1e9;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (x > 0) dist[p] = Math.min(dist[p], dist[p - 1] + 3);
      if (y > 0) {
        dist[p] = Math.min(dist[p], dist[p - w] + 3);
        if (x > 0) dist[p] = Math.min(dist[p], dist[p - w - 1] + 4);
        if (x < w - 1) dist[p] = Math.min(dist[p], dist[p - w + 1] + 4);
      }
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      if (x < w - 1) dist[p] = Math.min(dist[p], dist[p + 1] + 3);
      if (y < h - 1) {
        dist[p] = Math.min(dist[p], dist[p + w] + 3);
        if (x < w - 1) dist[p] = Math.min(dist[p], dist[p + w + 1] + 4);
        if (x > 0) dist[p] = Math.min(dist[p], dist[p + w - 1] + 4);
      }
    }
  }
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const edge = Math.min(1, Math.max(0, radius + 0.5 - dist[p] / 3));
    if (edge === 0) continue;
    const a = d[i + 3] / 255;
    const outA = a + edge * (1 - a);
    for (let c = 0; c < 3; c++) d[i + c] = (d[i + c] * a + 255 * edge * (1 - a)) / outA;
    d[i + 3] = outA * 255;
  }
}

function bounds({ width: w, height: h, data: d }: Img) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

// ─── Framing ────────────────────────────────────────────────────────────────

type Kind = "mascot" | "peek" | "walk";
type Box = { x: number; y: number; width: number; height: number };

/** Clears the faint haze some generators leave around a transparent drawing, so it can't widen the crop. */
function clearHaze({ data: d }: Img) {
  for (let i = 3; i < d.length; i += 4) if (d[i] < 48) d[i] = 0;
}

function union(boxes: Box[]): Box {
  const x0 = Math.min(...boxes.map((b) => b.x));
  const y0 = Math.min(...boxes.map((b) => b.y));
  const x1 = Math.max(...boxes.map((b) => b.x + b.width));
  const y1 = Math.max(...boxes.map((b) => b.y + b.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/**
 * Crops `box` out of the drawing and fits it into the standard frame:
 * moods — 1024², ~80% of the height, bottom on the ground line at 93%, centred;
 * peek — the upper body popping up: bottom flush with the frame's bottom edge, centred;
 * walk — full body mid-step: feet on the ground line at 96%, centred.
 * Peek poses and walk frames are cropped with one shared box per set, so swapping them never jumps.
 */
function frame(img: Img, box: Box, kind: Kind): Img {
  const crop: Img = { width: box.width, height: box.height, data: new Uint8ClampedArray(box.width * box.height * 4) };
  for (let y = 0; y < box.height; y++) {
    const from = ((box.y + y) * img.width + box.x) * 4;
    crop.data.set(img.data.subarray(from, from + box.width * 4), y * box.width * 4);
  }
  const { width: W, height: H } = ART_SPEC[kind];
  const fit = { mascot: [0.8, 0.92, 0.93], peek: [0.97, 0.96, 1], walk: [0.86, 0.94, 0.96] }[kind];
  const scale = Math.min((fit[0] * H) / box.height, (fit[1] * W) / box.width);
  const x = (W - box.width * scale) / 2;
  const y = fit[2] * H - box.height * scale;
  const href = `data:image/png;base64,${encodePng(crop).toString("base64")}`;
  return renderSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><image href="${href}" x="${x}" y="${y}" width="${box.width * scale}" height="${box.height * scale}"/></svg>`,
  );
}

// ─── Run ────────────────────────────────────────────────────────────────────

const FOLDERS: Record<string, { kind: Kind; names: readonly string[] }> = {
  [MOOD_FOLDER]: { kind: "mascot", names: MOODS },
  [PEEK_FOLDER]: { kind: "peek", names: PEEK_POSES },
  [WALK_FOLDER]: { kind: "walk", names: WALK_FRAMES },
};

type Job = { raw: URL; out: URL; label: string; kind: Kind; folder: string };
const jobs: Job[] = [];
if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
for (const folder of fs.readdirSync(rawDir, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const spec = FOLDERS[folder.name];
  if (!spec) {
    console.log(`! docs/mascot-art/raw/${folder.name}/: unknown folder — skipped`);
    continue;
  }
  for (const entry of fs.readdirSync(new URL(`${folder.name}/`, rawDir))) {
    if (entry.startsWith(".")) continue;
    const name = entry.replace(/\.(png|jpe?g|webp)$/i, "");
    if (name === entry || !spec.names.includes(name)) {
      console.log(`! docs/mascot-art/raw/${folder.name}/${entry}: unknown name — use ${spec.names.join(", ")} (.png, .jpg or .webp)`);
      continue;
    }
    jobs.push({
      raw: new URL(`${folder.name}/${entry}`, rawDir),
      out: new URL(`${folder.name}/${name}.png`, artDir),
      label: `${folder.name}/${name}`,
      kind: spec.kind,
      folder: folder.name,
    });
  }
}

// 1. Cut out every image.
type Prepared = { job: Job; img: Img; box: Box; background: string };
const prepared: Prepared[] = [];
if (jobs.length === 0) console.log("No raw images in docs/mascot-art/raw/ yet.");
for (const job of jobs) {
  try {
    const img = decode(job.raw);
    const { removed, colours } = removeBackground(img);
    // Only the animated sets: re-running must not change the approved moods.
    if (job.kind !== "mascot") clearHaze(img);
    dropSpecks(img);
    // Sticker edge ≈ 1.4% of the drawing's size, like the references.
    const drawn = bounds(img);
    if (!drawn) throw new Error("nothing left after removing the background");
    addStickerEdge(img, Math.max(6, Math.round(0.014 * Math.max(drawn.width, drawn.height))));
    const box = bounds(img)!;
    const background = colours.length ? `removed ${Math.round(removed * 100)}% background (${colours.join(", ")})` : "no background found";
    prepared.push({ job, img, box, background });
  } catch (error) {
    console.log(`✗ ${job.label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 2. Sets that animate together share one crop box (they come from edits of one image, so same canvas size).
const sharedBox = new Map<string, Box>();
for (const folder of new Set(prepared.filter((p) => p.job.kind !== "mascot").map((p) => p.job.folder))) {
  const members = prepared.filter((p) => p.job.folder === folder);
  const sizes = new Set(members.map((p) => `${p.img.width}x${p.img.height}`));
  if (sizes.size > 1) console.log(`! ${folder}: images have different sizes (${[...sizes].join(", ")}) — they may jump when swapped`);
  else sharedBox.set(folder, union(members.map((p) => p.box)));
}

// 3. Frame and save.
for (const { job, img, box, background } of prepared) {
  const png = encodePng(frame(img, sharedBox.get(job.folder) ?? box, job.kind));
  fs.mkdirSync(new URL(".", job.out), { recursive: true });
  fs.writeFileSync(job.out, png);
  const { width: W, height: H } = ART_SPEC[job.kind];
  const weight = `${Math.round(png.length / 1024)} KB${png.length > ART_SPEC.maxBytes ? ` — larger than the ${ART_SPEC.maxBytes / 1024} KB target` : ""}`;
  console.log(`✓ ${job.label}: ${background} → ${W}×${H}, ${weight}`);
}
