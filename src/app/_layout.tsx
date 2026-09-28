import { Lora_400Regular, Lora_600SemiBold, useFonts } from "@expo-google-fonts/lora";
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SQLiteProvider } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { ConfirmProvider } from "@/components/confirm-dialog";
import { GooseProvider } from "@/components/goose/goose-visits";
import { ToastProvider } from "@/components/toast";
import { migrateDbIfNeeded } from "@/db/migrate";
import { BackupProvider } from "@/sync/backup-provider";
import { ThemeProvider, useTheme } from "@/theme/use-theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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

  if (!ready) return null;

  return (
    <ThemeProvider>
      <SQLiteProvider databaseName="ducktionary.db" onInit={migrateDbIfNeeded}>
        <ToastProvider>
          <ConfirmProvider>
            <AppShell />
          </ConfirmProvider>
        </ToastProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}

/** Everything that needs the theme lives below the ThemeProvider. */
function AppShell() {
  const { colors, isDark } = useTheme();

  // The root window shows through during screen transitions — paint it the app background
  // (and repaint on theme changes) so pushes, pops and tab jumps don't flash white.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      {/* The goose occasionally pokes its head in over whatever screen is showing. */}
      <GooseProvider>
        {/* Signs in to Supabase (when configured) and keeps the cloud backup up to date. */}
        <BackupProvider>
          {/* Tabs live in (tabs); full-screen flows like the scanner and settings sit above them. */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="scan"
              options={{ presentation: "fullScreenModal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen name="settings" />
          </Stack>
        </BackupProvider>
      </GooseProvider>
    </>
  );
}
