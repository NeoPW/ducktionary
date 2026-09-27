import { Lora_400Regular, Lora_600SemiBold, useFonts } from "@expo-google-fonts/lora";
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { ToastProvider } from "@/components/toast";
import { migrateDbIfNeeded } from "@/db/migrate";
import { useTheme } from "@/theme/use-theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const ready = fontsLoaded || fontError != null;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  // The root window shows through during screen transitions — paint it the app background
  // (and repaint on light/dark switch) so pushes, pops and tab jumps don't flash white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  if (!ready) return null;

  return (
    <SQLiteProvider databaseName="ducktionary.db" onInit={migrateDbIfNeeded}>
      <ToastProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        {/* Tabs live in (tabs); full-screen flows like the scanner sit above them. */}
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="scan"
            options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
          />
        </Stack>
      </ToastProvider>
    </SQLiteProvider>
  );
}
