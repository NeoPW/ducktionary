import type { ComponentProps } from "react";
import type { Stack } from "expo-router";

import { fonts } from "./tokens";
import { useTheme } from "./use-theme";

type StackScreenOptions = NonNullable<ComponentProps<typeof Stack>["screenOptions"]>;

/** Shared header styling for the per-tab stacks. */
export function useStackOptions(): StackScreenOptions {
  const { colors } = useTheme();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.primary,
    headerTitleStyle: { fontFamily: fonts.serif, color: colors.text },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
  };
}
