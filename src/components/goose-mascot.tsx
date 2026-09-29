import { Image } from "expo-image";
import { View } from "react-native";

import type { Mood } from "@/components/mascot/art";
import { MASCOT_IMAGES } from "@/components/mascot/images.generated";

/** The app's mascot: the drawn white goose acting out a mood (assets/mascots/goose/). */
export function GooseMascot({ mood = "reading", size = 120 }: { mood?: Mood; size?: number }) {
  const source = MASCOT_IMAGES[mood];
  // Every mood is drawn; an empty box keeps layouts stable if one is ever missing.
  if (!source) return <View style={{ width: size, height: size }} />;
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={0}
      accessibilityLabel={`Cute goose, ${mood}`}
    />
  );
}
