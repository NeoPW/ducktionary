import { router } from "expo-router";
import type { ReactElement } from "react";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { StarRating } from "@/components/star-rating";
import { fonts, spacing } from "@/theme/tokens";
import type { Book } from "@/types";

type BookGridProps = {
  books: Book[];
  header?: ReactElement;
  footer?: ReactElement | null;
  empty?: ReactElement;
};

const GAP = spacing.lg;
const PADDING = spacing.lg;

export function BookGrid({ books, header, footer, empty }: BookGridProps) {
  const { width } = useWindowDimensions();
  const columns = width < 360 ? 2 : 3;
  const tileWidth = Math.floor((width - PADDING * 2 - GAP * (columns - 1)) / columns);

  return (
    <FlatList
      key={columns}
      data={books}
      numColumns={columns}
      keyExtractor={(book) => String(book.id)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      columnWrapperStyle={styles.row}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={empty}
      renderItem={({ item }) => <BookTile book={item} width={tileWidth} />}
    />
  );
}

function BookTile({ book, width }: { book: Book; width: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${book.title}, ${book.authors.join(", ")}`}
      onPress={() => router.push({ pathname: "/book/[id]", params: { id: book.id } })}
      style={({ pressed }) => [{ width, opacity: pressed ? 0.8 : 1 }]}
    >
      <BookCover title={book.title} coverUrl={book.coverUrl} width={width} />
      <View style={styles.caption}>
        <AppText variant="label" numberOfLines={2} style={styles.title}>
          {book.title}
        </AppText>
        {book.rating != null && <StarRating rating={book.rating} size={11} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: PADDING, gap: GAP, flexGrow: 1 },
  row: { gap: GAP },
  caption: { marginTop: spacing.sm, gap: spacing.xs },
  title: { fontFamily: fonts.serif, fontSize: 13, lineHeight: 17 },
});
