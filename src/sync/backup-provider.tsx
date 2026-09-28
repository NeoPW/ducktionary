import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useSQLiteContext } from "expo-sqlite";
import Storage from "expo-sqlite/kv-store";
import { createContext, use, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { useConfirm } from "@/components/confirm-dialog";
import { useGoose } from "@/components/goose/goose-visits";
import { useToast } from "@/components/toast";
import { onLibraryChanged } from "@/db/events";
import {
  buildSnapshot,
  contentHash,
  restoreSnapshot,
  SnapshotError,
  validateSnapshot,
  type SettingsStore,
  type Snapshot,
} from "@/sync/snapshot";
import { supabase } from "@/sync/supabase";
import { useTheme } from "@/theme/use-theme";
import { toIsoDate } from "@/utils/dates";

export type BackupInfo = { id: number; createdAt: string; bookCount: number; appVersion: string };

/** "shrunk": the library is much smaller than the newest cloud backup — confirm before uploading. */
export type BackupResult =
  | { kind: "uploaded" }
  | { kind: "unchanged" }
  | { kind: "shrunk"; books: number; backedUp: number };

type BackupContextValue = {
  /** False when this build has no Supabase config — hide everything account-related. */
  configured: boolean;
  email: string | null;
  busy: boolean;
  lastBackupAt: string | null;
  /** Why the last automatic backup didn't happen, in plain words (null when all is well). */
  problem: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  backUpNow: (options?: { force?: boolean }) => Promise<BackupResult>;
  restoreBackup: (id: number) => Promise<number>;
  /** Writes the backup file and opens the share sheet; returns the number of books in it. */
  exportFile: () => Promise<number>;
  /** Picks a backup file and returns it checked, ready for `restoreFromFile`; null if cancelled. */
  pickFile: () => Promise<Snapshot | null>;
  restoreFromFile: (snapshot: Snapshot) => Promise<number>;
};

const AUTO_DELAY_MS = 60_000;
const RETRY_MS = 5 * 60_000;
/** Automatic backups never replace a much bigger library (e.g. after "Clear all data"). */
const SHRINK_LIMIT = 0.5;

const settingsStore: SettingsStore = {
  get: (key) => {
    try {
      return Storage.getItemSync(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      Storage.setItemSync(key, value);
    } catch {
      // Not critical.
    }
  },
};

const appVersion = Constants.expoConfig?.version ?? "1.0.0";

/** The signed-in user's cloud backups, newest first (RLS returns only their own). */
export async function listCloudBackups(): Promise<BackupInfo[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("backups")
    .select("id, created_at, book_count, app_version")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    bookCount: row.book_count,
    appVersion: row.app_version,
  }));
}

const BackupContext = createContext<BackupContextValue | null>(null);

export function useBackup(): BackupContextValue {
  const value = use(BackupContext);
  if (!value) throw new Error("useBackup must be used inside BackupProvider");
  return value;
}

/** Turns Supabase/network errors into sentences a person can act on. */
export function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof SnapshotError) return message;
  if (/invalid login credentials/i.test(message)) return "Wrong email or password.";
  if (/network request failed|failed to fetch|fetch failed|timeout/i.test(message)) {
    return "Couldn't reach the backup server. Check your connection — if this keeps happening, the Supabase project may be paused.";
  }
  if (/password should be at least|weak password/i.test(message)) return "That password is too short or too common.";
  if (/same.*password|different from the old/i.test(message)) return "Choose a password different from your current one.";
  if (/jwt|session|not authenticated|refresh token/i.test(message)) return "Your sign-in expired. Please sign in again.";
  return message || "Something went wrong.";
}

