import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { useConfirm } from "@/components/confirm-dialog";
import { EmptyScreen } from "@/components/empty-state";
import { LoadingScreen, Screen, useBottomInset } from "@/components/screen";
import { useToast } from "@/components/toast";
import { useFocusLoader } from "@/hooks/use-focus-loader";
import { restoredMessage, useBackup } from "@/sync/backup-provider";
import { friendlyError, KEPT_BACKUPS, listCloudBackups, type BackupInfo } from "@/sync/cloud";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { timeAgo } from "@/utils/dates";
import { BOOKS, plural } from "@/utils/format";

/** The kept cloud backups; pick one to replace the library with it. */
export default function BackupsScreen() {
  const backup = useBackup();
  const { colors } = useTheme();
  const confirm = useConfirm();
  const toast = useToast();
  const backups = useFocusLoader(listCloudBackups);
  const bottomInset = useBottomInset();

  const restore = async (item: BackupInfo) => {
    const ok = await confirm({
      title: "Restore this backup?",
      message: `Your library will be replaced by the ${item.bookCount} books from ${new Date(item.createdAt).toLocaleString()}. Your colours and settings come back too.`,
      confirmText: "Restore",
      destructive: true,
    });
    if (!ok) return;
    try {
      const n = await backup.restoreBackup(item.id);
      toast(restoredMessage(n));
      router.back();
    } catch (error) {
      toast(friendlyError(error), "confused");
    }
  };

  if (backups.status === "loading") return <LoadingScreen />;
  if (backups.status === "error") {
    return (
      <EmptyScreen mood="confused" title="Couldn't load your backups" message={friendlyError(backups.error)} />
    );
  }
  if (backups.data.length === 0) {
    return (
      <EmptyScreen mood="sleepy" title="No backups yet" message="Your first backup happens automatically a minute after you change your library." />
    );
  }

  return (
    <Screen scroll={false}>
      <FlatList
        data={backups.data}
        keyExtractor={(item) => String(item.id)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, { paddingBottom: spacing.lg + bottomInset }]}
        ListHeaderComponent={
          <AppText variant="caption" color="muted">
            The newest {KEPT_BACKUPS} backups are kept. Restoring replaces the books on this phone.
          </AppText>
        }
        renderItem={({ item, index }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Backup from ${new Date(item.createdAt).toLocaleString()}, ${item.bookCount} books`}
            android_ripple={{ color: colors.border }}
            disabled={backup.busy}
            onPress={() => restore(item)}
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.flex}>
              <AppText variant="label">
                {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                {index === 0 ? "  · newest" : ""}
              </AppText>
              <AppText variant="caption" color="muted">
                {timeAgo(item.createdAt)} · app {item.appVersion}
              </AppText>
            </View>
            <AppText variant="label" color="muted">
              {plural(item.bookCount, BOOKS)}
            </AppText>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    overflow: "hidden",
  },
  flex: { flex: 1, gap: 2 },
});
