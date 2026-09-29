import { createContext, use, useCallback, useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Mascot } from "@/components/mascot";
import type { Mood } from "@/components/mascot/art";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type Toast = { id: number; text: string; mood: Mood };
type ShowToast = (text: string, mood?: Mood) => void;

const DURATION_MS = 2600;
const ToastContext = createContext<ShowToast>(() => {});

/** Brief duck message at the top of the screen, e.g. after saving a book. */
export function useToast(): ShowToast {
  return use(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast | null>(null);

  const show = useCallback<ShowToast>((text, mood = "celebrating") => {
    setToast({ id: Date.now(), text, mood });
    AccessibilityInfo.announceForAccessibility(text);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext value={show}>
      {children}
      <View pointerEvents="none" style={[styles.host, { top: insets.top + spacing.sm }]}>
        {toast && (
          <Animated.View
            key={toast.id}
            entering={FadeInUp.duration(220)}
            exiting={FadeOutUp.duration(180)}
            style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.accent }]}
          >
            <Mascot mood={toast.mood} size={40} />
            <AppText variant="label" style={styles.text} numberOfLines={2}>
              {toast.text}
            </AppText>
          </Animated.View>
        )}
      </View>
    </ToastContext>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center" },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    maxWidth: 420,
    elevation: 4,
    shadowColor: "#2B2622",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  text: { flexShrink: 1 },
});
