import type { SQLiteDatabase } from "expo-sqlite";

import { restoreSnapshot, validateSnapshot } from "@/sync/snapshot";

/**
 * Dev-only: a real library kept on this machine as example data (`local/example-library.json`, git-ignored —
 * see local/README.md). A require.context instead of a plain require, so the app still builds without the
 * file; behind __DEV__, so release bundles never contain it.
 */
const local = __DEV__ ? require.context("../../local", false, /^\.\/example-library\.json$/) : null;
const FILE = "./example-library.json";

export const hasExampleLibrary = local?.keys().includes(FILE) ?? false;

/** Replaces the library with the example library. Settings in the file are ignored. */
export async function loadExampleLibrary(db: SQLiteDatabase) {
  if (!local || !hasExampleLibrary) throw new Error("No local/example-library.json");
  return restoreSnapshot(db, validateSnapshot(local(FILE)), { get: () => null, set: () => {} });
}
