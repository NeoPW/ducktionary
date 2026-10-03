import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { EmptyScreen } from "@/components/empty-state";
import { DateField } from "@/components/form/date-field";
import { Mascot } from "@/components/mascot";
import { PeriodStepper } from "@/components/period-stepper";
import { LoadingScreen, Screen } from "@/components/screen";
import { SegmentedControl } from "@/components/segmented-control";
import { StatTile } from "@/components/stat-tile";
import { ChartSection } from "@/components/stats/chart-section";
import { Highlights } from "@/components/stats/highlights";
import { useBooks } from "@/hooks/use-books";
import { usePreference } from "@/hooks/use-preference";
import { rangeLabel, resolveRange, stepRange, type RangeKind, type StatsRange } from "@/stats/range";
import { booksInSpan, summarize, type Summary } from "@/stats/summary";
import { SETTING_KEYS } from "@/storage/keys";
import { fonts, spacing } from "@/theme/tokens";
import type { IsoDate } from "@/types";
import { formatPrice } from "@/utils/book-attributes";
import { toIsoDate, todayIso } from "@/utils/dates";
import { BOOKS, plural } from "@/utils/format";

const KINDS: readonly { value: RangeKind; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "month", label: "Month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

function threeMonthsBefore(iso: IsoDate): IsoDate {
  const [y, m, d] = iso.split("-").map(Number);
  return toIsoDate(new Date(y, m - 4, d));
}

export default function StatsScreen() {
  const books = useBooks();
  const today = todayIso();
  const [thisYear, thisMonth] = today.split("-").map(Number);

  const [kind, setKind] = usePreference<RangeKind>(SETTING_KEYS.statsRange, KINDS.map((k) => k.value), "year");
  const [yearRange, setYearRange] = useState<Extract<StatsRange, { kind: "year" }>>({ kind: "year", year: thisYear });
  const [monthRange, setMonthRange] = useState<Extract<StatsRange, { kind: "month" }>>({
    kind: "month",
    year: thisYear,
    month: thisMonth,
  });
  const [customRange, setCustomRange] = useState<Extract<StatsRange, { kind: "custom" }>>({
    kind: "custom",
    from: threeMonthsBefore(today),
    to: today,
  });

  if (books.status === "loading") return <LoadingScreen />;
  if (books.status === "error") {
    return (
      <EmptyScreen mood="confused" title="Couldn't load your stats" message={books.error.message} />
    );
  }
  if (books.data.length === 0) {
    return (
      <EmptyScreen
        mood="reading"
        title="Nothing to count yet"
        message="Finish a few books and your reading stats will show up here."
      />
    );
  }

  const earliest = books.data[books.data.length - 1].finishedAt; // list is newest first
  const [firstYear, firstMonth] = earliest.split("-").map(Number);

  const range: StatsRange =
    kind === "year" ? yearRange : kind === "month" ? monthRange : kind === "custom" ? customRange : { kind: "all" };
  const span = resolveRange(range, earliest, today);
  const inSpan = booksInSpan(books.data, span);
  const summary = summarize(inSpan, span, today, books.data);

  const monthIndex = (r: { year: number; month: number }) => r.year * 12 + r.month;
  const currentMonth = monthIndex({ year: thisYear, month: thisMonth });
  const oldestMonth = Math.min(monthIndex({ year: firstYear, month: firstMonth }), currentMonth);

  return (
    <Screen>
      {/* Range controls sit above everything they filter. */}
      <SegmentedControl options={KINDS} value={kind} onChange={setKind} />
      {kind === "year" && (
        <PeriodStepper
          label={rangeLabel(yearRange)}
          onPrevious={() => setYearRange((r) => stepRange(r, -1))}
          onNext={() => setYearRange((r) => stepRange(r, 1))}
          canPrevious={yearRange.year > Math.min(firstYear, thisYear)}
          canNext={yearRange.year < thisYear}
        />
      )}
      {kind === "month" && (
        <PeriodStepper
          label={rangeLabel(monthRange)}
          onPrevious={() => setMonthRange((r) => stepRange(r, -1))}
          onNext={() => setMonthRange((r) => stepRange(r, 1))}
          canPrevious={monthIndex(monthRange) > oldestMonth}
          canNext={monthIndex(monthRange) < currentMonth}
        />
      )}
      {kind === "custom" && (
        <View style={styles.customRow}>
          <View style={styles.flex}>
            <DateField
              label="From"
              value={customRange.from}
              onChange={(from) => from && setCustomRange((r) => ({ ...r, from }))}
              maximumDate={customRange.to}
            />
          </View>
          <View style={styles.flex}>
            <DateField
              label="To"
              value={customRange.to}
              onChange={(to) => to && setCustomRange((r) => ({ ...r, to }))}
              minimumDate={customRange.from}
              maximumDate={today}
            />
          </View>
        </View>
      )}

      <Hero summary={summary} range={range} />

      {summary.books > 0 && (
        <>
          <Tiles summary={summary} />
          <ChartSection books={inSpan} span={span} library={books.data} />
          <Highlights summary={summary} />
        </>
      )}
    </Screen>
  );
}

function Hero({ summary, range }: { summary: Summary; range: StatsRange }) {
  const when =
    range.kind === "all" ? "in total" : range.kind === "custom" ? `from ${rangeLabel(range)}` : `in ${rangeLabel(range)}`;

  return (
    <Card style={styles.hero}>
      <Mascot mood={summary.books > 0 ? "reading" : "sleepy"} size={88} />
      <View style={styles.flex}>
        <AppText style={styles.heroNumber} accessibilityLabel={`${plural(summary.books, BOOKS)} finished ${when}`}>
          {summary.books.toLocaleString()}
        </AppText>
        <AppText color="muted">
          {summary.books === 1 ? "book" : "books"} finished {when}
        </AppText>
        {summary.books === 0 && (
          <AppText variant="caption" color="muted" style={styles.heroHint}>
            Quiet period — pick another range above.
          </AppText>
        )}
      </View>
    </Card>
  );
}

function Tiles({ summary }: { summary: Summary }) {
  const round = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1));
  return (
    <View style={styles.tiles}>
      <StatTile label="Pages read" value={summary.pages.toLocaleString()} />
      <StatTile label="Days reading" value={summary.daysReading.toLocaleString()} detail="with a book on the go" />
      <StatTile
        label="Average rating"
        value={summary.avgRating != null ? `${summary.avgRating.toFixed(1)} ★` : "–"}
      />
      <StatTile
        label="Average length"
        value={summary.avgPages != null ? `${Math.round(summary.avgPages)}` : "–"}
        detail="pages per book"
      />
      <StatTile
        label="Time per book"
        value={summary.avgDaysPerBook != null ? `${round(summary.avgDaysPerBook)} days` : "–"}
        detail="start to finish"
      />
      <StatTile
        label="Pages per day"
        value={summary.pagesPerDay != null ? round(summary.pagesPerDay) : "–"}
        detail="over the whole period"
      />
      <StatTile
        label="Top category"
        value={summary.topCategory?.name ?? "–"}
        detail={summary.topCategory ? plural(summary.topCategory.books, BOOKS) : undefined}
      />
      <StatTile
        label="Spent"
        value={summary.pricedBooks ? formatPrice(summary.spentCents) : "–"}
        detail={summary.pricedBooks ? `on ${plural(summary.pricedBooks, BOOKS)}` : "no prices yet"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  customRow: { flexDirection: "row", gap: spacing.md },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
  },
  heroNumber: { fontFamily: fonts.sansBold, fontSize: 48, lineHeight: 56 },
  heroHint: { marginTop: spacing.xs },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
