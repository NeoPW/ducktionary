import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Card } from "@/components/card";
import { CartesianChart } from "@/components/charts/cartesian-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { RowChart } from "@/components/charts/row-chart";
import { Dropdown } from "@/components/dropdown";
import { SegmentedControl } from "@/components/segmented-control";
import { usePreference } from "@/hooks/use-preference";
import { buildChart, CHARTS, type ChartKind, type ChartStyle } from "@/stats/charts";
import type { DateSpan } from "@/stats/range";
import { SETTING_KEYS } from "@/storage/keys";
import { spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { Book } from "@/types";
import { formatPrice } from "@/utils/book-attributes";

const OPTIONS = CHARTS.map((c) => ({ value: c.kind, label: c.label }));
const STYLE_LABELS: Record<ChartStyle, string> = { bar: "Bars", line: "Line", pie: "Pie" };
const ALL_STYLES: ChartStyle[] = ["bar", "line", "pie"];

type ChartSectionProps = {
  /** Books in the selected span. */
  books: Book[];
  span: DateSpan;
  /** The whole library — keeps pie colours stable across ranges. */
  library: Book[];
};

/** Chart and style pickers (above the card, not inside it) + the chosen chart. */
export function ChartSection({ books, span, library }: ChartSectionProps) {
  const { colors } = useTheme();
  const [kind, setKind] = usePreference<ChartKind>(
    SETTING_KEYS.statsChart,
    CHARTS.map((c) => c.kind),
    "books-over-time",
  );
  const [preferredStyle, setPreferredStyle] = usePreference<ChartStyle>(SETTING_KEYS.statsChartStyle, ALL_STYLES, "bar");
  const [showTable, setShowTable] = useState(false);

  const chart = buildChart(kind, books, span, library);
  // Keep the user's preferred style where it fits this chart; otherwise fall back to bars.
  const style: ChartStyle = chart.styles.includes(preferredStyle) ? preferredStyle : "bar";
  const title = CHARTS.find((c) => c.kind === kind)?.label ?? "";
  const empty = chart.bars.every((b) => b.value === 0);
  const currency = chart.valueFormat === "currency";
  const euros = (value: number, whole = false) => formatPrice(Math.round(value * 100), { whole });
  const fullValue = (value: number) => (currency ? euros(value) : value.toLocaleString());
  const summary = `${title}. ${chart.bars.map((b) => `${b.label} ${fullValue(b.value)}`).join(", ")}`;
  const note = [
    chart.note,
    style === "pie" && chart.layout === "rows"
      ? "The most common in your whole library get their own colour; the rest are grouped as Other."
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <View style={styles.section}>
      <Dropdown value={kind} options={OPTIONS} onChange={setKind} accessibilityLabel="Chart" />
      {chart.styles.length > 1 && (
        <SegmentedControl
          options={chart.styles.map((s) => ({ value: s, label: STYLE_LABELS[s] }))}
          value={style}
          onChange={setPreferredStyle}
        />
      )}
      <Card style={styles.card}>
        {empty ? (
          <AppText color="muted" style={styles.empty}>
            Nothing to chart for this period.
          </AppText>
        ) : style === "pie" && chart.slices ? (
          <PieChart slices={chart.slices} unit={chart.unit} accessibilityLabel={summary} />
        ) : chart.layout === "rows" ? (
          <RowChart bars={chart.bars} />
        ) : (
          <>
            <CartesianChart
              // Remount when the data changes so a tapped column doesn't carry over.
              key={`${kind}-${span.from}-${span.to}`}
              bars={chart.bars}
              variant={style === "line" ? "line" : "bar"}
              unit={chart.unit}
              accessibilityLabel={summary}
              formatShort={currency ? (v) => euros(v, true) : undefined}
              formatFull={currency ? euros : undefined}
            />
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setShowTable((v) => !v)}>
              <AppText variant="label" color="primary">
                {showTable ? "Hide values" : "Show values"}
              </AppText>
            </Pressable>
            {showTable && (
              <View style={[styles.table, { borderColor: colors.border }]}>
                {chart.bars.map((bar) => (
                  <View key={bar.key} style={styles.tableRow}>
                    <AppText variant="label" color="muted">
                      {bar.label}
                    </AppText>
                    <AppText variant="label">{fullValue(bar.value)}</AppText>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        {note && !empty ? (
          <AppText variant="caption" color="muted">
            {note}
          </AppText>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  card: { padding: spacing.lg, gap: spacing.md },
  empty: { textAlign: "center", paddingVertical: spacing.xl },
  table: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm, gap: spacing.xs },
  tableRow: { flexDirection: "row", justifyContent: "space-between" },
});
