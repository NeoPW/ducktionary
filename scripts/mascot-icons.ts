/**
 * Regenerates the app icons in assets/images/ from the drawn duckling reading
 * (assets/mascots/duckling/reading.png).
 *
 *   npm run mascots:icons
 */
import fs from "node:fs";
import { createRequire } from "node:module";

import { pngDataUri, root, scanArt } from "./mascot-art.ts";
import { decode } from "./mascot-image.ts";

const { Resvg } = createRequire(import.meta.url)("@resvg/resvg-js") as {
  Resvg: new (svg: string, options: object) => { render(): { asPng(): Buffer } };
};

const reading = scanArt().art.moods.duckling?.reading;
if (!reading) {
  console.error("No assets/mascots/duckling/reading.png — draw and process it first (see docs/mascot-art-brief.md).");
  process.exit(1);
}
const art = pngDataUri(reading);

// The drawn part of the image (mood art sits at the bottom of its square, the duckling smaller than the goose),
// so every icon centres what's actually visible.
const image = decode(new URL(reading.path, root));
const box = { left: image.width, top: image.height, right: 0, bottom: 0 };
for (let y = 0; y < image.height; y++) {
  for (let x = 0; x < image.width; x++) {
    if (image.data[(y * image.width + x) * 4 + 3] < 16) continue;
    box.left = Math.min(box.left, x);
    box.top = Math.min(box.top, y);
    box.right = Math.max(box.right, x + 1);
    box.bottom = Math.max(box.bottom, y + 1);
  }
}
const [boxWidth, boxHeight] = [box.right - box.left, box.bottom - box.top];
const PAPER = "#FBF6EC";
const WHITE = `<filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>`;

/** The drawn duckling, centred, fitting a `fit` px square. */
const placed = (size: number, fit: number, silhouette = false) => {
  const at = (size - fit) / 2;
  const filter = silhouette ? ' filter="url(#white)"' : "";
  return `${silhouette ? WHITE : ""}<svg x="${at}" y="${at}" width="${fit}" height="${fit}" viewBox="${box.left} ${box.top} ${boxWidth} ${boxHeight}" preserveAspectRatio="xMidYMid meet">
    <image href="${art}" width="${image.width}" height="${image.height}"${filter}/></svg>`;
};
const svg = (size: number, body: string, background?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""
  }${body}</svg>`;
const write = (file: string, size: number, markup: string) => {
  const target = new URL(`assets/images/${file}`, root);
  fs.writeFileSync(target, new Resvg(markup, { fitTo: { mode: "width", value: size } }).render().asPng());
  console.log(`Wrote assets/images/${file}`);
};

write("icon.png", 1024, svg(1024, placed(1024, 800), PAPER));
// Android adaptive icons crop to a circle of ~66% — keep the duckling inside it.
write("android-icon-foreground.png", 512, svg(512, placed(512, 310)));
write("android-icon-background.png", 512, svg(512, "", PAPER));
write("splash-icon.png", 512, svg(512, placed(512, 470)));
write("favicon.png", 48, svg(48, placed(48, 44), PAPER));
// Themed icon: Android only uses the alpha channel, so a white silhouette is enough.
write("android-icon-monochrome.png", 432, svg(432, placed(432, 260, true)));
console.log(`Source: ${reading.path}`);
