/** Normalises anything thrown into an Error, so callers can rely on `.message`. */
export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
