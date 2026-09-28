import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Card } from "@/components/card";
import { useConfirm } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { restoredMessage, useBackup } from "@/sync/backup-provider";
import { friendlyError, KEPT_BACKUPS } from "@/sync/cloud";
import { spacing } from "@/theme/tokens";
import { timeAgo } from "@/utils/dates";
import { BOOKS, plural } from "@/utils/format";

/** Settings → "Account & backup" (only when this build has a backup server) and "Backup file". */
export function BackupSection() {
  const backup = useBackup();
  const confirm = useConfirm();
  const toast = useToast();

  const backUpNow = async () => {
    try {
      let result = await backup.backUpNow();
      if (result.kind === "shrunk") {
        const ok = await confirm({
          title: "Back up the smaller library?",
          message: `This phone has ${result.books} books, your last backup has ${result.backedUp}. The older backups stay available for ${KEPT_BACKUPS} more backups.`,
          confirmText: "Back up anyway",
        });
        if (!ok) return;
        result = await backup.backUpNow({ force: true });
      }
      toast(result.kind === "unchanged" ? "Already backed up — nothing changed." : "Backed up.", "celebrating");
    } catch (error) {
      toast(friendlyError(error), "confused");
    }
  };

  const signOut = async () => {
    const ok = await confirm({
      title: "Sign out?",
      message: "Your books stay on this phone, but they won't be backed up until you sign in again.",
      confirmText: "Sign out",
    });
    if (ok) await backup.signOut();
  };

  const exportFile = async () => {
    try {
      const books = await backup.exportFile();
      toast(`Backup file with ${plural(books, BOOKS)} is ready.`, "celebrating");
    } catch (error) {
      toast(friendlyError(error), "confused");
    }
  };

  const importFile = async () => {
    try {
      const snapshot = await backup.pickFile();
      if (!snapshot) return;
      const ok = await confirm({
        title: "This backup file is valid",
        message: `It has ${plural(snapshot.books.length, BOOKS)} and was saved on ${new Date(snapshot.createdAt).toLocaleDateString()}. Restoring replaces the library on this phone with it.`,
        confirmText: "Restore",
        destructive: true,
      });
      if (!ok) return;
      const n = await backup.restoreFromFile(snapshot);
      toast(restoredMessage(n));
    } catch (error) {
      toast(friendlyError(error), "confused");
    }
  };

  return (
    <>
      {backup.configured && (
        <View style={styles.section}>
          <AppText variant="heading">Account & backup</AppText>
          <Card style={styles.card}>
            {backup.email ? (
              <>
                <AppText variant="label">Signed in as {backup.email}</AppText>
                <AppText variant="caption" color={backup.problem ? "danger" : "muted"}>
                  {backup.problem ??
                    (backup.lastBackupAt ? `Last backed up ${timeAgo(backup.lastBackupAt)}` : "Not backed up yet")}
                </AppText>
                <View style={styles.buttons}>
                  <Button title={backup.busy ? "Backing up…" : "Back up now"} onPress={backUpNow} disabled={backup.busy} />
                  <Button title="Restore from a backup…" variant="secondary" onPress={() => router.push("/settings/backups")} />
                  <Button title="Change password" variant="ghost" onPress={() => router.push("/settings/account")} />
                  <Button title="Sign out" variant="ghost" onPress={signOut} />
                </View>
              </>
            ) : (
              <>
                <AppText color="muted">
                  Sign in to back up your library automatically, so a lost phone doesn&apos;t mean lost books.
                </AppText>
                <Button title="Sign in" onPress={() => router.push("/settings/account")} />
              </>
            )}
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <AppText variant="heading">Backup file</AppText>
        <AppText variant="caption" color="muted">
          Save everything as one file — to Google Drive, email or anywhere — and restore it on any phone.
          {backup.configured ? " Works without an account, as a second copy." : ""}
        </AppText>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button title="Export" variant="secondary" onPress={exportFile} disabled={backup.busy} />
          </View>
          <View style={styles.flex}>
            <Button title="Import…" variant="secondary" onPress={importFile} disabled={backup.busy} />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  card: { padding: spacing.lg, gap: spacing.sm },
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
});
