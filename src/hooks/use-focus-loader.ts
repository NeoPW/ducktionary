import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

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

  useFocusEffect(
    useCallback(() => {
      let active = true;
      load().then(
        (data) => active && setState({ status: "ready", data }),
        (error: unknown) =>
          active && setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) }),
      );
      return () => {
        active = false;
      };
    }, [load]),
  );

  const reload = useCallback(async () => {
    try {
      setState({ status: "ready", data: await load() });
    } catch (error) {
      setState({ status: "error", error: error instanceof Error ? error : new Error(String(error)) });
    }
  }, [load]);

  return { ...state, reload };
}
