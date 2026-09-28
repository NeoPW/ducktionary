import { useEffect, useState } from "react";

import { searchBooks } from "@/api/book-lookup";
import type { SearchResult } from "@/api/search-result";
import { toError } from "@/utils/errors";
import { normalizeIsbn } from "@/utils/isbn";

const DEBOUNCE_MS = 450;

type Completed = {
  query: string;
  attempt: number;
  results?: SearchResult[];
  error?: Error;
};

/**
 * Debounced Open Library search. Waits until the query is at least 3 characters (or a valid ISBN),
 * cancels in-flight requests when the query changes, and keeps the previous results while loading.
 */
export function useBookSearch(query: string) {
  const trimmed = query.trim();
  const searchable = trimmed.length >= 3 || normalizeIsbn(trimmed) != null;
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState<Completed | null>(null);

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchBooks(trimmed, controller.signal).then(
        (results) => setCompleted({ query: trimmed, attempt, results }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          setCompleted({ query: trimmed, attempt, error: toError(error) });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searchable, attempt]);

  const retry = () => setAttempt((n) => n + 1);

  if (!searchable) return { status: "idle" as const, results: [], retry };

  const fresh = completed?.query === trimmed && completed.attempt === attempt;
  if (!fresh) return { status: "loading" as const, results: completed?.results ?? [], retry };
  if (completed.error) return { status: "error" as const, results: [], error: completed.error, retry };
  return { status: "done" as const, results: completed.results ?? [], retry };
}
