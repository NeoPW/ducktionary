const TIMEOUT_MS = 10_000;

/** A lookup failure with a message that can be shown to the user as-is. */
export class LookupError extends Error {}

/**
 * GETs JSON with a timeout. Resolves null on 404 so "unknown book" isn't treated as an error.
 * Aborting via `signal` rejects with the original AbortError.
 */
export async function fetchJson<T>(
  url: string,
  { source, signal, headers }: { source: string; signal?: AbortSignal; headers?: Record<string, string> },
): Promise<T | null> {
  // Own controller so we can time out, while still honouring the caller's signal.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", ...headers },
    });
    if (response.status === 404) return null;
    if (response.status === 429) throw new LookupError(`${source} is busy right now (too many requests).`);
    if (!response.ok) throw new LookupError(`${source} answered ${response.status}.`);
    return (await response.json()) as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof LookupError) throw error;
    throw new LookupError(
      controller.signal.aborted ? `${source} took too long to answer.` : `Couldn't reach ${source}. Are you offline?`,
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

export function deviceLanguage(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0] || "en";
  } catch {
    return "en";
  }
}
