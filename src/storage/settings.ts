import Storage from "expo-sqlite/kv-store";

/**
 * Synchronous kv-store access for small settings. Failures are swallowed: a setting that can't be
 * read falls back to its default, and one that can't be written just isn't remembered.
 */
export function readSetting(key: string): string | null {
  try {
    return Storage.getItemSync(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    Storage.setItemSync(key, value);
  } catch {
    // Not critical.
  }
}
