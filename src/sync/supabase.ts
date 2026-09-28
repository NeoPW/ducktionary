/**
 * Supabase client for cloud backups — or `null` when this build has no Supabase config (e.g. a fork),
 * which hides the whole feature. Both values are public by design: the publishable key can only
 * reach what Row Level Security allows (see supabase/migrations/).
 *
 *   EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
 */
import "expo-sqlite/localStorage/install";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          // Session lives in expo-sqlite's localStorage, so users stay signed in across launches.
          storage: localStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

if (supabase) {
  // Refresh tokens only while the app is in the foreground (Expo's recommendation).
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
