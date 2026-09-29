/**
 * The prompts for every drawn mascot image — the one place they live. `npm run mascots:generate`
 * sends them to the image API; its dry run prints them for pasting into ChatGPT or Gemini by hand.
 */
import {
  MOOD_FOLDER,
  MOODS,
  PEEK_FOLDER,
  PEEK_POSES,
  WALK_FOLDER,
  WALK_FRAMES,
  type Mood,
  type PeekPose,
  type WalkFrame,
} from "../src/components/mascot/art.ts";

export const STYLE =
  "Cute chubby white domestic goose, soft kawaii illustration, thin warm-brown hand-drawn outline, soft pastel " +
  "airbrushed shading, cream-white feathers with a warm shadow underneath, a flat orange bill with a small knob at " +
  "its base, tiny black dot eyes, rosy pink blush on the cheeks, short orange legs with little webbed feet, a few " +
  "tiny yellow emphasis strokes near the head, die-cut sticker look with a thin white border, isolated, plain " +
  "transparent background, centered. Everything, including small extras like sparkles, sits inside one continuous " +
  "white sticker border — nothing floats separately.";

export const AVOID =
  "Avoid: text, letters, watermark, signature, scenery, ground, realistic feathers, heavy black shadows, gradient " +
  "background, frames, checkerboard pattern.";

/** Sent first whenever reference images are attached — this is what keeps the set consistent. */
export const SAME_CHARACTER =
  "Draw exactly the same goose character as in the reference images: identical body proportions, head shape, bill, " +
  "eye size and spacing, blush, outline colour and thickness, shading and sticker border. Only the pose and " +
  "expression change. Ignore any checkerboard or background in the references.";

export type Target = {
  /** "goose/sleepy" or "goose-peek/honk" — also the path under docs/mascot-art/raw/. */
  id: string;
  folder: string;
  name: string;
  prompt: string;
  /** Output size requested from the generator (the process script frames it afterwards). */
  size: "1024x1536" | "1536x1024" | "1024x1024";
  /** Design explorations: generated and compared, but never accepted into the app pipeline. */
  exploratory?: boolean;
};

const MOOD_PROMPTS: Record<Mood, string> = {
  reading:
    "Full body, 3/4 view facing left. Standing, holding a small open book with a dark green cover in both wings, " +
    "looking down at the pages, calm and content.",
  sleepy:
    "Full body, 3/4 view facing left. Flopped on its back, orange feet up in the air, eyes closed, fast asleep, " +
    "peaceful and a little silly.",
  celebrating:
    "Full body, 3/4 view facing left. Standing, both wings raised high in joy, eyes closed in happy upside-down " +
    "arcs, bill open in a big smile, a few small sparkles touching its head and wings.",
  confused:
    "Full body, 3/4 view facing left. Standing, head tilted to one side, one eyebrow raised, a small blue sweat " +
    "drop on the side of its head, puzzled.",
  scanning:
    "Full body, 3/4 view facing left. Standing, holding a round magnifying glass up to one eye, curious and " +
    "focused, the eye looks big through the lens.",
};

const PEEK_FRAMING =
  "Popping up from the bottom edge of the image, turned slightly left towards the viewer: head, neck, chest and " +
  "both wings are visible, the wings resting on the bottom edge like elbows on a windowsill; everything below the " +
  "chest is cut off cleanly by the bottom image edge, with no sticker border along the cut.";

const PEEK_PROMPTS: Record<PeekPose, string> = {
  rest: "Curious neutral expression.",
  honk: "Bill wide open mid-honk, eyes wide, very loud and a bit rude.",
  blink: "Eyes closed mid-blink, relaxed.",
  suspicious: "Eyes narrowed, one brow lowered, deeply suspicious.",
  wink: "Winking one eye, cheeky and charming.",
  steal: "Holding a tiny dark green book in its bill, eyes wide, caught stealing it.",
};

const WALK_PROMPTS: Record<WalkFrame, string> = {
  "step-1":
    "Full body, side view facing left, waddling along: caught mid-step with the front webbed foot lifted forward, " +
    "body leaning slightly into the step, wings held a little out for balance, determined and a bit pompous.",
  "step-2":
    "Full body, side view facing left, waddling along: the other half of the step — the back foot lifted, the " +
    "front foot planted, body leaning slightly into the step, wings held a little out for balance.",
};

