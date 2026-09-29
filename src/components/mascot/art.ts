/**
 * Drawn (raster) mascot art: which characters and image sets exist, how they are named and sized. No React Native
 * imports — shared by the app and the Node scripts.
 *
 * Every image set lives in its own folder under assets/mascots/ (see ART_SETS):
 *   <species>/<mood>.png          e.g. goose/reading.png, duckling/sleepy.png
 *   <look>-peek/<pose>.png        e.g. goose-peek/honk.png, duckling-wings-peek/wave.png (popping up from an edge)
 *   <species>-walk/<frame>.png    e.g. goose-walk/step-1.png (waddling across)
 * then run `npm run mascots` (see docs/mascot-art-brief.md).
 */
export const SPECIES = ["goose", "duckling"] as const;
export type Species = (typeof SPECIES)[number];

/** Full-body moods, used by the mascot on screens, toasts and dialogs. */
export const MOODS = ["reading", "sleepy", "celebrating", "confused", "scanning"] as const;
export type Mood = (typeof MOODS)[number];

/** The poses of a pop-up visit — every pop-up set has these. */
export const PEEK_POSES = ["rest", "honk", "blink", "suspicious", "wink", "steal"] as const;
/** Extra pop-up poses a set may have; the visit only plays the matching act when it does. */
export const OPTIONAL_PEEK_POSES = ["wave"] as const;
export type PeekPose = (typeof PEEK_POSES)[number] | (typeof OPTIONAL_PEEK_POSES)[number];

/**
 * Pop-up looks: each character pops up in its own way, and the duckling has two — paws resting on the edge, or
 * stubby wings flapping at its sides.
 */
export const PEEK_LOOKS = [
  { look: "goose", species: "goose" },
  { look: "duckling", species: "duckling" },
  { look: "duckling-wings", species: "duckling" },
] as const satisfies readonly { look: string; species: Species }[];
export type PeekLook = (typeof PEEK_LOOKS)[number]["look"];

/** The visit waddling across the screen: two steps, alternated. */
export const WALK_FRAMES = ["step-1", "step-2"] as const;
export type WalkFrame = (typeof WALK_FRAMES)[number];

export const ART_SPEC = {
  mascot: { width: 1024, height: 1024 },
  /** Upper body popping up from the bottom edge; the cut is flush with the bottom of the image. */
  peek: { width: 768, height: 768 },
  /** Full body mid-step, feet on the bottom ground line. */
  walk: { width: 768, height: 768 },
  /** Painted, textured art compresses less than flat colour; 1024 px is needed for sharp app icons. */
  maxBytes: 500 * 1024,
} as const;

/** The three kinds of image set: which names they need (and may have) and their frame. */
export const ART_KINDS = [
  { kind: "moods", names: MOODS, optional: [], frame: ART_SPEC.mascot },
  { kind: "peek", names: PEEK_POSES, optional: OPTIONAL_PEEK_POSES, frame: ART_SPEC.peek },
  { kind: "walk", names: WALK_FRAMES, optional: [], frame: ART_SPEC.walk },
] as const;
export type ArtKind = (typeof ART_KINDS)[number]["kind"];
export type ArtKindSpec = (typeof ART_KINDS)[number];

/** One folder of images. `look` keys the image registry: the character's name, or a pop-up look's name. */
export type ArtSet = { folder: string; kind: ArtKindSpec; species: Species; look: string };

const kindSpec = (kind: ArtKind) => ART_KINDS.find((k) => k.kind === kind)!;

/** Every image set, in display order. */
export const ART_SETS: readonly ArtSet[] = [
  ...SPECIES.map((species) => ({ folder: species, kind: kindSpec("moods"), species, look: species })),
  ...PEEK_LOOKS.map(({ look, species }) => ({ folder: `${look}-peek`, kind: kindSpec("peek"), species, look })),
  ...SPECIES.map((species) => ({ folder: `${species}-walk`, kind: kindSpec("walk"), species, look: species })),
];

/** The set stored in a folder under assets/mascots/ (or docs/mascot-art/raw/), or null for an unknown folder. */
export function artSet(folder: string): ArtSet | null {
  return ART_SETS.find((set) => set.folder === folder) ?? null;
}

/** A character's main folder for a kind: "goose", "duckling-peek", "goose-walk", … */
export function artFolder(species: Species, kind: ArtKind): string {
  return ART_SETS.find((set) => set.species === species && set.kind.kind === kind)!.folder;
}
