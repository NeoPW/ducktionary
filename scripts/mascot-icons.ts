/**
 * Regenerates the app icons in assets/images/ from the drawn white goose reading
 * (assets/mascots/goose/reading.png).
 *
 *   npm run mascots:icons
 */
import fs from "node:fs";
import { createRequire } from "node:module";

import { pngDataUri, root, scanArt } from "./mascot-art.ts";

const { Resvg } = createRequire(import.meta.url)("@resvg/resvg-js") as {
  Resvg: new (svg: string, options: object) => { render(): { asPng(): Buffer } };
};

const reading = scanArt().art.moods.goose?.reading;
if (!reading) {
  console.error("No assets/mascots/goose/reading.png — draw and process it first (see docs/mascot-art-brief.md).");
  process.exit(1);
}
const goose = pngDataUri(reading);
const PAPER = "#FBF6EC";
const WHITE = `<filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>`;

/** The goose, centred, about `height` px tall (the processed art fills ~80% of its square). */
const placed = (size: number, height: number, silhouette = false) => {
  const side = height / 0.8;
  const at = (size - side) / 2;
  const filter = silhouette ? ' filter="url(#white)"' : "";
  return `${silhouette ? WHITE : ""}<image href="${goose}" x="${at}" y="${at}" width="${side}" height="${side}"${filter}/>`;
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
// Android adaptive icons crop to a circle of ~66% — keep the goose inside it.
write("android-icon-foreground.png", 512, svg(512, placed(512, 310)));
write("android-icon-background.png", 512, svg(512, "", PAPER));
write("splash-icon.png", 512, svg(512, placed(512, 470)));
write("favicon.png", 48, svg(48, placed(48, 44), PAPER));
// Themed icon: Android only uses the alpha channel, so a white silhouette is enough.
write("android-icon-monochrome.png", 432, svg(432, placed(432, 260, true)));
console.log(`Source: ${reading.path}`);
