/**
 * Reading, writing and cleaning images for the mascot scripts — no dependencies beyond resvg (for decoding) and
 * zlib (for encoding).
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import zlib from "node:zlib";

type Rendered = { pixels: Buffer; width: number; height: number };
const { Resvg } = createRequire(import.meta.url)("@resvg/resvg-js") as {
  Resvg: new (svg: string, options?: object) => { render(): Rendered };
};

/** Straight (not premultiplied) RGBA pixels. */
export type Img = { width: number; height: number; data: Uint8ClampedArray };

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
export function renderSvg(svg: string): Img {
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

export function decode(file: URL): Img {
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
export function encodePng({ width, height, data }: Img): Buffer {
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

/**
 * Removes see-through fuzz around a transparent drawing: always the near-invisible pixels, and — when a lot of the
 * image is semi-transparent (some image edits leave a grey haze) — everything that isn't nearly solid. A clean
 * drawing only has a thin anti-aliased edge (about 1%), so it is left alone.
 */
export function clearHaze(img: Img): void {
  const d = img.data;
  let partial = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 8 && d[i] < 200) partial++;
  const cutoff = partial / (img.width * img.height) > 0.05 ? 200 : 48;
  for (let i = 3; i < d.length; i += 4) if (d[i] < cutoff) d[i] = 0;
}

/** The drawing on plain white — what the image API gets to edit, so it can't invent a background. */
export function flattenOnWhite(img: Img): Img {
  const data = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < data.length; i += 4) {
    const a = img.data[i + 3] / 255;
    for (let c = 0; c < 3; c++) data[i + c] = img.data[i + c] * a + 255 * (1 - a);
    data[i + 3] = 255;
  }
  return { width: img.width, height: img.height, data };
}
