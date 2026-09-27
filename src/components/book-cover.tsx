import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { fonts, radii, spacing } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

type BookCoverProps = {
  title: string;
  coverUrl: string | null;
  width: number;
};

/** 2:3 book cover. Falls back to a typeset title card when there is no usable image. */
export function BookCover({ title, coverUrl, width }: BookCoverProps) {
  const { colors } = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const height = width * 1.5;
  const showImage = coverUrl != null && failedUrl !== coverUrl;

  return (
    <View
      style={[
        styles.frame,
        { width, height, backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {showImage ? (
        <Image
          source={coverUrl}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          cachePolicy="disk"
          recyclingKey={coverUrl}
          accessibilityLabel={`Cover of ${title}`}
          onError={() => setFailedUrl(coverUrl)}
          // Open Library answers missing covers with a 1×1 placeholder instead of a 404.
          onLoad={(event) => {
            if (event.source.width < 10) setFailedUrl(coverUrl);
          }}
        />
      ) : (
        <View style={[styles.placeholder, { borderColor: colors.accent }]}>
          <AppText
            numberOfLines={5}
            style={[styles.placeholderTitle, { fontSize: Math.max(11, width / 8), lineHeight: Math.max(14, width / 6) }]}
          >
            {title}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.cover,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#2B2622",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  placeholder: {
    flex: 1,
    margin: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.cover - 2,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  placeholderTitle: { fontFamily: fonts.serif, textAlign: "center" },
});
