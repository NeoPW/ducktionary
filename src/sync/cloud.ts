/**
 * Everything that talks to the Supabase backup server: auth and the `backups` table. Row Level
 * Security scopes every query to the signed-in user, so none of these filter by user themselves.
 */
import type { Session } from "@supabase/supabase-js";

import { SnapshotError, validateSnapshot, type Snapshot } from "@/sync/snapshot";
import { supabase } from "@/sync/supabase";
import { toError } from "@/utils/errors";

export type BackupInfo = { id: number; createdAt: string; bookCount: number; appVersion: string };

/** How many backups the server keeps per user (pruned by a database trigger). */
export const KEPT_BACKUPS = 30;

/** False when this build has no Supabase config — hide everything account-related. */
export const cloudConfigured = supabase != null;

function client() {
  if (!supabase) throw new Error("Backups aren't set up in this version.");
  return supabase;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

/** Calls `listener` with the current session now and whenever it changes; returns an unsubscribe. */
export function subscribeToSession(listener: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  supabase.auth.getSession().then(({ data }) => listener(data.session));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => listener(session));
  return () => data.subscription.unsubscribe();
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await client().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await client().auth.signOut();
}

export async function changePassword(password: string): Promise<void> {
  const { error } = await client().auth.updateUser({ password });
  if (error) throw error;
}

// ─── Backups ────────────────────────────────────────────────────────────────

/** The signed-in user's cloud backups, newest first. */
export async function listCloudBackups(limit = KEPT_BACKUPS): Promise<BackupInfo[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("backups")
    .select("id, created_at, book_count, app_version")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    bookCount: row.book_count,
    appVersion: row.app_version,
  }));
}

export async function newestCloudBackup(): Promise<BackupInfo | null> {
  const [newest] = await listCloudBackups(1);
  return newest ?? null;
}

export async function uploadBackup(snapshot: Snapshot): Promise<void> {
  const { error } = await client().from("backups").insert({
    app_version: snapshot.appVersion,
    schema_version: snapshot.schemaVersion,
    book_count: snapshot.books.length,
    data: snapshot,
  });
  if (error) throw error;
}

/** Downloads one backup and checks it — the server stores whatever a client sent. */
export async function downloadBackup(id: number): Promise<Snapshot> {
  const { data, error } = await client().from("backups").select("data").eq("id", id).single();
  if (error) throw error;
  return validateSnapshot(data.data);
}

/** Turns Supabase/network errors into sentences a person can act on. */
export function friendlyError(error: unknown): string {
  const { message } = toError(error);
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
