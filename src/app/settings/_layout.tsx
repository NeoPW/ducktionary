import { Stack } from "expo-router";

import { useStackOptions } from "@/theme/use-stack-options";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="scheme/[id]" options={{ title: "Edit colours" }} />
    </Stack>
  );
}
