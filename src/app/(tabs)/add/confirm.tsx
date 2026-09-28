import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookForm } from "@/components/book-form";
import { useConfirm } from "@/components/confirm-dialog";
import { DuckMascot } from "@/components/duck-mascot";
import { useToast } from "@/components/toast";
import { hasIsbn, insertBook, listCategories } from "@/db/books";
import { useFocusLoader } from "@/hooks/use-focus-loader";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { BookDraft } from "@/types";
import { blankDraft } from "@/utils/book-form";
import { todayIso } from "@/utils/dates";

function parseDraft(param: string | undefined): BookDraft {
  if (param) {
    try {
      return { ...blankDraft(todayIso()), ...(JSON.parse(param) as Partial<BookDraft>) };
    } catch {
      // Fall through to an empty form.
    }
  }
  return blankDraft(todayIso());
}

export default function ConfirmBookScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { draft: draftParam, notFound } = useLocalSearchParams<{ draft?: string; notFound?: string }>();
  const [initial] = useState(() => parseDraft(draftParam));
  const [duplicate, setDuplicate] = useState(false);

  const loadCategories = useCallback(() => listCategories(db), [db]);
  const categories = useFocusLoader(loadCategories);

  useEffect(() => {
    if (!initial.isbn) return;
    let active = true;
    hasIsbn(db, initial.isbn).then((found) => active && setDuplicate(found));
    return () => {
      active = false;
    };
  }, [db, initial.isbn]);

  const save = async (draft: BookDraft) => {
    if (draft.isbn && draft.isbn !== initial.isbn && (await hasIsbn(db, draft.isbn))) {
      const proceed = await confirm({
        title: "Already in your library",
        message: "A book with this ISBN is already logged. Add it again?",
        confirmText: "Add again",
      });
      if (!proceed) return undefined;
    }
    const id = await insertBook(db, draft);
    return () => {
      router.dismissAll();
      router.navigate({ pathname: "/book/[id]", params: { id } });
      toast(`Honk! “${draft.title}” is in your library.`);
    };
  };

  return (
    <BookForm
      initial={initial}
      submitLabel="Add to library"
      onSubmit={save}
      categorySuggestions={categories.data ?? []}
      notice={
        duplicate || notFound ? (
          <View style={[styles.notice, { backgroundColor: colors.surface, borderColor: colors.accent }]}>
            <DuckMascot mood="confused" size={48} />
            <AppText variant="label" style={styles.noticeText}>
              {duplicate
                ? "You've already logged this book. Saving will add it a second time."
                : `Open Library doesn't know ISBN ${initial.isbn ?? ""} yet. Fill in the details yourself.`}
            </AppText>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
  },
  noticeText: { flex: 1 },
});
