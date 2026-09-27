import { Stack } from "expo-router";

import { useStackOptions } from "@/theme/use-stack-options";

export default function AddLayout() {
  return (
    <Stack screenOptions={useStackOptions()}>
      <Stack.Screen name="index" options={{ title: "Add a book" }} />
      <Stack.Screen name="confirm" options={{ title: "Check the details" }} />
    </Stack>
  );
}
