import type { Session } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { useSQLiteContext } from "expo-sqlite";
import { createContext, use, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";

import { useConfirm } from "@/components/confirm-dialog";
import { useGoose } from "@/components/goose/goose-visits";
import { useToast } from "@/components/toast";
import { onLibraryChanged } from "@/db/events";
import { readSetting, writeSetting } from "@/storage/settings";
import { pickBackupFile, shareBackupFile } from "@/sync/backup-file";
import * as cloud from "@/sync/cloud";
import { buildSnapshot, contentHash, restoreSnapshot, type SettingsStore, type Snapshot } from "@/sync/snapshot";
import { useTheme } from "@/theme/use-theme";
import { BOOKS, plural } from "@/utils/format";

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

const settingsStore: SettingsStore = { get: readSetting, set: writeSetting };
const appVersion = Constants.expoConfig?.version ?? "1.0.0";

/** Toast text after a restore. */
export const restoredMessage = (books: number) => `Honk! ${plural(books, BOOKS)} restored.`;

const BackupContext = createContext<BackupContextValue | null>(null);

export function useBackup(): BackupContextValue {
  const value = use(BackupContext);
  if (!value) throw new Error("useBackup must be used inside BackupProvider");
  return value;
}

/**
 * Account state plus backups: automatic cloud backups while signed in, manual backup/restore, and
 * backup files. The phone stays the source of truth — the cloud only ever receives full snapshots.
 */
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
  /** Device-only bookkeeping per account: the last uploaded content hash and upload time. */
  const key = (name: "hash" | "at") => `backup.${name}.${userId}`;
  const setProblem = (message: string | null) => userId && setProblems((all) => ({ ...all, [userId]: message }));

  useEffect(() => cloud.subscribeToSession(setSession), []);

  const withBusy = async <T,>(work: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await work();
    } finally {
      setBusy(false);
    }
  };

  // ─── Back up / restore ────────────────────────────────────────────────
  const backUp = async (force: boolean): Promise<BackupResult> => {
    if (!userId) throw new Error("Sign in to back up.");
    const snapshot = await buildSnapshot(db, { appVersion, settings: settingsStore });
    const hash = contentHash(snapshot);
    if (!force && readSetting(key("hash")) === hash) return { kind: "unchanged" };

    const newest = await cloud.newestCloudBackup();
    if (!force && newest && snapshot.books.length < newest.bookCount * SHRINK_LIMIT) {
      return { kind: "shrunk", books: snapshot.books.length, backedUp: newest.bookCount };
    }
    await cloud.uploadBackup(snapshot);
    const at = new Date().toISOString();
    writeSetting(key("hash"), hash);
    writeSetting(key("at"), at);
    setBackedUpAt((all) => ({ ...all, [userId]: at }));
    return { kind: "uploaded" };
  };

  const applySnapshot = async (snapshot: Snapshot) => {
    const n = await restoreSnapshot(db, snapshot, settingsStore);
    theme.reloadFromStorage();
    goose.reloadFromStorage();
    // The restored library is what the cloud already has; don't upload it again.
    if (userId) writeSetting(key("hash"), contentHash(snapshot));
    setDueAt(null);
    return n;
  };

  const restoreCloud = async (id: number) => applySnapshot(await cloud.downloadBackup(id));

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
      setProblem(cloud.friendlyError(error));
      setDueAt(Date.now() + RETRY_MS);
    }
  });

  // Library changes push the next backup a minute out; leaving the app saves anything pending.
  useEffect(() => {
    if (!userId) return;
    return onLibraryChanged(() => setDueAt(Date.now() + AUTO_DELAY_MS));
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
      const newest = await cloud.newestCloudBackup();
      if (newest && !readSetting(key("at"))) setBackedUpAt((all) => ({ ...all, [userId]: newest.createdAt }));
      const count = await db.getFirstAsync<{ n: number }>("SELECT count(*) AS n FROM books");
      if (newest && (count?.n ?? 0) === 0 && offeredRestoreFor.current !== userId) {
        offeredRestoreFor.current = userId;
        const ok = await confirm({
          title: "Restore your library?",
          message: `Your backup from ${new Date(newest.createdAt).toLocaleDateString()} has ${plural(newest.bookCount, BOOKS)}. Restore them to this phone?`,
          confirmText: "Restore",
          cancelText: "Not now",
          mood: "celebrating",
        });
        if (ok) toast(restoredMessage(await restoreCloud(newest.id)));
        return;
      }
      await runAutomatic();
    } catch (error) {
      setProblem(cloud.friendlyError(error));
    }
  });

  useEffect(() => {
    if (!userId) return;
    // Next tick, so a quick sign-out/sign-in cancels the previous account's check.
    const timer = setTimeout(() => onSignedIn(), 0);
    return () => clearTimeout(timer);
  }, [userId]);

  // ─── Value ────────────────────────────────────────────────────────────
  const value: BackupContextValue = {
    configured: cloud.cloudConfigured,
    email: session?.user.email ?? null,
    busy,
    lastBackupAt: userId ? (backedUpAt[userId] ?? readSetting(key("at"))) : null,
    problem: userId ? (problems[userId] ?? null) : null,
    signIn: (email, password) => withBusy(() => cloud.signIn(email, password)),
    signOut: cloud.signOut,
    changePassword: (password) => withBusy(() => cloud.changePassword(password)),
    backUpNow: (options) =>
      withBusy(async () => {
        const result = await backUp(options?.force ?? false);
        if (result.kind !== "shrunk") setProblem(null);
        return result;
      }),
    restoreBackup: (id) => withBusy(() => restoreCloud(id)),
    exportFile: () =>
      withBusy(async () => {
        const snapshot = await buildSnapshot(db, { appVersion, settings: settingsStore });
        await shareBackupFile(snapshot);
        return snapshot.books.length;
      }),
    pickFile: pickBackupFile,
    restoreFromFile: (snapshot) => withBusy(() => applySnapshot(snapshot)),
  };

  return <BackupContext value={value}>{children}</BackupContext>;
}
