import { NativeTabs } from "expo-router/unstable-native-tabs";

import { fonts } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

// Library is the middle tab and the one the app opens on. NativeTabs in SDK 57 ignore this without
// patches/expo-router+57.0.23.patch (expo/expo#49897) — drop the patch once the SDK includes the fix.
export const unstable_settings = { initialRouteName: "(library)" };

export default function TabsLayout() {
  const { colors } = useTheme();
  // Each tab hosts a stack; its container shows during stack animations, so it must not stay white.
  const contentStyle = { backgroundColor: colors.background };

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      tintColor={colors.primary}
      indicatorColor={colors.accent}
      iconColor={{ default: colors.muted, selected: colors.text }}
      labelStyle={{
        default: { fontFamily: fonts.sansMedium, color: colors.muted },
        selected: { fontFamily: fonts.sansBold, color: colors.text },
      }}
    >
      <NativeTabs.Trigger name="add" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Add</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.circle" md="add_circle" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(library)" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="books.vertical" md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="stats" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Stats</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
