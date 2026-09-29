/**
 * Drawn (raster) mascot art: what images exist, how they are named and sized. No React Native imports —
 * shared by the app and the Node scripts.
 *
 * Drop PNGs into:
 *   assets/mascots/goose/<mood>.png        e.g. assets/mascots/goose/reading.png
 *   assets/mascots/goose-peek/<pose>.png  e.g. assets/mascots/goose-peek/honk.png (popping up from the bottom)
 *   assets/mascots/goose-walk/<frame>.png e.g. assets/mascots/goose-walk/step-1.png (waddling across)
 * then run `npm run mascots` (see docs/mascot-art-brief.md).
 */
/** The goose's full-body moods, used by the mascot everywhere in the app. */
export const MOODS = ["reading", "sleepy", "celebrating", "confused", "scanning"] as const;
export type Mood = (typeof MOODS)[number];

export const MOOD_FOLDER = "goose";

export const PEEK_POSES = ["rest", "honk", "blink", "suspicious", "wink", "steal"] as const;
export type PeekPose = (typeof PEEK_POSES)[number];

export const PEEK_FOLDER = "goose-peek";

/** The goose waddling across the screen: two steps, alternated. */
export const WALK_FRAMES = ["step-1", "step-2"] as const;
export type WalkFrame = (typeof WALK_FRAMES)[number];

export const WALK_FOLDER = "goose-walk";

export const ART_SPEC = {
  mascot: { width: 1024, height: 1024 },
  /** Upper body popping up from the bottom edge; the cut is flush with the bottom of the image. */
  peek: { width: 768, height: 768 },
  /** Full body mid-step, feet on the bottom ground line. */
  walk: { width: 768, height: 768 },
  /** Painted, textured art compresses less than flat colour; 1024 px is needed for sharp app icons. */
  maxBytes: 500 * 1024,
} as const;
