import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ChoiceChips } from "@/components/form/choice-chips";
import { Dropdown } from "@/components/dropdown";
import { DateField } from "@/components/form/date-field";
import { MultiChoiceChips } from "@/components/form/multi-choice-chips";
import { FieldShell } from "@/components/form/text-field";
import { useBottomInset } from "@/components/screen";
import { useBooks } from "@/hooks/use-books";
import { topCounts } from "@/stats/helpers";
import {
  decodeFilter,
  encodeFilter,
  filterChips,
  matchesFilter,
  withoutKey,
  type FilterKey,
  type LibraryFilter,
} from "@/library/filter";
import { SERIES_LENGTHS, seriesSizes } from "@/library/series";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Acquisition, BookFormat, IsoDate } from "@/types";
import { ACQUISITIONS, FORMATS } from "@/utils/book-attributes";
import { BOOKS, plural } from "@/utils/format";
import { LENGTH_CLASSES, type LengthClass } from "@/utils/length-class";

const RATINGS = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5].map((r) => ({ value: r as number | null, label: `${r} ★` }));
const NOT_SET = { value: null, label: "Not set" } as const;

/** Filters that come from the stats but can't be edited here; they're shown as removable chips. */
const FROM_STATS: FilterKey[] = ["authors", "pages", "readingDays", "priceCents"];

/** Builds a library filter; "Show N books" applies it. */
export default function FilterScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<LibraryFilter>(() => decodeFilter(params.filter));
  const books = useBooks();
  const bottomInset = useBottomInset();
  const library = books.data ?? [];

  const set = <K extends FilterKey>(key: K, value: LibraryFilter[K] | undefined) =>
    setFilter((current) => (value === undefined ? withoutKey(current, key) : { ...current, [key]: value }));
  /** A list filter: an empty selection means "any", so the key goes away. */
  const setList = <K extends FilterKey>(key: K, values: unknown[]) =>
    set(key, (values.length ? values : undefined) as LibraryFilter[K]);

  const years = [...new Set(library.map((b) => b.finishedAt.slice(0, 4)))].sort().reverse();
  const yearOf = (f: LibraryFilter) => {
    const from = f.finished?.from;
    const to = f.finished?.to;
    return from && to && from.endsWith("-01-01") && to === `${from.slice(0, 4)}-12-31` ? from.slice(0, 4) : null;
  };
  const categories = topCounts(
    library.flatMap((b) => b.categories),
    Infinity,
  ).map((c) => ({ value: c.name, label: c.name }));
  const series = topCounts(library.flatMap((b) => (b.series ? [b.series.name] : [])), Infinity).map((s) => ({
    value: s.name,
    label: s.name,
  }));
  const sizes = seriesSizes(library);
  const count = library.filter((b) => matchesFilter(b, filter, sizes)).length;
  const statsChips = filterChips(filter).filter((chip) => FROM_STATS.includes(chip.key));
  const setFinished = (from: IsoDate | null | undefined, to: IsoDate | null | undefined) =>
    set("finished", from || to ? { ...(from ? { from } : {}), ...(to ? { to } : {}) } : undefined);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {statsChips.length > 0 && (
          <View style={styles.chips}>
            {statsChips.map((chip) => (
              <Pressable
                key={chip.key}
                accessibilityRole="button"
                accessibilityLabel={`Remove filter: ${chip.label}`}
                onPress={() => set(chip.key, undefined)}
                style={[styles.chip, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <AppText variant="label">{chip.label}</AppText>
                <AppText variant="label">×</AppText>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <ChoiceChips
            label="Finished"
            options={years.map((y) => ({ value: y, label: y }))}
            value={yearOf(filter)}
            onChange={(year) => setFinished(year ? `${year}-01-01` : null, year ? `${year}-12-31` : null)}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <DateField
                label="From"
                value={filter.finished?.from ?? null}
                onChange={(from) => setFinished(from, filter.finished?.to)}
                maximumDate={filter.finished?.to ?? undefined}
                clearable
              />
            </View>
            <View style={styles.flex}>
              <DateField
                label="To"
                value={filter.finished?.to ?? null}
                onChange={(to) => setFinished(filter.finished?.from, to)}
                minimumDate={filter.finished?.from ?? undefined}
                clearable
              />
            </View>
          </View>
        </View>

        <MultiChoiceChips
          label="Rating"
          options={[...RATINGS, { value: null, label: "Not rated" }]}
          values={filter.ratings ?? []}
          onChange={(values) => setList("ratings", values)}
        />
        <MultiChoiceChips<LengthClass | null>
          label="Length"
          options={[...LENGTH_CLASSES, { value: null, label: "No page count" }]}
          values={filter.lengthClasses ?? []}
          onChange={(values) => setList("lengthClasses", values)}
        />
        <MultiChoiceChips<BookFormat | null>
          label="Format"
          options={[...FORMATS, NOT_SET]}
          values={filter.formats ?? []}
          onChange={(values) => setList("formats", values)}
        />
        <MultiChoiceChips<Acquisition | null>
          label="How you got it"
          options={[...ACQUISITIONS, NOT_SET]}
          values={filter.acquisitions ?? []}
          onChange={(values) => setList("acquisitions", values)}
        />
        {categories.length > 0 && (
          <MultiChoiceChips
            label="Categories (any of)"
            options={categories}
            values={filter.categories ?? []}
            onChange={(values) => setList("categories", values)}
          />
        )}
        {series.length > 0 && (
          <FieldShell label="Series">
            <Dropdown
              compact
              accessibilityLabel="Series"
              value={series.find((s) => s.value.toLowerCase() === filter.series?.toLowerCase())?.value ?? ""}
              options={[{ value: "", label: "Any series" }, ...series]}
              onChange={(name) => set("series", name || undefined)}
            />
          </FieldShell>
        )}
        <MultiChoiceChips
          label="Series length"
          options={SERIES_LENGTHS}
          values={filter.seriesLengths ?? []}
          onChange={(values) => setList("seriesLengths", values)}
        />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { borderColor: colors.border, backgroundColor: colors.background, paddingBottom: spacing.md + bottomInset },
        ]}
      >
        <View style={styles.flex}>
          <Button title="Reset" variant="ghost" onPress={() => setFilter({})} />
        </View>
        <View style={styles.show}>
          <Button
            title={`Show ${plural(count, BOOKS)}`}
            onPress={() => router.navigate({ pathname: "/", params: { filter: encodeFilter(filter) } })}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.xl },
  section: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  show: { flex: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
