import { StyleSheet, View, type ViewProps } from "react-native";

import { radii } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

/** The raised surface used for grouped content. Padding and layout come from `style`. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors } = useTheme();
  return <View {...rest} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.card, borderWidth: 1 },
});
