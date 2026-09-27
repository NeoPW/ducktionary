import { useId, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "@/theme/use-theme";

const TRACK_HEIGHT = 22;
const THUMB = 28;

type GradientSliderProps = {
  /** 0–1 */
  value: number;
  onChange: (value: number) => void;
  /** Colours along the track, left to right. */
  stops: string[];
  label: string;
  valueText: string;
};

/** Drag (or tap) along a gradient track. Adjustable for screen readers in 5% steps. */
export function GradientSlider({ value, onChange, stops, label, valueText }: GradientSliderProps) {
  const { colors } = useTheme();
  const gradientId = `g${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const track = useRef<View>(null);
  const bounds = useRef({ x: 0, width: 1 });
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const fromPageX = (pageX: number) => onChange(clamp((pageX - bounds.current.x) / bounds.current.width));

  return (
    <View
      ref={track}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(e) => onChange(clamp(value + (e.nativeEvent.actionName === "increment" ? 0.05 : -0.05)))}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        const { pageX } = e.nativeEvent;
        track.current?.measureInWindow((x, _y, width) => {
          bounds.current = { x, width: Math.max(1, width) };
          fromPageX(pageX);
        });
      }}
      onResponderMove={(e) => fromPageX(e.nativeEvent.pageX)}
      style={styles.container}
    >
      <Svg width="100%" height={TRACK_HEIGHT}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            {stops.map((color, i) => (
              <Stop key={i} offset={stops.length === 1 ? 0 : i / (stops.length - 1)} stopColor={color} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={TRACK_HEIGHT} rx={TRACK_HEIGHT / 2} fill={`url(#${gradientId})`} />
      </Svg>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { left: `${value * 100}%`, borderColor: colors.surface, shadowColor: colors.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: THUMB, justifyContent: "center", marginHorizontal: THUMB / 2 },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    marginLeft: -THUMB / 2,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    backgroundColor: "transparent",
    elevation: 3,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
