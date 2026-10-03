import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

const STAR_PATH =
  "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z";

/**
 * Where to cut the filled layer (share of the width) so that a quarter star fills a quarter of the star's area.
 * Cutting at a quarter of the width would only show the tip of the left point (and ¾ would look full): a quarter
 * star now fills the whole left point, three quarters leave the right point empty.
 */
const FILL_EDGE: Record<number, number> = { 0.25: 0.383, 0.5: 0.5, 0.75: 0.617 };

type StarRatingProps = {
  /** ¼–5 in quarter steps; null renders five empty stars. */
  rating: number | null;
  size?: number;
};

export function StarRating({ rating, size = 16 }: StarRatingProps) {
  const value = rating ?? 0;
  return (
    <View
      style={styles.row}
      accessibilityRole="image"
      accessibilityLabel={rating == null ? "Not rated" : `${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={size} fill={Math.max(0, Math.min(1, value - (star - 1)))} />
      ))}
    </View>
  );
}

/**
 * One star; `fill` is 0–1 (in quarters). The filled layer is clipped by its container's width; the empty part is
 * lightly tinted so the edge between them stays visible even on small stars.
 */
export function Star({ size, fill }: { size: number; fill: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" style={StyleSheet.absoluteFill}>
        <Path
          d={STAR_PATH}
          fill={colors.star}
          fillOpacity={0.2}
          stroke={colors.star}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      </Svg>
      {fill > 0 && (
        <View style={[styles.clip, { width: size * (FILL_EDGE[fill] ?? fill), height: size }]}>
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d={STAR_PATH} fill={colors.star} stroke={colors.star} strokeWidth={1.6} strokeLinejoin="round" />
          </Svg>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
  clip: { position: "absolute", left: 0, top: 0, overflow: "hidden" },
});
