import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { AppText } from "@/components/app-text";
import type { Bar } from "@/stats/compute";
import { niceTicks } from "@/stats/ticks";
import { fonts, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { formatCount } from "@/utils/format";

const PLOT_HEIGHT = 150;
const TOP_PAD = 20; // room for the value label above the tallest bar
const AXIS_WIDTH = 32;
const LABEL_HEIGHT = 20;
const MAX_BAR_WIDTH = 24;
const MIN_LABEL_SPACING = 42;

type CartesianChartProps = {
  bars: Bar[];
  variant: "bar" | "line";
  unit: { one: string; many: string };
  accessibilityLabel: string;
};

/**
 * Single-series column or line chart on one shared axis. The peak is labelled by default; tapping
 * a column/point moves the label there and names it underneath, so values never depend on hover.
 */
export function CartesianChart({ bars, variant, unit, accessibilityLabel }: CartesianChartProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const max = Math.max(0, ...bars.map((b) => b.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const peak = max > 0 ? bars.findIndex((b) => b.value === max) : -1;
  const selected = bars.findIndex((b) => b.key === selectedKey);
  const active = selected >= 0 ? selected : peak;

  const plotWidth = Math.max(0, width - AXIS_WIDTH);
  const slot = bars.length ? plotWidth / bars.length : 0;
  const barWidth = Math.max(2, Math.min(MAX_BAR_WIDTH, slot * 0.7, slot - 2));
  const labelEvery = Math.max(1, Math.ceil(MIN_LABEL_SPACING / Math.max(slot, 1)));
  const baseline = TOP_PAD + PLOT_HEIGHT;
  const y = (value: number) => baseline - (value / top) * PLOT_HEIGHT;
  const cx = (i: number) => AXIS_WIDTH + i * slot + slot / 2;
  const points = bars.map((bar, i) => ({ x: cx(i), y: y(bar.value) }));
  // Markers on every point only while they stay uncluttered; otherwise just the active one.
  const allMarkers = bars.length <= 12;

  const activeBar = active >= 0 ? bars[active] : null;

  return (
    <View>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        {width > 0 && (
          <Svg width={width} height={baseline + LABEL_HEIGHT}>
            {ticks.map((tick) => (
              <Line
                key={`grid-${tick}`}
                x1={AXIS_WIDTH}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                stroke={colors.border}
                strokeWidth={StyleSheet.hairlineWidth}
              />
            ))}
            {ticks.map((tick) => (
              <SvgText
                key={`tick-${tick}`}
                x={AXIS_WIDTH - 6}
                y={y(tick) + 4}
                fontSize={10}
                fontFamily={fonts.sans}
                fill={colors.muted}
                textAnchor="end"
              >
                {formatCount(tick)}
              </SvgText>
            ))}

            {variant === "bar" &&
              bars.map((bar, i) => {
                if (bar.value <= 0) return null;
                const x = AXIS_WIDTH + i * slot + (slot - barWidth) / 2;
                return <Path key={bar.key} d={columnPath(x, y(bar.value), barWidth, baseline)} fill={colors.chart} />;
              })}

            {variant === "line" && points.length > 0 && (
              <>
                <Path d={areaPath(points, baseline)} fill={colors.chart} fillOpacity={0.1} />
                <Path
                  d={linePath(points)}
                  stroke={colors.chart}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  fill="none"
                />
                {points.map((p, i) =>
                  allMarkers || i === active ? (
                    <Circle
                      key={`dot-${bars[i].key}`}
                      cx={p.x}
                      cy={p.y}
                      r={i === active ? 5 : 4}
                      fill={colors.chart}
                      stroke={colors.surface}
                      strokeWidth={2}
                    />
                  ) : null,
                )}
              </>
            )}

            {activeBar && (activeBar.value > 0 || variant === "line") && (
              <SvgText
                x={cx(active)}
                y={y(activeBar.value) - (variant === "line" ? 10 : 6)}
                fontSize={11}
                fontFamily={fonts.sansBold}
                fill={colors.text}
                textAnchor="middle"
              >
                {formatCount(activeBar.value)}
              </SvgText>
            )}

            {bars.map((bar, i) =>
              i % labelEvery === 0 || i === active ? (
                <SvgText
                  key={`label-${bar.key}`}
                  x={cx(i)}
                  y={baseline + 14}
                  fontSize={10}
                  fontFamily={i === active ? fonts.sansBold : fonts.sans}
                  fill={i === active ? colors.text : colors.muted}
                  textAnchor="middle"
                >
                  {bar.label}
                </SvgText>
              ) : null,
            )}
          </Svg>
        )}

        {/* Tap targets: the full column slot, much bigger than the bar itself. */}
        <View style={[StyleSheet.absoluteFill, styles.hitRow, { left: AXIS_WIDTH }]}>
          {bars.map((bar) => (
            <Pressable
              key={bar.key}
              style={styles.hit}
              accessibilityLabel={`${bar.label}: ${bar.value} ${bar.value === 1 ? unit.one : unit.many}`}
              onPress={() => setSelectedKey(bar.key)}
            />
          ))}
        </View>
      </View>

      <AppText variant="caption" color="muted" style={styles.detail}>
        {activeBar
          ? `${activeBar.label}: ${activeBar.value.toLocaleString()} ${activeBar.value === 1 ? unit.one : unit.many}`
          : "Nothing to show yet."}
        {activeBar && selected < 0 ? ` (highest) · tap a ${variant === "bar" ? "column" : "point"} for others` : ""}
      </AppText>
    </View>
  );
}

type Point = { x: number; y: number };

function linePath(points: Point[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
}

function areaPath(points: Point[], baseline: number) {
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x},${baseline} L${first.x},${baseline} Z`;
}

/** Column with 4px rounded data-end and a square baseline. */
function columnPath(x: number, top: number, width: number, baseline: number) {
  const r = Math.min(4, width / 2, baseline - top);
  return [
    `M${x},${baseline}`,
    `V${top + r}`,
    `Q${x},${top} ${x + r},${top}`,
    `H${x + width - r}`,
    `Q${x + width},${top} ${x + width},${top + r}`,
    `V${baseline}`,
    "Z",
  ].join(" ");
}

const styles = StyleSheet.create({
  hitRow: { flexDirection: "row", bottom: 0 },
  hit: { flex: 1 },
  detail: { marginTop: spacing.xs },
});
