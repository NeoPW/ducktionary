/**
 * Drawn (raster) mascot art: what images exist, how they are named and sized, and how goose-visit
 * poses map onto peek images. No React Native imports — shared by the app and the Node scripts.
 *
 * Drop PNGs into:
 *   assets/mascots/<species>/<mood>.png   e.g. assets/mascots/goose/reading.png
 *   assets/mascots/goose-peek/<pose>.png  e.g. assets/mascots/goose-peek/honk.png
 * then run `npm run mascots` (see docs/mascot-art-brief.md).
 */
import type { GoosePose } from "./shapes";

export const PEEK_POSES = ["rest", "honk", "blink", "suspicious", "wink", "steal"] as const;
export type PeekPose = (typeof PEEK_POSES)[number];

export const PEEK_FOLDER = "goose-peek";

export const ART_SPEC = {
  mascot: { width: 1024, height: 1024 },
  peek: { width: 1200, height: 960 },
  /** Painted, textured art compresses less than flat colour; 1024 px is needed for sharp app icons. */
  maxBytes: 500 * 1024,
} as const;

/** Which drawn head goes with the goose's current pose during a visit. */
export function peekPoseFor(pose: GoosePose): PeekPose {
  if (pose.holdingBook) return "steal";
  if (pose.beakOpen) return "honk";
  if (pose.eye === "closed") return "blink";
  if (pose.eye === "narrow") return "suspicious";
  if (pose.eye === "wink") return "wink";
  return "rest";
}

/** The vector pose used when a peek image hasn't been drawn yet (and for the gallery fallback). */
export const PEEK_FALLBACK: Record<PeekPose, GoosePose> = {
  rest: { eye: "open", look: 1, beakOpen: false, holdingBook: false },
  honk: { eye: "wide", look: 1, beakOpen: true, holdingBook: false },
  blink: { eye: "closed", look: 1, beakOpen: false, holdingBook: false },
  suspicious: { eye: "narrow", look: 1, beakOpen: false, holdingBook: false },
  wink: { eye: "wink", look: 0, beakOpen: false, holdingBook: false },
  steal: { eye: "wide", look: -1, beakOpen: false, holdingBook: true },
};
