import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { GooseMascot } from "@/components/goose-mascot";
import type { Mood } from "@/components/mascot/art";
import { Screen } from "@/components/screen";
import { spacing } from "@/theme/tokens";

type EmptyStateProps = {
  mood: Mood;
  title: string;
  message?: string;
  action?: ReactNode;
};

export function EmptyState({ mood, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <GooseMascot mood={mood} size={140} />
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

/** A whole screen showing just an empty state, centred — for "nothing here", errors and not-found. */
export function EmptyScreen(props: EmptyStateProps) {
  return (
    <Screen contentStyle={styles.screen}>
      <EmptyState {...props} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: "center" },
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  center: { textAlign: "center" },
});
