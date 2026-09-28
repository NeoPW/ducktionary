import {
  contrast,
  ensureContrast,
  hexToHsl,
  hslToHex,
  mix,
  oklch,
  readableOn,
} from "@/utils/color";

import { chartPalette, palette, type Colors } from "./tokens";

export type ThemeMode = "light" | "dark";

/** The colours a user picks; everything else is derived from these. */
export type BaseColors = {
  background: string;
  surface: string;
  text: string;
  primary: string;
  accent: string;
  secondary: string;
};

export type ColorScheme = {
  id: string;
  name: string;
  builtIn: boolean;
  light: BaseColors;
  dark: BaseColors;
};

export type ChartColors = { categorical: readonly string[]; ordinal: readonly string[] };
export type ResolvedTheme = { colors: Colors; charts: ChartColors };

export const BASE_FIELDS: readonly { key: keyof BaseColors; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "Behind every screen" },
  { key: "surface", label: "Cards", hint: "Cards, fields and the tab bar" },
  { key: "text", label: "Text", hint: "Titles and body text" },
  { key: "primary", label: "Main colour", hint: "Buttons, links and charts" },
  { key: "accent", label: "Highlight", hint: "Selections, frames and highlights" },
  { key: "secondary", label: "Secondary", hint: "Category chips" },
];

export const DEFAULT_SCHEME_ID = "duck-pond";

export const PRESETS: readonly ColorScheme[] = [
  {
    id: DEFAULT_SCHEME_ID,
    name: "Duck pond",
    builtIn: true,
    light: {
      background: "#FBF6EC",
      surface: "#FFFDF8",
      text: "#2B2622",
      primary: "#E8833A",
      accent: "#F4C542",
      secondary: "#4F7C6B",
    },
    dark: {
      background: "#1E1A17",
      surface: "#2A2521",
      text: "#F3ECE2",
      primary: "#EB9459",
      accent: "#E6BE4F",
      secondary: "#7FA897",
    },
  },
  {
    id: "forest-cabin",
    name: "Forest cabin",
    builtIn: true,
    light: {
      background: "#F3F1E7",
      surface: "#FBFAF4",
      text: "#222A21",
      primary: "#3F7D4E",
      accent: "#D9A441",
      secondary: "#8A5A3B",
    },
    dark: {
      background: "#151B16",
      surface: "#1F2721",
      text: "#E5ECE2",
      primary: "#6FAF7D",
      accent: "#D9A441",
      secondary: "#B08462",
    },
  },
  {
    id: "blueberry",
    name: "Blueberry",
    builtIn: true,
    light: {
      background: "#F2F4FA",
      surface: "#FFFFFF",
      text: "#1E2433",
      primary: "#3B5BDB",
      accent: "#F2B84B",
      secondary: "#7B5EA7",
    },
    dark: {
      background: "#11151F",
      surface: "#1B202D",
      text: "#E4E8F2",
      primary: "#7C95F0",
      accent: "#E8B04A",
      secondary: "#A68CD3",
    },
  },
  {
    id: "rose-garden",
    name: "Rose garden",
    builtIn: true,
    light: {
      background: "#FBF2F2",
      surface: "#FFFAFA",
      text: "#2F2326",
      primary: "#C2566F",
      accent: "#E9A23B",
      secondary: "#4F7F6D",
    },
    dark: {
      background: "#1D1517",
      surface: "#2A1F22",
      text: "#F2E6E8",
      primary: "#E0849A",
      accent: "#E3A04A",
      secondary: "#85B3A1",
    },
  },
  {
    id: "paper-and-ink",
    name: "Paper & ink",
    builtIn: true,
    light: {
      background: "#FFFFFF",
      surface: "#F5F5F5",
      text: "#111111",
      primary: "#111111",
      accent: "#F4C542",
      secondary: "#4A4A4A",
    },
    dark: {
      background: "#000000",
      surface: "#141414",
      text: "#FFFFFF",
      primary: "#FFFFFF",
      accent: "#F4C542",
      secondary: "#C8C8C8",
    },
  },
];

/** Full token set for a scheme in one mode. Duck pond keeps its hand-tuned, validated values. */
export function resolveScheme(scheme: ColorScheme, mode: ThemeMode): ResolvedTheme {
  if (scheme.id === DEFAULT_SCHEME_ID) return { colors: palette[mode], charts: chartPalette[mode] };
  return deriveTheme(scheme[mode], mode);
}

