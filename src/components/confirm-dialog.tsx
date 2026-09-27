import { createContext, use, useCallback, useState, type ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { DuckMascot, type DuckMood } from "@/components/duck-mascot";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  /** Styles the confirm button as destructive (red). */
  destructive?: boolean;
  mood?: DuckMood;
};

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(async () => false);

/** Themed yes/no dialog: `if (await confirm({...})) …`. Resolves false on cancel, back or tap outside. */
export function useConfirm(): Ask {
  return use(ConfirmContext);
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback<Ask>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
      }),
    [],
  );

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ConfirmContext value={ask}>
      {children}
      <Modal
        visible={pending != null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => close(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => close(false)} accessibilityLabel="Cancel">
          {pending && (
            <View
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onStartShouldSetResponder={() => true}
              accessibilityViewIsModal
            >
              <DuckMascot mood={pending.mood ?? (pending.destructive ? "confused" : "reading")} size={72} />
              <AppText variant="title" style={styles.center} accessibilityRole="header">
                {pending.title}
              </AppText>
              <AppText color="muted" style={styles.center}>
                {pending.message}
              </AppText>
              <View style={styles.actions}>
                <View style={styles.flex}>
                  <Button title={pending.cancelText ?? "Cancel"} variant="secondary" onPress={() => close(false)} />
                </View>
                <View style={styles.flex}>
                  <Button
                    title={pending.confirmText}
                    variant={pending.destructive ? "danger" : "primary"}
                    onPress={() => close(true)}
                  />
                </View>
              </View>
            </View>
          )}
        </Pressable>
      </Modal>
    </ConfirmContext>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  card: {
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.card + 6,
    borderWidth: 1,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  center: { textAlign: "center" },
  actions: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch", marginTop: spacing.sm },
  flex: { flex: 1 },
});
