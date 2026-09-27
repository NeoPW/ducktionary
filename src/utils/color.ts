/** Small colour toolkit for theme derivation and the colour picker. Hex strings are `#RRGGBB`. */

export type Rgb = { r: number; g: number; b: number }; // 0–255
export type Hsl = { h: number; s: number; l: number }; // h 0–360, s/l 0–100

export function isHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

/** Accepts `#abc`, `abc`, `#aabbcc` or `aabbcc`; returns `#AABBCC` or null. */
export function normalizeHex(value: string): string | null {
  let hex = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.replace(/./g, (c) => c + c);
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : null;
}

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + ((((h % 360) + 360) % 360) / 30)) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex({ r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 });
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `t` = 0 → a, 1 → b. */
export function mix(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

/**
 * Nudges `color`'s lightness away from `against` until the pair reaches `ratio` (keeps hue and
 * saturation). Returns the closest it can get if the ratio is unreachable.
 */
export function ensureContrast(color: string, against: string, ratio: number): string {
  if (contrast(color, against) >= ratio) return color;
  const hsl = hexToHsl(color);
  const direction = luminance(against) > 0.5 ? -1 : 1; // darken on light, lighten on dark
  let best = color;
  for (let step = 1; step <= 50; step++) {
    const candidate = hslToHex({ ...hsl, l: hsl.l + direction * step * 2 });
    best = candidate;
    if (contrast(candidate, against) >= ratio) return candidate;
  }
  return best;
}

/** Black-ish or white text, whichever reads better on `background`. */
export function readableOn(background: string, dark = "#1A1A1A", light = "#FFFFFF"): string {
  return contrast(background, light) >= contrast(background, dark) ? light : dark;
}

/** OKLCH lightness (0–1) and chroma — the space the chart palette checks are defined in. */
export function oklch(hex: string): { l: number; c: number } {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const { r: R, g: G, b: B } = hexToRgb(hex);
  const [r, g, b] = [lin(R), lin(G), lin(B)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.sqrt(A * A + Bb * Bb) };
}
