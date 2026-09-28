import { useState } from "react";

import type { SettingKey } from "@/storage/keys";
import { readSetting, writeSetting } from "@/storage/settings";

/** A small remembered UI setting (e.g. a sort choice), stored on device in the kv-store. */
export function usePreference<T extends string>(key: SettingKey, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = readSetting(key);
    return allowed.includes(stored as T) ? (stored as T) : fallback;
  });

  const update = (next: T) => {
    setValue(next);
    writeSetting(key, next);
  };

  return [value, update] as const;
}
