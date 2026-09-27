import { Stack } from "expo-router";

import { SettingsButton } from "@/components/settings-button";
import { useStackOptions } from "@/theme/use-stack-options";

export default function AddLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Add a book", headerRight: () => <SettingsButton /> }} />
      <Stack.Screen name="confirm" options={{ title: "Check the details" }} />
    </Stack>
  );
}
