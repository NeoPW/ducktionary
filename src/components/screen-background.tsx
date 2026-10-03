import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { BACKGROUND_TINT, useBackground } from "@/theme/background";
import { useTheme } from "@/theme/use-theme";

/**
 * The user's background picture, under a veil of the background colour so text on it stays readable. Each screen
 * draws its own (native screens can't share one behind them); first child of the screen's root view.
 */
export function ScreenBackground() {
  const { uri, strength } = useBackground();
  const { colors } = useTheme();
  if (!uri) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: BACKGROUND_TINT[strength] }]} />
    </View>
  );
}
