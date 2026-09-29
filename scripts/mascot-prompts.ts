/**
 * The prompts for every drawn mascot image — the one place they live. `npm run mascots:generate`
 * sends them to the image API; its dry run prints them for pasting into ChatGPT or Gemini by hand.
 */
import { ART_SETS, type Mood, type PeekLook, type PeekPose, type Species, type WalkFrame } from "../src/components/mascot/art.ts";

const GOOSE_STYLE =
  "Cute chubby white domestic goose, soft kawaii illustration, thin warm-brown hand-drawn outline, soft pastel " +
  "airbrushed shading, cream-white feathers with a warm shadow underneath, a flat orange bill with a small knob at " +
  "its base, tiny black dot eyes, rosy pink blush on the cheeks, short orange legs with little webbed feet, a few " +
  "tiny yellow emphasis strokes near the head, die-cut sticker look with a thin white border, isolated, plain " +
  "transparent background, centered. Everything, including small extras like sparkles, sits inside one continuous " +
  "white sticker border — nothing floats separately.";

/** The duckling (reference/duckling-base.png): a round blob duckling with the goose's sticker finish. */
const DUCKLING_STYLE =
  "Cute chubby baby duckling, soft kawaii illustration: one round, slightly egg-shaped blob that is a little wider " +
  "than tall, head and body a single shape with no neck. Warm pale yellow with soft pastel airbrushed shading and a " +
  "warm shadow underneath, thin warm-brown hand-drawn outline. The face sits on the upper front of the blob: two " +
  "small dark round eyes set wide apart, a wide flat yellow-orange bill between them, rosy pink blush on the cheeks. " +
  "A small rounded wing nub at the back, short stubby yellow-orange feet. Die-cut sticker look with a thin white " +
  "border, isolated, plain transparent background, centered. Everything, including small extras like sparkles, " +
  "sits inside one continuous white sticker border — nothing floats separately.";

export const STYLE: Record<Species, string> = { goose: GOOSE_STYLE, duckling: DUCKLING_STYLE };

export const AVOID =
  "Avoid: text, letters, watermark, signature, scenery, ground, realistic feathers, heavy black shadows, gradient " +
  "background, frames, checkerboard pattern.";

/** Sent first whenever reference images of the character are attached — this keeps each set consistent. */
const sameCharacter = (species: Species) =>
  `Draw exactly the same ${species} character as in the reference images: identical body proportions, head shape, ` +
  "bill, eye size and spacing, blush, outline colour and thickness, shading and sticker border. Only the pose and " +
  "expression change. Ignore any checkerboard or background in the references.";

/** For a new character: the references (the goose) only set the drawing style. */
const styleOnly = (species: Species) =>
  "The reference image shows a goose from the same sticker set. Treat it only as a loose hint for the sticker " +
  "finish — the white sticker border, the blush, the orange of bill and feet. Draw a completely different " +
  `character, a ${species}: its shape, proportions, line weight and shading follow the description below, not ` +
  "the goose. Ignore any checkerboard or background in the reference.";