export const TARGETS: Target[] = [
  ...MOODS.map((mood) => ({
    id: `${MOOD_FOLDER}/${mood}`,
    folder: MOOD_FOLDER,
    name: mood,
    prompt: MOOD_PROMPTS[mood],
    size: "1024x1536" as const,
  })),
  ...PEEK_POSES.map((pose) => ({
    id: `${PEEK_FOLDER}/${pose}`,
    folder: PEEK_FOLDER,
    name: pose,
    prompt: `${PEEK_FRAMING} ${PEEK_PROMPTS[pose]}`,
    size: "1024x1024" as const,
  })),
  ...WALK_FRAMES.map((frame) => ({
    id: `${WALK_FOLDER}/${frame}`,
    folder: WALK_FOLDER,
    name: frame,
    prompt: WALK_PROMPTS[frame],
    size: "1024x1536" as const,
  })),
];

/** Cut-off parts end flush at the image edge, as if the rest of the goose is outside the screen. */
const CUT =
  "The body is cut off cleanly and straight by that image edge, as if the rest of the goose is just outside the " +
  "phone screen: no sticker border along the cut, the drawing simply ends at the edge.";

/** Ways the goose could visit the screen — one exploratory image each, to pick a direction. */
export const CONCEPTS: Target[] = (
  [
    {
      id: "concept/side-lean",
      name: "side-lean",
      size: "1024x1536",
      prompt:
        "Leaning in from the right edge of the image, facing left: we see the head, neck, chest and the near wing; " +
        "the rest of the body is outside the right image edge. The near wing grips the edge like a door frame, " +
        `curious and a little nosy. ${CUT}`,
    },
    {
      id: "concept/windowsill",
      name: "windowsill",
      size: "1024x1024",
      prompt:
        "Popping up from the bottom edge of the image, turned slightly left towards the viewer: head, neck, chest and " +
        "both wings are visible, the wings resting on the bottom edge like elbows on a windowsill, everything below " +
        `the chest is outside the bottom image edge. Curious, cheerful. ${CUT}`,
    },
    {
      id: "concept/waddle",
      name: "waddle",
      size: "1024x1536",
      prompt:
        "Full body, side view facing left, waddling along: caught mid-step with one webbed foot lifted forward, body " +
        "leaning slightly into the step, wings held a little out for balance, determined and a bit pompous — as if " +
        "marching across the screen.",
    },
    {
      id: "concept/hanging",
      name: "hanging",
      size: "1024x1536",
      prompt:
        "Hanging upside down from the top edge of the image: head, neck, chest and both wings dangle down into the " +
        "picture, upside down, the goose looking at the viewer with a cheeky grin; everything above the chest is " +
        `outside the top image edge. ${CUT}`,
    },
    {
      id: "concept/corner-wave",
      name: "corner-wave",
      size: "1024x1024",
      prompt:
        "Peeking in diagonally from the bottom-right corner of the image, facing up-left: head, neck, chest and one " +
        "wing raised in a friendly little wave; the rest of the body is outside the right and bottom image edges. " +
        `Happy to see you. ${CUT.replace("that image edge", "those image edges")}`,
    },
  ] satisfies Omit<Target, "folder">[]
).map((c) => ({ ...c, folder: "concept", exploratory: true }));

/** For touching up one candidate: only the named change, everything else stays as drawn. */
export function editPrompt(change: string): string {
  return [
    "Edit this image. Keep everything exactly as it is — the goose, its pose, colours, outline, shading, sticker " +
      "border, size and position — and change only this:",
    change,
    AVOID,
  ].join("\n\n");
}

/** The full prompt for one image. `note` adds extra direction for a retry ("raise the wings higher"). */
export function fullPrompt(target: Target, { withReferences, note }: { withReferences: boolean; note?: string }): string {
  return [withReferences ? SAME_CHARACTER : null, STYLE, target.prompt, note ? `Also: ${note}` : null, AVOID]
    .filter(Boolean)
    .join("\n\n");
}
