/**
 * Regenerates the app icons in assets/images/ from the white goose reading — the drawn PNG in
 * assets/mascots/goose/reading.png when it exists, otherwise the vector drawing.
 *
 *   npm run mascots:icons
 */
import fs from "node:fs";
import { createRequire } from "node:module";

import { mascotShapes, toSvg, type Shape } from "../src/components/mascot/shapes.ts";
import { pngDataUri, scanArt } from "./mascot-art.ts";

const { Resvg } = createRequire(import.meta.url)("@resvg/resvg-js") as {
  Resvg: new (svg: string, options: object) => { render(): { asPng(): Buffer } };
};

const root = new URL("..", import.meta.url);
const drawn = scanArt().mascots.goose?.reading;
const PAPER = "#FBF6EC";
const props = { primary: "#E8833A", secondary: "#4F7C6B", muted: "#7A6F64", star: "#F4B400" };

const inner = (shapes: Shape[]) => toSvg(shapes).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
const art = inner(mascotShapes("goose", "reading", props, "icon"));
const mono = art
  .replace(/fill="(#[0-9A-Fa-f]{6}|url\([^)]*\))"/g, 'fill="#FFFFFF"')
  .replace(/stroke="(#[0-9A-Fa-f]{6}|url\([^)]*\))"/g, 'stroke="#FFFFFF"');
// The standing goose spans roughly x 12–118, y 6–117 of its 120 box.
const CENTRE = { x: 65, y: 61 };
const ART_HEIGHT = 111;

const WHITE = `<filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>`;

/** The goose, centred, about `height` px tall. Drawn art is assumed to fill ~80% of its square. */
const placed = (size: number, height: number, silhouette = false) => {
  if (drawn) {
    const side = height / 0.8;
    const at = (size - side) / 2;
    return `${silhouette ? WHITE : ""}<image href="${pngDataUri(drawn)}" x="${at}" y="${at}" width="${side}" height="${side}"${silhouette ? ' filter="url(#white)"' : ""}/>`;
  }
  const s = height / ART_HEIGHT;
  return `<g transform="translate(${size / 2 - CENTRE.x * s} ${size / 2 - CENTRE.y * s}) scale(${s})">${silhouette ? mono : art}</g>`;
};
const svg = (size: number, body: string, background?: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${
    background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""
  }${body}</svg>`;
const write = (file: string, size: number, markup: string) => {
  const target = new URL(`assets/images/${file}`, root);
  fs.writeFileSync(target, new Resvg(markup, { fitTo: { mode: "width", value: size }, font: { loadSystemFonts: true } }).render().asPng());
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
console.log(drawn ? `Source: ${drawn.path}` : "Source: vector goose (no assets/mascots/goose/reading.png yet)");
