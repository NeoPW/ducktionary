import { Image } from "expo-image";
import { View } from "react-native";

import type { Mood } from "@/components/mascot/art";
import { castMascots } from "@/components/mascot/cast";
import { MASCOT_IMAGES } from "@/components/mascot/images.generated";

/** Which character plays each mood this app session — decided once, when the app starts. */
const SESSION_CAST = castMascots((species, mood) => MASCOT_IMAGES[species]?.[mood] != null);

/** The app's mascot acting out a mood — a goose or a duckling, whichever this session cast for it. */
export function Mascot({ mood = "reading", size = 120 }: { mood?: Mood; size?: number }) {
  const species = SESSION_CAST[mood];
  const source = MASCOT_IMAGES[species]?.[mood];
  // Every mood is drawn; an empty box keeps layouts stable if one is ever missing.
  if (!source) return <View style={{ width: size, height: size }} />;
  return (
    <Image
      source={source}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={0}
      accessibilityLabel={`Cute ${species}, ${mood}`}
    />
  );
}
