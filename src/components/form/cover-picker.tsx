import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/app-text";
import { BookCover } from "@/components/book-cover";
import { useToast } from "@/components/toast";
import { useTheme } from "@/theme/use-theme";
import { coverCrop, isOwnCover, OWN_COVER_WIDTH } from "@/utils/cover";
import { toError } from "@/utils/errors";

// Material Icons "photo_camera" (Apache 2.0).
const CAMERA_ICON =
  "M12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z";

type CoverPickerProps = {
  title: string;
  coverUrl: string | null;
  /** The cover the form opened with, offered back after choosing a photo. */
  originalUrl: string | null;
  onChange: (coverUrl: string | null) => void;
  width: number;
};

/** The cover in the book form: tap it to use a photo from the device instead. */
export function CoverPicker({ title, coverUrl, originalUrl, onChange, width }: CoverPickerProps) {
  const { colors } = useTheme();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      // The crop screen only takes an aspect ratio on Android; everywhere else the photo is cropped to 2:3 below.
      allowsEditing: Platform.OS === "android",
      aspect: [2, 3],
      quality: 1,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setBusy(true);
    try {
      onChange(await toCover(asset.uri, asset.width, asset.height));
    } catch (error) {
      toast(`Couldn't use that photo: ${toError(error).message}`, "confused");
    } finally {
      setBusy(false);
    }
  };

  const own = isOwnCover(coverUrl);
  const undo = own ? (isOwnCover(originalUrl) ? null : originalUrl) : undefined;

  return (
    <View style={styles.column}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change cover"
        accessibilityHint="Choose a photo from your device"
        disabled={busy}
        onPress={pick}
      >
        <BookCover title={title} coverUrl={coverUrl} width={width} />
        <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.background }]}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d={CAMERA_ICON} fill={colors.onPrimary} />
            </Svg>
          )}
        </View>
      </Pressable>
      {undo !== undefined && (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => onChange(undo)}>
          <AppText variant="caption" color="primary" style={styles.undo}>
            {undo ? "Use original" : "Remove photo"}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

/** Crops a photo to 2:3, scales it down and returns it as a JPEG data URI. */
async function toCover(uri: string, width: number, height: number): Promise<string> {
  const crop = coverCrop(width, height);
  const context = ImageManipulator.manipulate(uri)
    .crop(crop)
    .resize({ width: Math.min(OWN_COVER_WIDTH, crop.width), height: null });
  const image = await context.renderAsync();
  try {
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    if (!saved.base64) throw new Error("the image couldn't be read");
    return `data:image/jpeg;base64,${saved.base64}`;
  } finally {
    image.release();
    context.release();
  }
}

const styles = StyleSheet.create({
  column: { alignItems: "center", gap: 6 },
  badge: {
    position: "absolute",
    right: -6,
    bottom: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  undo: { textAlign: "center" },
});
