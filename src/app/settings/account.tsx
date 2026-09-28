import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { DuckMascot } from "@/components/duck-mascot";
import { TextField } from "@/components/form/text-field";
import { Screen } from "@/components/screen";
import { useToast } from "@/components/toast";
import { friendlyError, useBackup } from "@/sync/backup-provider";
import { spacing } from "@/theme/tokens";

/** Sign in (signed out) or change the password (signed in). */
export default function AccountScreen() {
  const backup = useBackup();
  return backup.email ? <ChangePassword /> : <SignIn />;
}

function SignIn() {
  const backup = useBackup();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await backup.signIn(email, password);
      toast("Signed in — your library is backed up from now on.", "celebrating");
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <DuckMascot species="goose" mood="scanning" size={88} />
        <AppText color="muted" style={styles.flex}>
          Sign in to back up your library automatically and restore it on a new phone.
        </AppText>
      </View>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="username"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
        error={error}
      />
      <Button
        title={backup.busy ? "Signing in…" : "Sign in"}
        onPress={submit}
        disabled={backup.busy || !email.trim() || !password}
      />
      <AppText variant="caption" color="muted">
        There is no sign-up: accounts are created by whoever runs this app&apos;s backup server. Ask them for yours.
      </AppText>
    </Screen>
  );
}

function ChangePassword() {
  const backup = useBackup();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (password.length < 10) return setError("Use at least 10 characters.");
    if (password !== repeat) return setError("The two passwords don't match.");
    try {
      await backup.changePassword(password);
      toast("Password changed.", "celebrating");
      router.back();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <Screen>
      <AppText color="muted">Signed in as {backup.email}</AppText>
      <TextField
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Repeat new password"
        value={repeat}
        onChangeText={setRepeat}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
        error={error}
      />
      <Button title={backup.busy ? "Saving…" : "Change password"} onPress={submit} disabled={backup.busy || !password} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
});
