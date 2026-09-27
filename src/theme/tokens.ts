export const palette = {
  light: {
    background: "#FBF6EC",
    surface: "#FFFDF8",
    text: "#2B2622",
    muted: "#7A6F64",
    border: "#E8DFD0",
    primary: "#E8833A",
    // Ink, not paper: paper-white on this orange is only 2.7:1.
    onPrimary: "#2B2622",
    accent: "#F4C542",
    secondary: "#4F7C6B",
    star: "#F4B400",
    danger: "#C4453A",
    /** Bar colour for charts — duck orange stepped to clear 3:1 against `surface` (validated). */
    chart: "#D9722C",
  },
  dark: {
    background: "#1E1A17",
    surface: "#2A2521",
    text: "#F3ECE2",
    muted: "#A89B8C",
    border: "#3A332D",
    primary: "#EB9459",
    onPrimary: "#1E1A17",
    accent: "#E6BE4F",
    secondary: "#7FA897",
    star: "#E8B020",
    danger: "#E0736A",
    chart: "#C8733A",
  },
} as const;

/**
 * Chart colours, validated with the dataviz palette checker against `surface` in each mode.
 * - categorical: distinct in every pairing (incl. colour-blind simulation) — used for pie slices
 *   of named things; anything beyond these three folds into a grey "Other".
 * - ordinal: one hue stepping light→dark (dark mode: dim→bright) for ordered groups like
 *   short → long; the first step still clears 2:1 against the surface.
 */
export const chartPalette = {
  light: {
    categorical: ["#D9722C", "#199E70", "#2A78D6"],
    ordinal: ["#EFA46A", "#E0843F", "#C8651F", "#A04E15", "#77380C"],
  },
  dark: {
    categorical: ["#C8733A", "#199E70", "#3987E5"],
    ordinal: ["#8A4A22", "#AE5F2C", "#CF7B3E", "#E59A5F", "#F2BE8E"],
  },
} as const;

export type ColorName = keyof (typeof palette)["light"];
export type Colors = Record<ColorName, string>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  cover: 8,
  card: 14,
  pill: 999,
} as const;

export const fonts = {
  serif: "Lora_600SemiBold",
  serifRegular: "Lora_400Regular",
  sans: "Nunito_400Regular",
  sansMedium: "Nunito_600SemiBold",
  sansBold: "Nunito_700Bold",
} as const;

export const typography = {
  display: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 36 },
  title: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 30 },
  heading: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;