/**
 * Fills in the tokens a user doesn't pick, holding the contrast rules the app relies on:
 * muted text ≥ 4.5:1 on background and cards, chart marks ≥ 3:1 on cards, danger text ≥ 4.5:1.
 */
export function deriveTheme(base: BaseColors, mode: ThemeMode): ResolvedTheme {
  const muted = ensureContrast(
    ensureContrast(mix(base.text, base.background, 0.45), base.background, 4.5),
    base.surface,
    4.5,
  );
  // Charts use the main colour when it can work as a data colour; a near-grey main colour
  // (e.g. black ink) falls back to the highlight, then the secondary, then Duck pond's orange.
  const chart =
    [base.primary, base.accent, base.secondary]
      .map((candidate) => fitChartColor(candidate, base.surface, mode))
      .find((fitted) => fitted != null) ?? ensureContrast(palette[mode].chart, base.surface, 3);

  return {
    colors: {
      ...base,
      muted,
      border: mix(base.surface, base.text, 0.12),
      onPrimary: readableOn(base.primary),
      star: mode === "light" ? "#F4B400" : "#E8B020",
      danger: ensureContrast(mode === "light" ? "#C4453A" : "#E0736A", base.surface, 4.5),
      chart,
    },
    charts: {
      // Named-slice hues stay the validated trio in every scheme — they encode identity, not theme.
      categorical: chartPalette[mode].categorical,
      ordinal: ordinalRamp(chart, base.surface, mode),
    },
  };
}

// Same thresholds as the dataviz palette validator (OKLCH).
const CHART_BAND: Record<ThemeMode, [number, number]> = { light: [0.43, 0.77], dark: [0.48, 0.67] };
const CHROMA_FLOOR = 0.1;

/**
 * Moves a colour's lightness (keeping hue/saturation) to the nearest value that works as a chart
 * mark: inside the mode's OKLCH lightness band and ≥ 3:1 against the cards. Null if it can't
 * (e.g. it reads grey at every usable lightness).
 */
export function fitChartColor(color: string, surface: string, mode: ThemeMode): string | null {
  const { h, s, l } = hexToHsl(color);
  const [lo, hi] = CHART_BAND[mode];
  let best: { hex: string; distance: number } | null = null;
  for (let lightness = 4; lightness <= 96; lightness += 1) {
    const hex = hslToHex({ h, s, l: lightness });
    const ok = oklch(hex);
    if (ok.l < lo || ok.l > hi || ok.c < CHROMA_FLOOR || contrast(hex, surface) < 3) continue;
    const distance = Math.abs(lightness - l);
    if (!best || distance < best.distance) best = { hex, distance };
  }
  return best?.hex ?? null;
}

/**
 * Five steps of the chart hue for ordered groups: light→dark on light cards, dim→bright on dark
 * cards. Steps are spaced evenly in OKLCH lightness (what the eye — and the validator — measures;
 * even HSL steps bunch up for yellows), and the step nearest the surface keeps ≥ 2:1.
 */
export function ordinalRamp(chart: string, surface: string, mode: ThemeMode): string[] {
  const { h, s } = hexToHsl(chart);
  const chartL = oklch(chart).l;
  // Every lightness this hue can take, with its perceptual lightness.
  const shades = Array.from({ length: 95 }, (_, i) => {
    const hex = hslToHex({ h, s, l: i + 3 });
    return { hex, l: oklch(hex).l, visible: contrast(hex, surface) >= 2 };
  });
  const usable = shades.filter((shade) => shade.visible);
  const MIN_SPAN = 0.3; // 5 steps × ≥0.06 apart, with margin

  // Near end (closest to the surface) as far out as visibility allows, capped around the chart colour.
  const nearTarget = mode === "light" ? chartL + 0.18 : chartL - 0.18;
  const near = usable.reduce((best, shade) => {
    const fits = mode === "light" ? shade.l <= nearTarget : shade.l >= nearTarget;
    if (!fits) return best;
    return !best || Math.abs(shade.l - nearTarget) < Math.abs(best.l - nearTarget) ? shade : best;
  }, null as (typeof shades)[number] | null) ?? usable[0] ?? shades[0];
  const farL = mode === "light" ? Math.max(0.12, near.l - MIN_SPAN) : Math.min(0.97, near.l + MIN_SPAN);

  return Array.from({ length: 5 }, (_, i) => {
    const target = near.l + ((farL - near.l) * i) / 4;
    return shades.reduce((best, shade) => (Math.abs(shade.l - target) < Math.abs(best.l - target) ? shade : best)).hex;
  });
}
