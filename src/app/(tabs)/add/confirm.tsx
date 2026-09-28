import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import { AppText } from "@/components/app-text";
import { BookForm } from "@/components/book-form";
import { Card } from "@/components/card";
import { useConfirm } from "@/components/confirm-dialog";
import { DuckMascot } from "@/components/duck-mascot";
import { useToast } from "@/components/toast";
import { hasIsbn, insertBook } from "@/db/books";
import { useCategories } from "@/hooks/use-books";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { BookDraft } from "@/types";
import { parseDraftParam } from "@/utils/confirm-route";

export default function ConfirmBookScreen() {
  const db = useSQLiteContext();
  const { colors } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { draft: draftParam, notFound } = useLocalSearchParams<{ draft?: string; notFound?: string }>();
  const [initial] = useState(() => parseDraftParam(draftParam));
  const [duplicate, setDuplicate] = useState(false);

  const categories = useCategories();

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
          <Card style={[styles.notice, { borderColor: colors.accent }]}>
            <DuckMascot mood="confused" size={48} />
            <AppText variant="label" style={styles.noticeText}>
              {duplicate
                ? "You've already logged this book. Saving will add it a second time."
                : `Open Library doesn't know ISBN ${initial.isbn ?? ""} yet. Fill in the details yourself.`}
            </AppText>
          </Card>
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
  },
  noticeText: { flex: 1 },
});
