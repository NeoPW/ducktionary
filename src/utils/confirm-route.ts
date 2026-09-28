import type { BookDraft } from "@/types";
import { blankDraft } from "@/utils/book-draft";
import { todayIso } from "@/utils/dates";

/**
 * The "check the details" screen receives its draft as a JSON route param. These two functions are
 * the only places that encode and decode it.
 */
export function confirmBookHref(draft: BookDraft, { notFound = false }: { notFound?: boolean } = {}) {
  return {
    pathname: "/add/confirm" as const,
    params: { draft: JSON.stringify(draft), ...(notFound ? { notFound: "1" } : {}) },
  };
}

/** The draft from the route param, on top of an empty one (so missing fields get defaults). */
export function parseDraftParam(param: string | undefined): BookDraft {
  if (param) {
    try {
      return { ...blankDraft(todayIso()), ...(JSON.parse(param) as Partial<BookDraft>) };
    } catch {
      // Fall through to an empty form.
    }
  }
  return blankDraft(todayIso());
}