export type Target = {
  /** "goose/sleepy" or "duckling-peek/honk" — also the path under docs/mascot-art/raw/. */
  id: string;
  species: Species;
  /** "style": the references only set the drawing style (for a character's first, base image). */
  intro?: "same" | "style";
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

/** How each pop-up look sits on the bottom edge (the cut is always flush with it, with no border along the cut). */
const PEEK_FRAMING: Record<PeekLook, string> = {
  goose:
    "Popping up from the bottom edge of the image, turned slightly left towards the viewer: head, neck, chest and " +
    "both wings are visible, the wings resting on the bottom edge like elbows on a windowsill; everything below " +
    "the chest is cut off cleanly by the bottom image edge, with no sticker border along the cut.",
  duckling:
    "Popping up from the bottom edge of the image: the upper half of its round blob body rises into the picture " +
    "like a half moon, no neck, two small round paws resting on the edge inside its outline; the body is cut off " +
    "cleanly by the bottom image edge, with no sticker border along the cut.",
  "duckling-wings":
    "Popping up from the bottom edge of the image: the upper half of its round blob body rises into the picture " +
    "like a half moon, no neck, two tiny stubby wings flapped out at its sides; the body is cut off cleanly by the " +
    "bottom image edge, with no sticker border along the cut.",
};

const PEEK_PROMPTS: Record<PeekPose, string> = {
  rest: "Curious neutral expression.",
  honk: "Bill wide open mid-honk, eyes wide, very loud and a bit rude.",
  blink: "Eyes closed mid-blink, relaxed.",
  suspicious: "Eyes narrowed, one brow lowered, deeply suspicious.",
  wink: "Winking one eye, cheeky and charming.",
  steal: "Holding a tiny dark green book in its bill, eyes wide, caught stealing it.",
  wave: "Waving hello with one wing (or paw), a happy open smile, eyes as happy closed arcs.",
};

const WALK_PROMPTS: Record<WalkFrame, string> = {
  "step-1":
    "Full body, side view facing left, waddling along: caught mid-step with the front webbed foot lifted forward, " +
    "body leaning slightly into the step, wings held a little out for balance, determined and a bit pompous.",
  "step-2":
    "Full body, side view facing left, waddling along: the other half of the step — the back foot lifted, the " +
    "front foot planted, body leaning slightly into the step, wings held a little out for balance.",
};

/** Every image the app uses: every name of every set (see ART_SETS), including the optional ones. */
export const TARGETS: Target[] = ART_SETS.flatMap((set) =>
  [...set.kind.names, ...set.kind.optional].map((name): Target => {
    const kind = set.kind.kind;
    const prompt =
      kind === "moods"
        ? MOOD_PROMPTS[name as Mood]
        : kind === "peek"
          ? `${PEEK_FRAMING[set.look as PeekLook]} ${PEEK_PROMPTS[name as PeekPose]}`
          : WALK_PROMPTS[name as WalkFrame];
    // The round duckling fits a square; the goose is taller. Pop-ups are square.
    const size = kind === "peek" || set.species === "duckling" ? "1024x1024" : "1024x1536";
    return { id: `${set.folder}/${name}`, species: set.species, folder: set.folder, name, prompt, size };
  }),
);

/**
 * Explorations: images that are generated and compared but never go into the app (pick one, then build on it).
 * A new character starts here — its base drawing, generated fresh (`intro: "style"` takes only the goose's style)
 * or restyled from an existing drawing with `--restyle`. The duckling's base was made with:
 *   npm run mascots:generate -- concept/duckling-base --go --restyle example_images/fat_duck.png
 * and the chosen candidate copied to docs/mascot-art/reference/duckling-base.png.
 */
export const CONCEPTS: Target[] = [
  {
    id: "concept/duckling-base",
    name: "duckling-base",
    species: "duckling",
    intro: "style",
    folder: "concept",
    size: "1024x1024",
    exploratory: true,
    prompt:
      "Full body, 3/4 view facing left, standing, neutral happy expression — the duckling's reference image that " +
      "every other duckling picture is drawn from.",
  },
];

/** For restyling an existing drawing: keep its design, give it the goose's finish (second reference image). */
export function restylePrompt(species: Species): string {
  return [
    `Redraw the ${species} from the first image in the drawing style of the goose in the second image, so the two ` +
      `look like one sticker set. Keep the ${species}'s design exactly: its shape, proportions, pose, face, eye ` +
      "and bill placement, wings, feet and colours. Change only the finish: a thin warm-brown hand-drawn outline, " +
      "soft pastel airbrushed shading with a warm shadow underneath, rosy blush on the cheeks, a die-cut white " +
      "sticker border, isolated on a plain transparent background, centered.",
    "Remove anything that isn't part of the drawing, such as the small round icon in the bottom-left corner.",
    AVOID,
  ].join("\n\n");
}

/** For touching up one candidate: only the named change, everything else stays as drawn. */
export function editPrompt(change: string): string {
  return [
    "Edit this image. Keep everything exactly as it is — the character, its pose, colours, outline, shading, sticker " +
      "border, size and position — and change only this:",
    change,
    AVOID,
  ].join("\n\n");
}

/** The full prompt for one image. `note` adds extra direction for a retry ("raise the wings higher"). */
export function fullPrompt(target: Target, { withReferences, note }: { withReferences: boolean; note?: string }): string {
  const intro = target.intro === "style" ? styleOnly(target.species) : sameCharacter(target.species);
  return [withReferences ? intro : null, STYLE[target.species], target.prompt, note ? `Also: ${note}` : null, AVOID]
    .filter(Boolean)
    .join("\n\n");
}
