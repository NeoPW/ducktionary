import { Stack } from "expo-router";

import { SettingsButton } from "@/components/settings-button";
import { useStackOptions } from "@/theme/use-stack-options";

export default function LibraryLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Library", headerRight: () => <SettingsButton /> }} />
      <Stack.Screen name="book/[id]/index" options={{ title: "" }} />
      <Stack.Screen name="book/[id]/edit" options={{ title: "Edit book" }} />
    </Stack>
  );
}
