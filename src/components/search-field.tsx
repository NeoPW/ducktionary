import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { radii, spacing, typography } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type SearchFieldProps = Omit<TextInputProps, "value" | "onChangeText" | "style"> & {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchField({ value, onChangeText, editable = true, ...rest }: SearchFieldProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: editable ? 1 : 0.6 },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={10.5} cy={10.5} r={6.5} stroke={colors.muted} strokeWidth={2} fill="none" />
        <Path d="M15.5 15.5 L20.5 20.5" stroke={colors.muted} strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholderTextColor={colors.muted}
        selectionColor={colors.primary}
        cursorColor={colors.primary}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, typography.body, { color: colors.text }]}
        {...rest}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={12}
          onPress={() => onChangeText("")}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={10} fill={colors.muted} />
            <Path
              d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5"
              stroke={colors.surface}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: spacing.sm },
});
