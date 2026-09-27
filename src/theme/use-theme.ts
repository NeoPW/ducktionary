import { useColorScheme } from "react-native";

import { chartPalette, palette, type Colors } from "./tokens";

export function useTheme(): {
  colors: Colors;
  charts: (typeof chartPalette)["light" | "dark"];
  isDark: boolean;
} {
  const isDark = useColorScheme() === "dark";
  return {
    colors: isDark ? palette.dark : palette.light,
    charts: isDark ? chartPalette.dark : chartPalette.light,
    isDark,
  };
}
