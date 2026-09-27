import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/app-text";
import type { Slice, SliceColor } from "@/stats/compute";
import { fonts, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { formatCount } from "@/utils/format";

const SIZE = 180;
const OUTER = SIZE / 2;
const INNER = OUTER * 0.58;
const GAP = 2; // surface-coloured spacer between slices

type PieChartProps = {
  slices: Slice[];
  unit: { one: string; many: string };
  accessibilityLabel: string;
};

/**
 * Donut with the total in the middle and a legend that doubles as the value table — identity is
 * never carried by colour alone.
 */
export function PieChart({ slices, unit, accessibilityLabel }: PieChartProps) {
  const { colors, charts } = useTheme();
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  const fill = (color: SliceColor) =>
    color.kind === "categorical"
      ? charts.categorical[color.index]
      : color.kind === "ordinal"
        ? charts.ordinal[color.step]
        : colors.muted;

  const arcs = toArcs(slices, total);

  return (
    <View style={styles.container}>
      <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
        <Svg width={SIZE} height={SIZE}>
          {arcs.length === 1 ? (
            <Circle
              cx={OUTER}
              cy={OUTER}
              r={(OUTER + INNER) / 2}
              stroke={fill(arcs[0].slice.color)}
              strokeWidth={OUTER - INNER}
              fill="none"
            />
          ) : (
            arcs.map(({ slice, start, end }) => (
              <Path
                key={slice.key}
                d={donutSlice(start, end)}
                fill={fill(slice.color)}
                stroke={colors.surface}
                strokeWidth={GAP}
                strokeLinejoin="round"
              />
            ))
          )}
          <SvgText
            x={OUTER}
            y={OUTER + 4}
            fontSize={26}
            fontFamily={fonts.sansBold}
            fill={colors.text}
            textAnchor="middle"
          >
            {formatCount(total)}
          </SvgText>
          <SvgText x={OUTER} y={OUTER + 22} fontSize={11} fontFamily={fonts.sans} fill={colors.muted} textAnchor="middle">
            {total === 1 ? unit.one : unit.many}
          </SvgText>
        </Svg>
      </View>

      <View style={styles.legend}>
        {slices.map((slice) => (
          <View key={slice.key} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: fill(slice.color) }]} />
            <AppText variant="label" numberOfLines={1} style={styles.legendLabel}>
              {slice.label}
            </AppText>
            <AppText variant="label">{slice.value.toLocaleString()}</AppText>
            <AppText variant="caption" color="muted" style={styles.percent}>
              {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : ""}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Start/end angles per slice, clockwise from 12 o'clock. */
function toArcs(slices: Slice[], total: number) {
  const arcs: { slice: Slice; start: number; end: number }[] = [];
  let angle = -Math.PI / 2;
  for (const slice of slices) {
    const sweep = total > 0 ? (slice.value / total) * Math.PI * 2 : 0;
    arcs.push({ slice, start: angle, end: angle + sweep });
    angle += sweep;
  }
  return arcs;
}

function donutSlice(start: number, end: number): string {
  const large = end - start > Math.PI ? 1 : 0;
  const point = (r: number, a: number) => `${OUTER + r * Math.cos(a)},${OUTER + r * Math.sin(a)}`;
  return [
    `M${point(OUTER, start)}`,
    `A${OUTER},${OUTER} 0 ${large} 1 ${point(OUTER, end)}`,
    `L${point(INNER, end)}`,
    `A${INNER},${INNER} 0 ${large} 0 ${point(INNER, start)}`,
    "Z",
  ].join(" ");
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: spacing.md },
  legend: { alignSelf: "stretch", gap: spacing.xs },
  legendRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { flex: 1 },
  percent: { width: 40, textAlign: "right" },
});
