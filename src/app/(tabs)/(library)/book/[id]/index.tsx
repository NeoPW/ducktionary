import { router, Stack } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { CategoryChips } from "@/components/category-chips";
import { useConfirm } from "@/components/confirm-dialog";
import { RouteBook } from "@/components/route-book";
import { Screen } from "@/components/screen";
import { StarRating } from "@/components/star-rating";
import { useToast } from "@/components/toast";
import { deleteBook } from "@/db/books";
import { useBooks } from "@/hooks/use-books";
import { encodeFilter } from "@/library/filter";
import { sameSeries, seriesOrder } from "@/library/series";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";
import { acquisitionLabel, formatLabel, formatPrice } from "@/utils/book-attributes";
import { formatDate, readingDays } from "@/utils/dates";
import { BOOKS, DAYS, plural } from "@/utils/format";
import { lengthClassLabel } from "@/utils/length-class";

type Fact = [label: string, value: string];

export default function BookDetailScreen() {
  return <RouteBook>{(book) => <BookDetail book={book} />}</RouteBook>;
}

function BookDetail({ book }: { book: Book }) {
  const db = useSQLiteContext();
  const toast = useToast();
  const confirm = useConfirm();

  const confirmDelete = async () => {
    const ok = await confirm({
      title: "Delete this book?",
      message: `“${book.title}” will be removed from your library.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await deleteBook(db, book.id);
    router.back();
    toast(`“${book.title}” was removed.`, "sleepy");
  };

  const facts: Fact[] = [["Finished", formatDate(book.finishedAt)]];
  if (book.startedAt) {
    facts.push(["Started", formatDate(book.startedAt)]);
    facts.push(["Reading time", plural(readingDays(book.startedAt, book.finishedAt), DAYS)]);
  }
  if (book.pages) facts.push(["Length", `${lengthClassLabel(book.pages)} · ${book.pages} pages`]);
  if (book.isbn) facts.push(["ISBN", book.isbn]);

  const copy: Fact[] = [];
  const format = formatLabel(book.format);
  const acquisition = acquisitionLabel(book.acquisition);
  if (format) copy.push(["Format", format]);
  if (acquisition) copy.push(["How you got it", acquisition]);
  if (book.priceCents != null) copy.push(["Price", formatPrice(book.priceCents)]);

  const openEdit = () => router.push({ pathname: "/book/[id]/edit", params: { id: book.id } });

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" hitSlop={12} onPress={openEdit}>
              <AppText variant="label" color="primary">
                Edit
              </AppText>
            </Pressable>
          ),
        }}
      />
      <View style={styles.hero}>
        <BookCover title={book.title} coverUrl={book.coverUrl} width={150} />
        <AppText variant="title" style={styles.center}>
          {book.title}
        </AppText>
        {book.authors.length > 0 && (
          <AppText color="muted" style={styles.center}>
            {book.authors.join(", ")}
          </AppText>
        )}
        {book.rating != null ? (
          <StarRating rating={book.rating} size={22} />
        ) : (
          <AppText variant="caption" color="muted">
            Not rated
          </AppText>
        )}
      </View>

      <FactCard facts={facts} />

      {book.series && <SeriesCard book={book} />}

      <CategoryChips categories={book.categories} />

      {book.comment ? (
        <Card style={styles.card}>
          <AppText variant="heading">Notes</AppText>
          <AppText>{book.comment}</AppText>
        </Card>
      ) : null}

      {copy.length > 0 && <FactCard title="Your copy" facts={copy} />}

      <Button title="Delete book" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}

/** The book's series: the other books in reading order (tap to open) and a link to the filtered library. */
function SeriesCard({ book }: { book: Book }) {
  const { colors } = useTheme();
  const books = useBooks();
  const series = book.series!;
  const members = (books.data ?? [book])
    .filter((b) => b.series && sameSeries(b.series.name, series.name))
    .sort(seriesOrder);
  const where = series.position != null ? `Book ${String(series.position).replace(".", ",")}` : null;

  return (
    <Card style={styles.card}>
      <View style={styles.seriesHead}>
        <AppText variant="heading" style={styles.flex}>
          {series.name}
        </AppText>
        <AppText variant="caption" color="muted">
          {[where, `${plural(members.length, BOOKS)} read`].filter(Boolean).join(" · ")}
        </AppText>
      </View>
      {members.map((member) => {
        const current = member.id === book.id;
        return (
          <Pressable
            key={member.id}
            accessibilityRole="button"
            accessibilityLabel={`${member.title}${current ? ", this book" : ""}`}
            disabled={current}
            onPress={() => router.push({ pathname: "/book/[id]", params: { id: member.id } })}
            style={[styles.member, current && { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <BookCover title={member.title} coverUrl={member.coverUrl} width={32} />
            <View style={styles.flex}>
              <AppText variant="label" numberOfLines={1}>
                {member.title}
              </AppText>
              <AppText variant="caption" color="muted">
                {current ? "This book" : `Finished ${formatDate(member.finishedAt)}`}
              </AppText>
            </View>
            {member.series?.position != null && (
              <AppText variant="label" color="muted">
                #{String(member.series.position).replace(".", ",")}
              </AppText>
            )}
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => router.navigate({ pathname: "/", params: { filter: encodeFilter({ series: series.name }) } })}
      >
        <AppText variant="label" color="primary">
          Show in library ›
        </AppText>
      </Pressable>
    </Card>
  );
}

/** Label/value rows in a card, with an optional heading. */
function FactCard({ title, facts }: { title?: string; facts: Fact[] }) {
  return (
    <Card style={styles.card}>
      {title ? <AppText variant="heading">{title}</AppText> : null}
      {facts.map(([label, value]) => (
        <View key={label} style={styles.fact}>
          <AppText variant="label" color="muted">
            {label}
          </AppText>
          <AppText variant="label">{value}</AppText>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.sm },
  center: { textAlign: "center" },
  card: { padding: spacing.lg, gap: spacing.sm },
  fact: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  flex: { flex: 1 },
  seriesHead: { flexDirection: "row", alignItems: "baseline", gap: spacing.sm },
  member: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xs,
    borderRadius: radii.cover,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
