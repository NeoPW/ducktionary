/**
 * Attacks your own Supabase project the way a cloned app could — with nothing but the public
 * (publishable) key — and fails if any attack works. Run it after applying the migration and after
 * changing Auth settings.
 *
 *   npm run supabase:check
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY from .env.local. For the
 * cross-account checks, also set two real test accounts there (they are only used by this script):
 *   SECURITY_CHECK_A_EMAIL, SECURITY_CHECK_A_PASSWORD, SECURITY_CHECK_B_EMAIL, SECURITY_CHECK_B_PASSWORD
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { loadEnv } from "./env.ts";

const env = loadEnv();

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.log("No EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local — nothing to check.");
  process.exit(0);
}

const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let failures = 0;
const pass = (label: string) => console.log(`✓ ${label}`);
const fail = (label: string, detail: string) => {
  failures++;
  console.log(`✗ ${label} — ${detail}`);
};
const testBackup = (count = 0, extra: object = {}) => ({
  app_version: "security-check",
  schema_version: 3,
  book_count: count,
  data: { app: "ducktionary", format: 1, books: [], settings: {}, ...extra },
});

// ─── Without an account ───────────────────────────────────────────────────
const anon = client();
{
  const email = `attacker-${Date.now()}@example.com`;
  const { data, error } = await anon.auth.signUp({ email, password: "Correct-Horse-Battery-9" });
  if (error || !data.user) pass("sign-up is disabled");
  else fail("sign-up is disabled", `created ${email} — turn off "Allow new users to sign up" and delete that user`);
}
{
  const { error } = await anon.auth.signInAnonymously();
  if (error) pass("anonymous sign-in is disabled");
  else fail("anonymous sign-in is disabled", "anonymous sessions work — turn them off under Authentication");
  await anon.auth.signOut();
}
{
  const { data, error } = await anon.from("backups").select("id").limit(1);
  if (error || (data ?? []).length === 0) pass("signed-out read returns nothing");
  else fail("signed-out read returns nothing", `read ${data.length} backup(s) without signing in`);
}
{
  const { error } = await anon.from("backups").insert(testBackup());
  if (error) pass("signed-out insert is rejected");
  else fail("signed-out insert is rejected", "wrote a backup without signing in");
}

// ─── Between two real accounts ────────────────────────────────────────────
type Account = { email: string; password: string };
const accounts = ["A", "B"].map((who) => ({ email: env[`SECURITY_CHECK_${who}_EMAIL`], password: env[`SECURITY_CHECK_${who}_PASSWORD`] }));
const complete = (a: Partial<Account>): a is Account => Boolean(a.email && a.password);
if (!accounts.every(complete)) {
  console.log("\n(Skipping cross-account checks — set SECURITY_CHECK_A_* and SECURITY_CHECK_B_* in .env.local to run them.)");
} else {
  const signIn = async ({ email, password }: Account): Promise<[SupabaseClient, string]> => {
    const c = client();
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error || !data.user) throw new Error(`could not sign in as ${email}: ${error?.message}`);
    return [c, data.user.id];
  };
  const [a, aId] = await signIn(accounts[0]);
  const [b] = await signIn(accounts[1]);

  const { data: created, error: createError } = await a.from("backups").insert(testBackup(1)).select("id, user_id").single();
  if (createError || !created) {
    fail("A can write own backup", createError?.message ?? "no row returned");
  } else {
    pass("A can write own backup");
    const id = created.id;

    const { data: seen } = await b.from("backups").select("id").eq("id", id);
    if ((seen ?? []).length === 0) pass("B can't read A's backup");
    else fail("B can't read A's backup", "B read it");

    const { error: spoof } = await b.from("backups").insert({ ...testBackup(), user_id: aId });
    if (spoof) pass("B can't write a backup as A");
    else fail("B can't write a backup as A", "a row owned by A was created by B");

    const { data: deleted } = await b.from("backups").delete().eq("id", id).select("id");
    if ((deleted ?? []).length === 0) pass("B can't delete A's backup");
    else fail("B can't delete A's backup", "B deleted it");

    const { data: updated, error: updateError } = await a.from("backups").update({ book_count: 999 }).eq("id", id).select("id");
    if (updateError || (updated ?? []).length === 0) pass("backups can't be modified");
    else fail("backups can't be modified", "an existing backup was changed");

    const { error: bigError } = await a.from("backups").insert(testBackup(0, { padding: "x".repeat(6 * 1024 * 1024) }));
    if (bigError) pass("oversized backups are rejected");
    else fail("oversized backups are rejected", "a 6 MB backup was accepted");

    // Clean up the test rows.
    await a.from("backups").delete().eq("app_version", "security-check");
    await b.from("backups").delete().eq("app_version", "security-check");
  }
  await a.auth.signOut();
  await b.auth.signOut();
}

console.log(failures ? `\n${failures} check(s) FAILED — fix them before using backups.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
