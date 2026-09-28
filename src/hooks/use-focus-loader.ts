import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { toError } from "@/utils/errors";

type LoaderState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "ready"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: Error };

/**
 * Runs `load` whenever the screen gains focus, so data edited on another screen is fresh
 * when you come back. `load` must be memoized (useCallback) by the caller.
 */
export function useFocusLoader<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoaderState<T>>({ status: "loading" });

  /** Loads and stores the result, unless `isActive` says the screen has moved on meanwhile. */
  const run = useCallback(
    async (isActive: () => boolean = () => true) => {
      try {
        const data = await load();
        if (isActive()) setState({ status: "ready", data });
      } catch (error) {
        if (isActive()) setState({ status: "error", error: toError(error) });
      }
    },
    [load],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      run(() => active);
      return () => {
        active = false;
      };
    }, [run]),
  );

  const reload = useCallback(() => run(), [run]);

  return { ...state, reload };
}
