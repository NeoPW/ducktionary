import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { DuckMascot, type DuckMood } from "@/components/duck-mascot";
import { spacing } from "@/theme/tokens";

type EmptyStateProps = {
  mood: DuckMood;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({ mood, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <DuckMascot mood={mood} size={140} />
      <AppText variant="title" style={styles.center}>
        {title}
      </AppText>
      {message ? (
        <AppText color="muted" style={styles.center}>
          {message}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  center: { textAlign: "center" },
});
