import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { findByIsbn } from "@/api/book-lookup";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { EmptyScreen } from "@/components/empty-state";
import { Mascot } from "@/components/mascot";
import { radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { BookDraft } from "@/types";
import { blankDraft } from "@/utils/book-draft";
import { confirmBookHref } from "@/utils/confirm-route";
import { todayIso } from "@/utils/dates";
import { toError } from "@/utils/errors";
import { normalizeIsbn } from "@/utils/isbn";

type Phase =
  | { kind: "scanning" }
  | { kind: "looking-up"; isbn: string }
  | { kind: "error"; isbn: string; message: string };

const WHITE = "#FFFFFF";
const INVALID_HINT_MS = 2500;

/** Leaves the scanner and opens the confirm form in the Add tab. */
function continueWith(draft: BookDraft, notFound = false) {
  router.dismiss();
  router.navigate(confirmBookHref(draft, { notFound }));
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <EmptyScreen
        mood="scanning"
        title="Let the goose see"
        message="Ducktionary needs the camera to read the barcode on the back of your book. Photos are never taken or stored."
        action={
          <>
            {permission.canAskAgain ? (
              <Button title="Allow camera" onPress={requestPermission} />
            ) : (
              <Button title="Open settings" onPress={() => Linking.openSettings()} />
            )}
            <Button title="Not now" variant="ghost" onPress={() => router.dismiss()} />
          </>
        }
      />
    );
  }

  return <Scanner />;
}

function Scanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [phase, setPhase] = useState<Phase>({ kind: "scanning" });
  const [torch, setTorch] = useState(false);
  const [invalidHint, setInvalidHint] = useState(false);
  // The camera fires many events per second for the same code; only handle the first one.
  const busy = useRef(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  const lookup = async (isbn: string) => {
    setPhase({ kind: "looking-up", isbn });
    try {
      const found = await findByIsbn(isbn);
      if (found) continueWith(found.draft);
      else continueWith(blankDraft(todayIso(), { isbn }), true);
    } catch (error) {
      setPhase({ kind: "error", isbn, message: toError(error).message });
    }
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (busy.current) return;
    const isbn = normalizeIsbn(data);
    if (!isbn) {
      // E.g. a price barcode — nudge towards the ISBN one, without spamming re-renders.
      if (!hintTimer.current) {
        setInvalidHint(true);
        hintTimer.current = setTimeout(() => {
          setInvalidHint(false);
          hintTimer.current = null;
        }, INVALID_HINT_MS);
      }
      return;
    }
    busy.current = true;
    lookup(isbn);
  };

  const scanAgain = () => {
    busy.current = false;
    setPhase({ kind: "scanning" });
  };

  const frameWidth = Math.min(width * 0.8, 360);
  const frameHeight = frameWidth * 0.5;

  return (
    <View style={styles.black}>
      <StatusBar style="light" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ["ean13"] }}
        onBarcodeScanned={phase.kind === "scanning" ? onScanned : undefined}
      />

      {/* Overlay */}
      <View style={[StyleSheet.absoluteFill, styles.overlay]} pointerEvents="box-none">
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <RoundButton label="Close scanner" onPress={() => router.dismiss()}>
            ✕
          </RoundButton>
          <RoundButton label={torch ? "Turn light off" : "Turn light on"} onPress={() => setTorch((t) => !t)} active={torch}>
            {torch ? "Light on" : "Light"}
          </RoundButton>
        </View>

        <View style={styles.middle} pointerEvents="none">
          <View style={[styles.duck, { width: frameWidth }]}>
            <Mascot mood="scanning" size={72} />
          </View>
          <View
            style={[
              styles.frame,
              { width: frameWidth, height: frameHeight, borderColor: invalidHint ? colors.danger : colors.accent },
            ]}
          />
          <AppText style={styles.hint}>
            {invalidHint
              ? "That's not a book barcode. Look for the one starting with 978 or 979."
              : "Point at the barcode on the back cover"}
          </AppText>
        </View>

        <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + spacing.lg }]}>
          {phase.kind === "looking-up" && (
            <View style={styles.status}>
              <ActivityIndicator color={WHITE} />
              <AppText style={styles.statusText}>Looking up ISBN {phase.isbn}…</AppText>
            </View>
          )}
          {phase.kind === "error" && (
            <View style={styles.errorCard}>
              <AppText variant="heading" style={styles.statusText}>
                Couldn&apos;t look it up
              </AppText>
              <AppText style={styles.statusText}>{phase.message}</AppText>
              <Button title="Try again" onPress={() => lookup(phase.isbn)} />
              <Button
                title="Enter details manually"
                variant="secondary"
                onPress={() => continueWith(blankDraft(todayIso(), { isbn: phase.isbn }))}
              />
              <Button title="Scan another" variant="ghost" onPress={scanAgain} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  active,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  children: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={[styles.roundButton, active && { backgroundColor: colors.accent }]}
    >
      <AppText variant="label" style={{ color: active ? colors.text : WHITE }}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: "#000000" },
  overlay: { justifyContent: "space-between" },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  roundButton: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  middle: { alignItems: "center", gap: spacing.md },
  duck: { alignItems: "flex-end", marginBottom: -30, paddingRight: spacing.lg, zIndex: 1 },
  frame: { borderWidth: 3, borderRadius: radii.card },
  hint: {
    color: WHITE,
    textAlign: "center",
    paddingHorizontal: spacing.xl,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 4,
  },
  bottomPanel: { paddingHorizontal: spacing.lg, minHeight: 120, justifyContent: "flex-end" },
  status: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  statusText: { color: WHITE, textAlign: "center" },
  errorCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
});
