import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { File, Paths } from "expo-file-system";
import { createContext, use, useState, type ReactNode } from "react";

import { readSetting, writeSetting } from "@/storage/settings";

/** How much of the picture shows through the app's background colour. */
export type BackgroundStrength = "faint" | "medium" | "strong";

export const BACKGROUND_STRENGTHS: readonly { value: BackgroundStrength; label: string }[] = [
  { value: "faint", label: "Faint" },
  { value: "medium", label: "Medium" },
  { value: "strong", label: "Strong" },
];

/** Opacity of the background colour laid over the picture, so text stays readable. */
export const BACKGROUND_TINT: Record<BackgroundStrength, number> = { faint: 0.85, medium: 0.7, strong: 0.5 };

/** Longest side of the stored picture — plenty for a phone screen, and quick to draw on every screen. */
const MAX_SIDE = 1440;

/**
 * Device-only (not in SETTING_KEYS, so not in backups): a photo is large, and it belongs to this phone. Only the
 * file name is stored — the app's folder can move between updates on iOS.
 */
const KEY = "appearance.background.v1";
type Stored = { file: string | null; strength: BackgroundStrength };

function load(): Stored {
  try {
    const raw = JSON.parse(readSetting(KEY) ?? "null") as Partial<Stored> | null;
    const strength = BACKGROUND_STRENGTHS.some((s) => s.value === raw?.strength) ? raw!.strength! : "medium";
    const file = typeof raw?.file === "string" && new File(Paths.document, raw.file).exists ? raw.file : null;
    return { file, strength };
  } catch {
    return { file: null, strength: "medium" };
  }
}

type BackgroundContextValue = {
  /** The picture to draw behind every screen, or null for the plain background colour. */
  uri: string | null;
  strength: BackgroundStrength;
  setStrength: (strength: BackgroundStrength) => void;
  /** Lets the user pick a photo; resolves false when they cancelled. */
  choose: () => Promise<boolean>;
  remove: () => void;
};

const BackgroundContext = createContext<BackgroundContextValue>({
  uri: null,
  strength: "medium",
  setStrength: () => {},
  choose: async () => false,
  remove: () => {},
});

export function useBackground(): BackgroundContextValue {
  return use(BackgroundContext);
}

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored>(load);

  const save = (next: Stored) => {
    setStored(next);
    writeSetting(KEY, JSON.stringify(next));
  };
  const deleteFile = (name: string | null) => {
    if (!name) return;
    try {
      new File(Paths.document, name).delete();
    } catch {
      // Already gone.
    }
  };

  const choose = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return false;

    const scale = Math.min(1, MAX_SIDE / Math.max(asset.width, asset.height));
    const context = ImageManipulator.manipulate(asset.uri).resize({
      width: Math.round(asset.width * scale),
      height: Math.round(asset.height * scale),
    });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      // A new name each time, so cached images of the old picture are never shown again.
      const name = `background-${Date.now()}.jpg`;
      new File(saved.uri).move(new File(Paths.document, name));
      deleteFile(stored.file);
      save({ ...stored, file: name });
      return true;
    } finally {
      image.release();
      context.release();
    }
  };

  const value: BackgroundContextValue = {
    uri: stored.file ? new File(Paths.document, stored.file).uri : null,
    strength: stored.strength,
    setStrength: (strength) => save({ ...stored, strength }),
    choose,
    remove: () => {
      deleteFile(stored.file);
      save({ ...stored, file: null });
    },
  };

  return <BackgroundContext value={value}>{children}</BackgroundContext>;
}
