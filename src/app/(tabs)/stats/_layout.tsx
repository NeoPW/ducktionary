import { Stack } from "expo-router";

import { useStackOptions } from "@/theme/use-stack-options";

export default function StatsLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Stats" }} />
    </Stack>
  );
}
