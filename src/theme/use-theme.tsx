import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

import { SETTING_KEYS } from "@/storage/keys";
import { readSetting, writeSetting } from "@/storage/settings";

import {
  DEFAULT_SCHEME_ID,
  PRESETS,
  resolveScheme,
  type BaseColors,
  type ChartColors,
  type ColorScheme,
  type ThemeMode,
} from "./schemes";
import type { Colors } from "./tokens";

export type ThemePreference = "system" | ThemeMode;

type StoredTheme = {
  preference: ThemePreference;
  schemeId: string;
  custom: ColorScheme[];
};

type ThemeContextValue = {
  colors: Colors;
  charts: ChartColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  /** Presets first, then the user's own schemes. */
  schemes: ColorScheme[];
  activeSchemeId: string;
  selectScheme: (id: string) => void;
  /** Copies an existing scheme into a new, editable one and returns its id. */
  duplicateScheme: (fromId: string) => string;
  renameScheme: (id: string, name: string) => void;
  setSchemeColor: (id: string, mode: ThemeMode, key: keyof BaseColors, value: string) => void;
  deleteScheme: (id: string) => void;
  /** Re-reads the saved theme (after a backup was restored). */
  reloadFromStorage: () => void;
};

const DEFAULTS: StoredTheme = { preference: "system", schemeId: DEFAULT_SCHEME_ID, custom: [] };

function loadTheme(): StoredTheme {
  const raw = readSetting(SETTING_KEYS.theme);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTheme>;
    return {
      preference: parsed.preference === "light" || parsed.preference === "dark" ? parsed.preference : "system",
      schemeId: typeof parsed.schemeId === "string" ? parsed.schemeId : DEFAULT_SCHEME_ID,
      custom: Array.isArray(parsed.custom) ? parsed.custom : [],
    };
  } catch {
    return DEFAULTS;
  }
}

const fallback = resolveScheme(PRESETS[0], "light");
const ThemeContext = createContext<ThemeContextValue>({
  ...fallback,
  isDark: false,
  preference: "system",
  setPreference: () => {},
  schemes: [...PRESETS],
  activeSchemeId: DEFAULT_SCHEME_ID,
  selectScheme: () => {},
  duplicateScheme: () => DEFAULT_SCHEME_ID,
  renameScheme: () => {},
  setSchemeColor: () => {},
  deleteScheme: () => {},
  reloadFromStorage: () => {},
});

/** Current colours plus the theme settings. */
export function useTheme(): ThemeContextValue {
  return use(ThemeContext);
}

/**
 * Holds the light/dark preference, the chosen colour scheme and user-made schemes. Loaded
 * synchronously from the on-device kv-store, so the first frame already has the right colours.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [state, setState] = useState<StoredTheme>(loadTheme);

  useEffect(() => {
    writeSetting(SETTING_KEYS.theme, JSON.stringify(state));
  }, [state]);

  // Tell the OS, so system dialogs, date pickers and keyboards follow a forced light/dark choice.
  useEffect(() => {
    Appearance.setColorScheme(state.preference === "system" ? "unspecified" : state.preference);
  }, [state.preference]);

  const isDark = state.preference === "system" ? system === "dark" : state.preference === "dark";
  const schemes = [...PRESETS, ...state.custom];
  const active = schemes.find((s) => s.id === state.schemeId) ?? PRESETS[0];
  const resolved = resolveScheme(active, isDark ? "dark" : "light");

  const updateCustom = (id: string, change: (scheme: ColorScheme) => ColorScheme) =>
    setState((s) => ({ ...s, custom: s.custom.map((c) => (c.id === id ? change(c) : c)) }));

  const value: ThemeContextValue = {
    ...resolved,
    isDark,
    preference: state.preference,
    setPreference: (preference) => setState((s) => ({ ...s, preference })),
    schemes,
    activeSchemeId: active.id,
    selectScheme: (id) => setState((s) => ({ ...s, schemeId: id })),
    duplicateScheme: (fromId) => {
      const source = schemes.find((s) => s.id === fromId) ?? PRESETS[0];
      const id = `custom-${Date.now().toString(36)}`;
      const copy: ColorScheme = {
        id,
        name: `${source.name} (mine)`,
        builtIn: false,
        light: { ...source.light },
        dark: { ...source.dark },
      };
      setState((s) => ({ ...s, custom: [...s.custom, copy], schemeId: id }));
      return id;
    },
    renameScheme: (id, name) => updateCustom(id, (c) => ({ ...c, name })),
    setSchemeColor: (id, mode, key, color) =>
      updateCustom(id, (c) => ({ ...c, [mode]: { ...c[mode], [key]: color } })),
    deleteScheme: (id) =>
      setState((s) => ({
        ...s,
        custom: s.custom.filter((c) => c.id !== id),
        schemeId: s.schemeId === id ? DEFAULT_SCHEME_ID : s.schemeId,
      })),
    reloadFromStorage: () => setState(loadTheme()),
  };

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
