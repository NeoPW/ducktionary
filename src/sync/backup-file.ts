/** Backup files: the same snapshot as a cloud backup, saved and restored through the phone's files. */
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { SnapshotError, validateSnapshot, type Snapshot } from "@/sync/snapshot";
import { toIsoDate } from "@/utils/dates";

/** Writes `ducktionary-backup-YYYY-MM-DD.json` and opens the share sheet to save or send it. */
export async function shareBackupFile(snapshot: Snapshot): Promise<void> {
  const file = new File(Paths.cache, `ducktionary-backup-${toIsoDate(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(snapshot));
  // Read it back before handing it out, so a broken file is caught here and not on import.
  try {
    validateSnapshot(JSON.parse(await file.text()));
  } catch {
    throw new SnapshotError("Couldn't write the backup file.");
  }
  await Sharing.shareAsync(file.uri, { mimeType: "application/json", dialogTitle: "Save your Ducktionary backup" });
}

/** Lets the user pick a backup file and returns it checked; null if they cancelled. */
export async function pickBackupFile(): Promise<Snapshot | null> {
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
    parsed = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    throw new SnapshotError("That file isn't a Ducktionary backup.");
  }
  return validateSnapshot(parsed);
}
