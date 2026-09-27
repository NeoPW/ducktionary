import Storage from "expo-sqlite/kv-store";
import { useState } from "react";

/** A small remembered UI setting (e.g. a sort choice), stored on device in the kv-store. */
export function usePreference<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = Storage.getItemSync(key);
      return allowed.includes(stored as T) ? (stored as T) : fallback;
    } catch {
      return fallback;
    }
  });

  const update = (next: T) => {
    setValue(next);
    try {
      Storage.setItemSync(key, next);
    } catch {
      // Not critical — the choice just won't be remembered.
    }
  };

  return [value, update] as const;
}