export function BackupProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const goose = useGoose();
  const confirm = useConfirm();
  const toast = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  /** Messages and backup times are remembered per account, so switching accounts never mixes them. */
  const [problems, setProblems] = useState<Record<string, string | null>>({});
  const [backedUpAt, setBackedUpAt] = useState<Record<string, string>>({});
  /** When the next automatic backup is due (ms timestamp), or null when nothing is pending. */
  const [dueAt, setDueAt] = useState<number | null>(null);
  const offeredRestoreFor = useRef<string | null>(null);

  const userId = session?.user.id ?? null;
  const key = (name: string) => `backup.${name}.${userId}`;
  const setProblem = (message: string | null) => userId && setProblems((all) => ({ ...all, [userId]: message }));

  // ─── Session ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  // ─── Cloud helpers ────────────────────────────────────────────────────
  const newestBackup = async (): Promise<BackupInfo | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("backups")
      .select("id, created_at, book_count, app_version")
      .order("created_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const row = data?.[0];
    return row ? { id: row.id, createdAt: row.created_at, bookCount: row.book_count, appVersion: row.app_version } : null;
  };

  const backUp = async (force: boolean): Promise<BackupResult> => {
    if (!supabase || !userId) throw new Error("Sign in to back up.");
    const snapshot = await buildSnapshot(db, { appVersion, settings: settingsStore });
    const hash = contentHash(snapshot);
    if (!force && settingsStore.get(key("hash")) === hash) return { kind: "unchanged" };

    const newest = await newestBackup();
    if (!force && newest && snapshot.books.length < newest.bookCount * SHRINK_LIMIT) {
      return { kind: "shrunk", books: snapshot.books.length, backedUp: newest.bookCount };
    }
    const { error } = await supabase.from("backups").insert({
      app_version: appVersion,
      schema_version: snapshot.schemaVersion,
      book_count: snapshot.books.length,
      data: snapshot,
    });
    if (error) throw error;
    const at = new Date().toISOString();
    settingsStore.set(key("hash"), hash);
    settingsStore.set(key("at"), at);
    setBackedUpAt((all) => ({ ...all, [userId]: at }));
    return { kind: "uploaded" };
  };

  // ─── Restore ──────────────────────────────────────────────────────────
  const applySnapshot = async (snapshot: Snapshot) => {
    const n = await restoreSnapshot(db, snapshot, settingsStore);
    theme.reloadFromStorage();
    goose.reloadFromStorage();
    // The restored library is what the cloud already has; don't upload it again.
    if (userId) settingsStore.set(key("hash"), contentHash(snapshot));
    setDueAt(null);
    return n;
  };

  const restoreCloud = async (id: number) => {
    if (!supabase) throw new Error("Backups aren't set up in this version.");
    const { data, error } = await supabase.from("backups").select("data").eq("id", id).single();
    if (error) throw error;
    return applySnapshot(validateSnapshot(data.data));
  };

  // ─── Automatic backups ────────────────────────────────────────────────
  const runAutomatic = useEffectEvent(async () => {
    if (!userId) return;
    setDueAt(null);
    try {
      const result = await backUp(false);
      setProblem(
        result.kind === "shrunk"
          ? `Not backed up automatically: your library has ${result.books} books, your last backup ${result.backedUp}. Use "Back up now" if that's intended.`
          : null,
      );
    } catch (error) {
      setProblem(friendlyError(error));
      setDueAt(Date.now() + RETRY_MS);
    }
  });

  // Library changes push the next backup a minute out; leaving the app saves anything pending.
  useEffect(() => {
    if (!userId) return;
    const off = onLibraryChanged(() => setDueAt(Date.now() + AUTO_DELAY_MS));
    return off;
  }, [userId]);

  useEffect(() => {
    if (!userId || dueAt == null) return;
    const timer = setTimeout(() => runAutomatic(), Math.max(0, dueAt - Date.now()));
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") runAutomatic();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [userId, dueAt]);

  // After signing in (or launching signed in): offer a restore on a new phone, otherwise make sure the
  // current library is backed up.
  const onSignedIn = useEffectEvent(async () => {
    if (!userId) return;
    try {
      const newest = await newestBackup();
      if (newest && !settingsStore.get(key("at"))) setBackedUpAt((all) => ({ ...all, [userId]: newest.createdAt }));
      const count = await db.getFirstAsync<{ n: number }>("SELECT count(*) AS n FROM books");
      if (newest && (count?.n ?? 0) === 0 && offeredRestoreFor.current !== userId) {
        offeredRestoreFor.current = userId;
        const ok = await confirm({
          title: "Restore your library?",
          message: `Your backup from ${new Date(newest.createdAt).toLocaleDateString()} has ${newest.bookCount} books. Restore them to this phone?`,
          confirmText: "Restore",
          cancelText: "Not now",
          mood: "celebrating",
        });
        if (ok) {
          const n = await restoreCloud(newest.id);
          toast(`Honk! ${n} books are back.`);
        }
        return;
      }
      await runAutomatic();
    } catch (error) {
      setProblem(friendlyError(error));
    }
  });

  useEffect(() => {
    if (!userId) return;
    // Next tick, so a quick sign-out/sign-in cancels the previous account's check.
    const timer = setTimeout(() => onSignedIn(), 0);
    return () => clearTimeout(timer);
  }, [userId]);

  const withBusy = async <T,>(work: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  };

  // ─── Value ────────────────────────────────────────────────────────────
  const value: BackupContextValue = {
    configured: supabase != null,
    email: session?.user.email ?? null,
    busy,
    lastBackupAt: userId ? (backedUpAt[userId] ?? settingsStore.get(key("at"))) : null,
    problem: userId ? (problems[userId] ?? null) : null,
    signIn: async (email, password) => {
      const client = supabase;
      if (!client) return;
      await withBusy(async () => {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      });
    },
    signOut: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
    },
    changePassword: async (password) => {
      const client = supabase;
      if (!client) return;
      await withBusy(async () => {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
      });
    },
    backUpNow: async (options) =>
      withBusy(async () => {
        const result = await backUp(options?.force ?? false);
        if (result.kind !== "shrunk") setProblem(null);
        return result;
      }),
    restoreBackup: (id) => withBusy(() => restoreCloud(id)),
    exportFile: () =>
      withBusy(async () => {
        const snapshot = await buildSnapshot(db, { appVersion, settings: settingsStore });
        const file = new File(Paths.cache, `ducktionary-backup-${toIsoDate(new Date())}.json`);
        if (file.exists) file.delete();
        file.create();
        file.write(JSON.stringify(snapshot));
        // Read it back before handing it out, so a broken file is caught here and not on import.
        const written = await file.text();
        try {
          validateSnapshot(JSON.parse(written));
        } catch {
          throw new SnapshotError("Couldn't write the backup file.");
        }
        await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your Ducktionary backup" });
        return snapshot.books.length;
      }),
    pickFile: async () => {
      // expo-file-system's picker reads the chosen document straight from its provider (Drive,
      // Downloads, …) instead of copying it into the cache first.
      const picked = await File.pickFileAsync();
      if (picked.canceled) return null;
      let text: string;
      try {
        text = await picked.result.text();
      } catch {
        throw new SnapshotError("Couldn't open that file. Try saving it to the phone first.");
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
      } catch {
        throw new SnapshotError("That file isn't a Ducktionary backup.");
      }
      return validateSnapshot(parsed);
    },
    restoreFromFile: (snapshot) => withBusy(() => applySnapshot(snapshot)),
  };

  return <BackupContext value={value}>{children}</BackupContext>;
}
