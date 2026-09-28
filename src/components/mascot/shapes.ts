/**
 * The mascots as plain shape lists (no React Native imports), so the same drawing can be rendered
 * by react-native-svg in the app and by a plain SVG renderer for previews and icons
 * (`npm run mascots` builds docs/mascot-gallery.html from this file).
 *
 * Style — "soft chubby goose" (after the references in example_images/):
 * - Chubby, bottom-heavy, slightly lopsided bodies — never perfect circles.
 * - Geese read as geese: a visible neck, a big flat bill with a knob at its base, a short
 *   upturned tail and a low, heavy body. Ducklings are lumpy blobs with the face turned a bit.
 * - Soft airbrushed volume (light from the upper left, warm underside) — no gloss.
 * - One warm-brown outline, round caps; lighter brown for inner contours.
 * - Tiny dot eyes, soft blush, little yellow emphasis marks.
 * - A white "sticker" halo behind the silhouette so the birds pop on dark backgrounds too.
 * Everything lives in a 120×120 box; geese face left in 3/4 view, ducklings face the viewer.
 */

export type GradientStop = { offset: number; color: string; opacity?: number };

type Paint = {
  /** A colour or `url(#id)` of a gradient defined in the same list. */
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  /** SVG transform, e.g. "rotate(8 42 50)". */
  transform?: string;
};

export type Shape =
  | ({ kind: "path"; d: string } & Paint)
  | ({ kind: "circle"; cx: number; cy: number; r: number } & Paint)
  | ({ kind: "ellipse"; cx: number; cy: number; rx: number; ry: number } & Paint)
  | ({ kind: "rect"; x: number; y: number; width: number; height: number; rx?: number } & Paint)
  | ({ kind: "text"; x: number; y: number; text: string; size: number; weight?: "bold" } & Paint)
  | { kind: "group"; children: Shape[]; transform?: string; opacity?: number; clipPath?: string }
  // Definitions (rendered into <defs>; coordinates are fractions of the filled shape's box).
  | { kind: "linearGradient"; id: string; x1: number; y1: number; x2: number; y2: number; stops: GradientStop[] }
  | { kind: "radialGradient"; id: string; cx: number; cy: number; r: number; fx?: number; fy?: number; stops: GradientStop[] }
  | { kind: "clipPath"; id: string; children: Shape[] };

export type Species = "goose" | "greylag" | "duckling" | "brownie";
export type Mood = "reading" | "sleepy" | "celebrating" | "confused" | "scanning";
export const MOODS: readonly Mood[] = ["reading", "sleepy", "celebrating", "confused", "scanning"];

/** Colours the props borrow from the active theme (the birds themselves never change colour). */
export type PropColors = { primary: string; secondary: string; muted: string; star: string };

/** The goose is the star; ducklings drop by now and then. */
export const SPECIES: readonly { value: Species; label: string; weight: number }[] = [
  { value: "goose", label: "goose", weight: 45 },
  { value: "greylag", label: "grey goose", weight: 20 },
  { value: "duckling", label: "duckling", weight: 25 },
  { value: "brownie", label: "brown duckling", weight: 10 },
];

/**
 * Weighted random character. `pool` limits the choice (e.g. to species with a complete set of drawn
 * images, so drawn and vector birds never mix); an empty or missing pool means all species.
 */
export function randomSpecies(random: () => number = Math.random, pool?: readonly Species[]): Species {
  const candidates = pool?.length ? SPECIES.filter((s) => pool.includes(s.value)) : SPECIES;
  const total = candidates.reduce((sum, s) => sum + s.weight, 0);
  let roll = random() * total;
  for (const s of candidates) {
    roll -= s.weight;
    if (roll < 0) return s.value;
  }
  return candidates[0]?.value ?? "goose";
}

// ─── Palette ────────────────────────────────────────────────────────────────

const LINE_SOFT = "#C4AF9C"; // inner contours
const HALO = "#FFFFFF";
const EYE = "#3B2A20";
const BLUSH = "#F49A9E";
const MARK = "#F2C343"; // little emphasis strokes
const ORANGE = "#F59A3E";
const ORANGE_LIGHT = "#FFB866";
const ORANGE_SHADE = "#DD7C2A";
const PAGE = "#FFFBF2";

type Look = {
  /** light (upper left) → base → shade (underside) */
  body: [string, string, string];
  line: string;
  lineWidth: number;
  bill: [string, string];
  billShade: string;
  /** Folded wing fill, light → dark. */
  wing: [string, string];
  wingLine: string;
  cap?: string;
};

const LOOKS: Record<Species, Look> = {
  goose: {
    body: ["#FFFFFF", "#FFFCF6", "#E6D8C4"], line: "#6B5344", lineWidth: 2.2,
    bill: [ORANGE_LIGHT, ORANGE], billShade: ORANGE_SHADE, wing: ["#FFFDF8", "#EADFCF"], wingLine: "#B9A490",
  },
  greylag: {
    body: ["#F7F4EF", "#E9E3DB", "#CFC4B6"], line: "#6B5344", lineWidth: 2.2,
    bill: [ORANGE_LIGHT, ORANGE], billShade: ORANGE_SHADE, wing: ["#CFC5B9", "#A99D8F"], wingLine: "#7E7264",
  },
  duckling: {
    body: ["#FFFBD6", "#FFF0A0", "#F1D36A"], line: "#5A3B1A", lineWidth: 2.7,
    bill: ["#FFCB57", "#F7A92C"], billShade: "#DC8A18", wing: ["#FFF3AE", "#F4DB7C"], wingLine: "#5A3B1A",
  },
  brownie: {
    body: ["#FAEBD2", "#EFD5AE", "#D9B384"], line: "#5A3B1A", lineWidth: 2.7,
    bill: ["#FFC063", "#F2A03A"], billShade: "#D98424", wing: ["#EFD5AE", "#D9B384"], wingLine: "#5A3B1A", cap: "#B98A5C",
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const stop = (offset: number, color: string, opacity?: number): GradientStop => ({ offset, color, opacity });
const url = (id: string) => `url(#${id})`;
const path = (d: string, fill: string, stroke?: string, strokeWidth?: number, extra: Partial<Paint> = {}): Shape =>
  ({ kind: "path", d, fill, stroke, strokeWidth, ...extra });
const line = (d: string, stroke: string, strokeWidth: number, extra: Partial<Paint> = {}): Shape =>
  ({ kind: "path", d, fill: "none", stroke, strokeWidth, ...extra });

/** Gradients every bird uses; ids are prefixed per instance. */
function defs(look: Look, id: (n: string) => string): Shape[] {
  return [
    // Soft airbrushed volume: light from the upper left, warm shade underneath.
    { kind: "radialGradient", id: id("body"), cx: 0.36, cy: 0.28, r: 0.85, fx: 0.3, fy: 0.2, stops: [stop(0, look.body[0]), stop(0.55, look.body[1]), stop(1, look.body[2])] },
    { kind: "linearGradient", id: id("wing"), x1: 0, y1: 0, x2: 0.4, y2: 1, stops: [stop(0, look.wing[0]), stop(1, look.wing[1])] },
    { kind: "linearGradient", id: id("bill"), x1: 0, y1: 0, x2: 0, y2: 1, stops: [stop(0, look.bill[0]), stop(1, look.bill[1])] },
    { kind: "linearGradient", id: id("feet"), x1: 0, y1: 0, x2: 0, y2: 1, stops: [stop(0, ORANGE_LIGHT), stop(1, ORANGE)] },
    { kind: "radialGradient", id: id("blush"), cx: 0.5, cy: 0.5, r: 0.5, stops: [stop(0, BLUSH, 0.9), stop(0.6, BLUSH, 0.55), stop(1, BLUSH, 0)] },
    { kind: "radialGradient", id: id("shadow"), cx: 0.5, cy: 0.5, r: 0.5, stops: [stop(0, "#000000", 0.16), stop(1, "#000000", 0)] },
  ];
}

/** White sticker halo behind silhouette parts, then the parts themselves (halos never cover lines). */
function sticker(parts: Shape[]): Shape[] {
  const halos = parts.flatMap((p): Shape[] =>
    p.kind === "path" && p.fill && p.fill !== "none"
      ? [{ ...p, fill: HALO, stroke: HALO, strokeWidth: (p.strokeWidth ?? 2) + 5 }]
      : [],
  );
  return [...halos, ...parts];
}

/** Three little strokes fanning out from (x, y) — surprise, joy or "notice me". */
function marks(x: number, y: number, angle = -135, color = MARK): Shape[] {
  return [-35, 0, 35].map((spread) => {
    const a = ((angle + spread) * Math.PI) / 180;
    const p = (r: number) => `${(x + Math.cos(a) * r).toFixed(1)} ${(y + Math.sin(a) * r).toFixed(1)}`;
    return line(`M${p(3)} L${p(8)}`, color, 2.4);
  });
}

const dotEye = (x: number, y: number, r = 2.4): Shape[] => [
  { kind: "ellipse", cx: x, cy: y, rx: r, ry: r * 1.12, fill: EYE },
  { kind: "circle", cx: x + r * 0.35, cy: y - r * 0.4, r: r * 0.32, fill: "#FFFFFF" },
];
const happyEye = (x: number, y: number, w = 3.4): Shape => line(`M${x - w} ${y + 1} Q${x} ${y - w} ${x + w} ${y + 1}`, EYE, 2);
const sleepyEye = (x: number, y: number, w = 3.4): Shape => line(`M${x - w} ${y - 0.5} Q${x} ${y + w * 0.9} ${x + w} ${y - 0.5}`, EYE, 2);
const blush = (id: (n: string) => string, x: number, y: number, rx = 5.5, ry = 3.6): Shape =>
  ({ kind: "ellipse", cx: x, cy: y, rx, ry, fill: url(id("blush")) });
const groundShadow = (id: (n: string) => string, cx: number, cy: number, rx: number): Shape =>
  ({ kind: "ellipse", cx, cy, rx, ry: 4.5, fill: url(id("shadow")) });

/** A webbed foot pointing "up" from its heel at (0,0); place it with translate/rotate. */
function webbedFoot(x: number, y: number, angle: number, look: Look, id: (n: string) => string, scale = 1): Shape {
  return {
    kind: "group",
    transform: `translate(${x} ${y}) rotate(${angle}) scale(${scale})`,
    children: [
      path("M-1.8 0 C-6.5 -3 -9.5 -9 -8.5 -13.5 Q-6.2 -11.8 -4.2 -15 Q-2.1 -12.4 0 -15.8 Q2.1 -12.4 4.2 -15 Q6.2 -11.8 8.5 -13.5 C9.5 -9 6.5 -3 1.8 0 Z", url(id("feet")), look.line, 1.6),
      line("M-4.2 -13 L-1.2 -3.5 M4.2 -13 L1.2 -3.5", ORANGE_SHADE, 1.1),
    ],
  };
}

// ─── The mascot ─────────────────────────────────────────────────────────────

/** @param idPrefix makes gradient ids unique when several mascots share a document. */
export function mascotShapes(species: Species, mood: Mood, props: PropColors, idPrefix = "m"): Shape[] {
  const look = LOOKS[species];
  const id = (name: string) => `${idPrefix}-${name}`;
  const head = defs(look, id);
  if (species === "goose" || species === "greylag") {
    return [...head, ...(mood === "sleepy" ? lyingGoose(look, props, id) : standingGoose(look, mood, props, id))];
  }
  return [...head, ...blobDuck(look, mood, props, id)];
}

// Geese — standing, 3/4 view facing left ─────────────────────────────────────
// Small oval head on a real neck, low heavy body, short upturned tail.

const GOOSE_BODY =
  "M47 15 C55 15 60 21 60 28 C60 34 57 38 56 44 C55 52 58 59 66 63 C80 61 96 64 103 74 C110 84 106 100 90 106 C77 111 50 111 38 106 C25 100 22 87 28 77 C32 70 37 65 38 57 C38 50 35 45 34 39 C33 33 33 27 36 22 C39 17 43 15 47 15 Z";
const GOOSE_FACE = { eyeX: 43, eyeY: 25, blushX: 48, blushY: 32, pivotX: 46, pivotY: 58 };

function gooseBill(look: Look, open: boolean, id: (n: string) => string): Shape[] {
  // Knob at the base of the bill — the most "goose" detail there is.
  const knob = path("M34 21.5 C35 18.5 38.5 18 40 20.5 C39 22.5 36.5 23.5 34 23 Z", url(id("bill")), look.line, 1.6);
  if (open) {
    return [
      knob,
      path("M35 32 C29 35 22 38 19 38 C22 42 30 42 36 36 Z", look.billShade, look.line, 1.6),
      { kind: "ellipse", cx: 27.5, cy: 36.4, rx: 3.6, ry: 1.5, fill: "#F28C9C" },
      path("M36 22 C30 20.5 22 21 17 24.5 C15 27 16.5 30.5 21 31 C27 31.5 32 31.5 36 31 Z", url(id("bill")), look.line, 1.8),
      { kind: "circle", cx: 27, cy: 24.6, r: 0.9, fill: look.line },
    ];
  }
  return [
    knob,
    path("M36 22 C30 20.5 22 21 17 24.5 C14.5 27.5 16 32 21 32.5 C27 33 32 32.5 36 32 Z", url(id("bill")), look.line, 1.8),
    line("M17.5 29.5 C23 30.8 30 31 35.5 30", look.billShade, 1.3),
    { kind: "circle", cx: 27, cy: 24.8, r: 0.9, fill: look.line },
  ];
}

function standingGoose(look: Look, mood: Mood, c: PropColors, id: (n: string) => string): Shape[] {
  const L = look.line;
  const W = look.lineWidth;
  const out: Shape[] = [groundShadow(id, 64, 112, 34)];

  const feet = [
    path("M44 113 L51 108 L57 113 C53 115.5 48 115.5 44 113 Z", url(id("feet")), L, 1.6),
    path("M64 113 L71 108 L77 113 C73 115.5 68 115.5 64 113 Z", url(id("feet")), L, 1.6),
  ];
  // Short, blunt, slightly upturned tail.
  const tail = path("M100 70 C106 64 112 62 116 62 C116 70 112 78 105 84 Z", url(id("body")), L, W);
  const body = path(GOOSE_BODY, url(id("body")), L, W);
  out.push(...sticker([...feet, tail, body]));
  out.push(line("M51.5 104 L51 109", L, 4.4), line("M51.5 104 L51 109", ORANGE, 2.4));
  out.push(line("M70.5 104 L71 109", L, 4.4), line("M70.5 104 L71 109", ORANGE, 2.4));
  out.push(body);
  // Soft fluff at the chest and a crease where the neck meets the body.
  out.push(line("M31 80 q2 -2.5 4 0 q2 -2.5 4 0", LINE_SOFT, 1.3));
  out.push(line("M40 58 C44 61 50 62 55 61", LINE_SOFT, 1.2, { opacity: 0.8 }));

  // Wing: folded along the body, or raised for celebrating.
  if (mood === "celebrating") {
    out.push(...sticker([path("M78 64 C82 50 92 40 104 38 C106 48 100 60 88 70 Z", url(id("wing")), L, W)]));
    out.push(line("M96 44 q3 1 4 4 M93 51 q3 1 4 4", look.wingLine, 1.2));
  } else {
    out.push(path("M62 70 C74 63 92 66 101 78 C101 90 90 97 76 97 C66 95 61 84 62 70 Z", url(id("wing")), look.wingLine, 1.6));
    // Feather tips at the back of the folded wing.
    out.push(line("M86 96 q3 -4 7 -3 M92 92 q3 -4 7 -3 M96 86 q3 -3 6 -2", look.wingLine, 1.3));
    out.push(line("M68 76 C76 72 86 73 92 78", "#FFFFFF", 1.6, { opacity: 0.7 }));
  }

  // Head details (tilted when confused).
  const face: Shape[] = [];
  const { eyeX, eyeY, blushX, blushY } = GOOSE_FACE;
  face.push(blush(id, blushX, blushY, 5, 3.3));
  face.push(...gooseBill(look, mood === "celebrating" || mood === "confused", id));
  if (mood === "celebrating") face.push(happyEye(eyeX, eyeY, 3));
  else if (mood === "scanning") face.push(...dotEye(eyeX, eyeY, 3));
  else face.push(...dotEye(eyeX, eyeY + (mood === "reading" ? 1 : 0), 2.3));
  if (mood === "confused") face.push(line(`M${eyeX - 3.5} ${eyeY - 5.5} Q${eyeX} ${eyeY - 8} ${eyeX + 4} ${eyeY - 5}`, L, 1.6));
  out.push(mood === "confused" ? { kind: "group", transform: `rotate(-9 ${GOOSE_FACE.pivotX} ${GOOSE_FACE.pivotY})`, children: face } : { kind: "group", children: face });

  out.push(...gooseProps(mood, c, look, id));
  return out;
}

function gooseProps(mood: Mood, c: PropColors, look: Look, id: (n: string) => string): Shape[] {
  switch (mood) {
    case "reading":
      return [
        ...book(20, 70, c),
        path("M78 70 C76 80 68 88 58 90 C55 87 56 82 60 80 C66 78 72 74 78 70 Z", url(id("wing")), look.line, 1.8),
        ...marks(30, 14, -120),
      ];
    case "celebrating":
      return [...marks(26, 16, -140), ...marks(110, 32, -40), ...sparkle(14, 56, c.star), ...sparkle(100, 16, c.primary, 0.8), ...confetti(c)];
    case "confused":
      return [question(66, 22, c.primary), ...sweat(62, 26)];
    case "scanning":
      return magnifier(GOOSE_FACE.eyeX, GOOSE_FACE.eyeY, look.line);
    default:
      return [];
  }
}

// Geese — flopped on its back, feet in the air (sleepy) ──────────────────────

function lyingGoose(look: Look, c: PropColors, id: (n: string) => string): Shape[] {
  const L = look.line;
  const W = look.lineWidth;
  const out: Shape[] = [groundShadow(id, 64, 108, 48)];
  const legs: Shape[] = [
    line("M64 68 L67 50", L, 4.4), line("M64 68 L67 50", ORANGE, 2.4),
    line("M78 70 L84 54", L, 4.4), line("M78 70 L84 54", ORANGE, 2.4),
  ];
  const feet: Shape[] = [webbedFoot(67, 51, 8, look, id), webbedFoot(84, 55, 22, look, id)];
  const tail = path("M102 92 C110 90 115 93 118 98 C111 103 103 102 100 98 Z", url(id("body")), L, W);
  const body = path("M30 88 C28 74 40 66 56 66 C70 66 78 70 90 70 C104 70 112 80 110 92 C108 102 94 106 74 106 C54 106 32 102 30 88 Z", url(id("body")), L, W);
  // Head resting at the front of the body, face towards the viewer (like cute_goose2).
  const head = path("M12 66 C11 55 19 47 29 47 C39 47 46 54 46 63 C46 73 38 79 29 79 C19 79 13 74 12 66 Z", url(id("body")), L, W);
  out.push(...sticker([tail, body, head]));
  out.push(...legs, ...feet, body);
  out.push(path("M58 76 C68 71 82 72 90 80 C80 86 66 86 58 76 Z", url(id("wing")), look.wingLine, 1.4));
  out.push(head);
  out.push(blush(id, 24, 68, 4.6, 3));
  out.push(sleepyEye(24, 60, 2.8));
  // Bill pointing out towards the viewer, knob at its base.
  out.push(path("M38 58 C38 55 41 54 43 56 C43 58 41 59.5 38 59.5 Z", url(id("bill")), L, 1.4));
  out.push(path("M37 60 C43 57 52 58 55 62 C57 66 53 70 46 70 C41 70 37 68 36 65 Z", url(id("bill")), L, 1.8));
  out.push(line("M38 66 C43 67.5 50 67.5 55 65.5", look.billShade, 1.2));
  out.push({ kind: "circle", cx: 46, cy: 61, r: 0.9, fill: L });
  out.push({ kind: "circle", cx: 57, cy: 66, r: 3.2, fill: "#DDF1FF", stroke: "#9CCBEB", strokeWidth: 1, opacity: 0.9 });
  out.push(...zzz(22, 38, c.muted));
  return out;
}

// Ducklings — a lumpy blob, face turned slightly left (after fat_duck.png) ────

const BLOB =
  "M57 15 C78 13 96 26 101 47 C106 70 101 94 83 105 C71 112 46 112 34 104 C20 95 16 77 19 58 C22 36 36 17 57 15 Z";
const DUCK_FACE = { leftEye: [37, 52] as const, rightEye: [63, 54] as const, bill: [50, 60] as const };

function blobDuck(look: Look, mood: Mood, c: PropColors, id: (n: string) => string): Shape[] {
  const L = look.line;
  const W = look.lineWidth;
  const out: Shape[] = [groundShadow(id, 62, 111, 38)];
  const raised = mood === "celebrating";

  // One foot planted, one kicked out to the side — mid-waddle.
  const feet = [
    path("M24 96 C15 95 10 102 13 107 C16 111 25 109 30 103 Z", url(id("feet")), L, 2.2, { transform: "rotate(-18 22 102)" }),
    path("M66 104 C61 110 64 115 72 115 C81 115 84 109 78 104 Z", url(id("feet")), L, 2.2),
  ];
  const wings = raised
    ? [
        path("M22 50 C12 44 8 34 11 28 C18 31 23 39 25 46 Z", url(id("wing")), L, W),
        path("M98 50 C108 44 112 34 109 28 C102 31 97 39 95 46 Z", url(id("wing")), L, W),
      ]
    : [
        // A little stub at the top-left and a flap on the right side.
        path("M26 34 C18 30 12 36 15 43 C19 42 23 39 26 34 Z", url(id("wing")), L, W),
        path("M100 56 C109 56 112 70 103 77 C101 70 100 63 100 56 Z", url(id("wing")), L, W),
      ];
  const body = path(BLOB, url(id("body")), L, W);
  out.push(...sticker([...feet, ...wings, body]));
  out.push(body);
  if (look.cap) {
    out.push(path("M26 38 C32 24 44 16 57 15 C72 14 88 21 96 36 C82 30 42 30 26 38 Z", look.cap, undefined, undefined, { opacity: 0.85 }));
    out.push(path(BLOB, "none", L, W));
  }
  out.push(line("M49 16 C50 10 55 9 57 14 C59 9 64 10 65 16", L, 2));

  // Face (tilted when confused).
  const [lx, ly] = DUCK_FACE.leftEye;
  const [rx, ry] = DUCK_FACE.rightEye;
  const face: Shape[] = [blush(id, 28, 62, 6, 3.8), blush(id, 74, 64, 6, 3.8)];
  const dy = mood === "reading" ? 1.5 : 0;
  if (mood === "celebrating") face.push(happyEye(lx, ly, 4), happyEye(rx, ry, 4));
  else if (mood === "sleepy") face.push(sleepyEye(lx, ly, 4), sleepyEye(rx, ry, 4));
  else face.push(...dotEye(lx, ly + dy, 3.6), ...dotEye(rx, ry + dy, mood === "scanning" ? 4.4 : 3.6));
  // A wide, flat bill (upper lip overhangs), slightly off-centre.
  if (mood === "celebrating" || mood === "confused") {
    face.push(path("M42 63 C44 71 56 72 59 63 Z", look.billShade, L, 1.8));
    face.push({ kind: "ellipse", cx: 50.5, cy: 66.5, rx: 3.8, ry: 1.9, fill: "#F28C9C" });
    face.push(path("M37 60 C39 55 49 54 56 55.5 C61 56.5 64 59 62.5 62 C57 64.5 44 64.5 37 60 Z", url(id("bill")), L, 2));
  } else {
    face.push(path("M37 60 C39 55 49 54 56 55.5 C61 56.5 64 59 62.5 62 C60 66.5 52 68 47 67 C41 66 37 63.5 37 60 Z", url(id("bill")), L, 2));
    face.push(line("M39.5 61.5 C45 64 55 64 61.5 61.5", look.billShade, 1.4));
  }
  if (mood === "confused") face.push(line("M31 44 Q37 41 42 44", L, 1.8));
  out.push(mood === "confused" ? { kind: "group", transform: "rotate(-8 56 64)", children: face } : { kind: "group", children: face });

  out.push(...duckProps(mood, c, look, id));
  return out;
}

function duckProps(mood: Mood, c: PropColors, look: Look, id: (n: string) => string): Shape[] {
  switch (mood) {
    case "reading":
      return [
        ...book(32, 74, c),
        path("M22 80 C28 74 38 76 42 81 C37 87 28 88 22 80 Z", url(id("wing")), look.line, 2),
        path("M92 80 C86 74 76 76 72 81 C77 87 86 88 92 80 Z", url(id("wing")), look.line, 2),
      ];
    case "sleepy":
      return [{ kind: "circle", cx: 60, cy: 68, r: 3.6, fill: "#DDF1FF", stroke: "#9CCBEB", strokeWidth: 1, opacity: 0.9 }, ...zzz(84, 24, c.muted)];
    case "celebrating":
      return [...marks(20, 22, -135), ...marks(100, 22, -45), ...sparkle(58, 8, c.star), ...confetti(c)];
    case "confused":
      return [question(92, 26, c.primary), ...sweat(86, 36), ...marks(22, 26, -135)];
    case "scanning":
      return magnifier(DUCK_FACE.rightEye[0], DUCK_FACE.rightEye[1], look.line);
  }
}

// ─── Props (soft outlined style) ────────────────────────────────────────────

function book(x: number, y: number, c: PropColors): Shape[] {
  const LINE = "#6B5344";
  return [
    ...sticker([path(`M${x} ${y + 2} Q${x + 20} ${y - 4} ${x + 40} ${y + 2} L${x + 40} ${y + 22} Q${x + 20} ${y + 16} ${x} ${y + 22} Z`, c.secondary, LINE, 1.8)]),
    path(`M${x + 3} ${y + 2} Q${x + 11} ${y - 2} ${x + 20} ${y + 2} L${x + 20} ${y + 19} Q${x + 11} ${y + 15} ${x + 3} ${y + 19} Z`, PAGE, LINE, 1.2),
    path(`M${x + 20} ${y + 2} Q${x + 29} ${y - 2} ${x + 37} ${y + 2} L${x + 37} ${y + 19} Q${x + 29} ${y + 15} ${x + 20} ${y + 19} Z`, PAGE, LINE, 1.2),
    line(`M${x + 7} ${y + 7} L${x + 16} ${y + 6.5} M${x + 7} ${y + 11} L${x + 16} ${y + 10.5} M${x + 24} ${y + 6.5} L${x + 33} ${y + 7} M${x + 24} ${y + 10.5} L${x + 31} ${y + 11}`, LINE_SOFT, 1.1),
    path(`M${x + 30} ${y + 1} L${x + 30} ${y + 26} L${x + 32} ${y + 23.5} L${x + 34} ${y + 26} L${x + 34} ${y + 1} Z`, "#E86A7A", LINE, 1),
  ];
}

function zzz(x: number, y: number, color: string): Shape[] {
  return [
    { kind: "text", x, y, text: "Z", size: 15, weight: "bold", fill: color },
    { kind: "text", x: x + 12, y: y - 9, text: "z", size: 11, weight: "bold", fill: color, opacity: 0.8 },
    { kind: "text", x: x + 21, y: y - 16, text: "z", size: 8, weight: "bold", fill: color, opacity: 0.6 },
  ];
}

function question(x: number, y: number, color: string): Shape {
  return { kind: "text", x, y, text: "?", size: 24, weight: "bold", fill: color };
}

function sweat(x: number, y: number): Shape[] {
  return [path(`M${x} ${y} Q${x + 5} ${y + 8} ${x} ${y + 10} Q${x - 5} ${y + 8} ${x} ${y} Z`, "#BFE2FA", "#7FB8E0", 1.2)];
}

function sparkle(x: number, y: number, color: string, scale = 1): Shape[] {
  const s = 6 * scale;
  return [path(`M${x} ${y - s} Q${x + 1} ${y - 1} ${x + s} ${y} Q${x + 1} ${y + 1} ${x} ${y + s} Q${x - 1} ${y + 1} ${x - s} ${y} Q${x - 1} ${y - 1} ${x} ${y - s} Z`, color)];
}

function confetti(c: PropColors): Shape[] {
  return [
    { kind: "rect", x: 76, y: 10, width: 5, height: 5, rx: 1, fill: c.primary, transform: "rotate(25 78 12)" },
    { kind: "circle", cx: 8, cy: 46, r: 2.4, fill: c.secondary },
    { kind: "rect", x: 108, y: 58, width: 4.5, height: 4.5, rx: 1, fill: c.star, transform: "rotate(-20 110 60)" },
    { kind: "circle", cx: 36, cy: 6, r: 2, fill: c.primary },
  ];
}

function magnifier(x: number, y: number, lineColor: string): Shape[] {
  return [
    line(`M${x + 7} ${y + 7} L${x + 16} ${y + 17}`, lineColor, 6.4),
    line(`M${x + 7} ${y + 7} L${x + 16} ${y + 17}`, "#B4865C", 3.8),
    { kind: "circle", cx: x, cy: y, r: 9, fill: "#DDF1FF", opacity: 0.45, stroke: lineColor, strokeWidth: 2.4 },
    line(`M${x - 5} ${y - 2} Q${x - 4} ${y - 5} ${x - 1} ${y - 6}`, "#FFFFFF", 1.6, { opacity: 0.9 }),
  ];
}

// ─── Goose peeking in from the side ─────────────────────────────────────────

export type GoosePose = {
  eye: "open" | "closed" | "narrow" | "wink" | "wide";
  /** Pupil offset, -1 (look away from screen centre) … 1 (look into the screen). */
  look: number;
  beakOpen: boolean;
  holdingBook: boolean;
};

export const GOOSE_PEEK_SIZE = { width: 150, height: 120 };

/**
 * A goose head on a long neck entering from the right edge (mirror it for the left edge). The
 * neck runs off the right side of the 150×120 box, the bill points left into the screen.
 */
export function goosePeekShapes(pose: GoosePose, bookColor: string, idPrefix = "g"): Shape[] {
  const look = LOOKS.goose;
  const id = (name: string) => `${idPrefix}-${name}`;
  const L = look.line;
  const hx = 70;
  const hy = 46;
  const neck = `M${hx + 8} ${hy + 8} C${hx + 28} ${hy + 18} ${hx + 48} ${hy + 38} 166 ${hy + 48}`;
  // An oval head, longer than it is tall, with a sloping forehead into the bill.
  const head = `M${hx - 22} ${hy - 6} C${hx - 20} ${hy - 20} ${hx - 6} ${hy - 26} ${hx + 6} ${hy - 24} C${hx + 20} ${hy - 22} ${hx + 26} ${hy - 10} ${hx + 23} ${hy + 2} C${hx + 20} ${hy + 14} ${hx + 6} ${hy + 18} ${hx - 6} ${hy + 16} C${hx - 16} ${hy + 14} ${hx - 23} ${hy + 6} ${hx - 22} ${hy - 6} Z`;
  const out: Shape[] = [
    ...defs(look, id),
    { kind: "linearGradient", id: id("neck"), x1: 0, y1: 0, x2: 0, y2: 1, stops: [stop(0, "#FFFFFF"), stop(0.55, "#FFFCF6"), stop(1, "#E6D8C4")] },
    line(neck, HALO, 34),
    line(neck, L, 28),
    line(neck, url(id("neck")), 23.6),
    ...sticker([path(head, url(id("body")), L, 2.4)]),
    blush(id, hx + 4, hy + 6, 6.5, 4.2),
  ];

  // Bill with the goose knob at its base (hinge at the left of the head).
  const bx = hx - 20;
  const by = hy - 1;
  out.push(path(`M${bx} ${by - 7} C${bx + 1} ${by - 11} ${bx + 5} ${by - 12} ${bx + 7} ${by - 9} C${bx + 6} ${by - 7} ${bx + 3} ${by - 5.5} ${bx} ${by - 6} Z`, url(id("bill")), L, 1.6));
  if (pose.beakOpen) {
    out.push(path(`M${bx + 1} ${by + 5} C${bx - 8} ${by + 9} ${bx - 17} ${by + 14} ${bx - 21} ${by + 13} C${bx - 16} ${by + 20} ${bx - 3} ${by + 17} ${bx + 3} ${by + 9} Z`, look.billShade, L, 1.8));
    out.push({ kind: "ellipse", cx: bx - 10, cy: by + 10.5, rx: 4.6, ry: 2.2, fill: "#F28C9C" });
    out.push(path(`M${bx + 1} ${by - 6} C${bx - 8} ${by - 10} ${bx - 21} ${by - 10} ${bx - 26} ${by - 3} C${bx - 23} ${by + 2} ${bx - 10} ${by + 4} ${bx + 2} ${by + 3} Z`, url(id("bill")), L, 2));
    out.push({ kind: "circle", cx: bx - 11, cy: by - 5, r: 1, fill: L });
  } else {
    out.push(path(`M${bx + 1} ${by - 6} C${bx - 8} ${by - 9} ${bx - 21} ${by - 8} ${bx - 26} ${by - 1} C${bx - 28} ${by + 6} ${bx - 18} ${by + 10} ${bx - 7} ${by + 9} C${bx - 1} ${by + 8} ${bx + 2} ${by + 5} ${bx + 1} ${by - 6} Z`, url(id("bill")), L, 2));
    out.push(line(`M${bx - 25} ${by + 3} C${bx - 18} ${by + 5} ${bx - 8} ${by + 5} ${bx} ${by + 3}`, look.billShade, 1.4));
    out.push({ kind: "circle", cx: bx - 11, cy: by - 3.5, r: 1, fill: L });
  }

  if (pose.holdingBook) {
    const t = `rotate(-12 ${bx - 12} ${by + 12})`;
    out.push(...sticker([path(`M${bx - 28} ${by + 3} L${bx - 1} ${by + 3} L${bx - 1} ${by + 20} L${bx - 28} ${by + 20} Z`, bookColor, L, 1.6, { transform: t })]));
    out.push(path(`M${bx - 26} ${by + 5} L${bx - 3} ${by + 5} L${bx - 3} ${by + 9} L${bx - 26} ${by + 9} Z`, PAGE, undefined, undefined, { transform: t }));
    out.push(line(`M${bx - 10} ${by + 3} L${bx - 10} ${by + 25}`, "#E86A7A", 2.6, { transform: t }));
  }

  const ex = hx - 6;
  const ey = hy - 9;
  const dx = pose.look * -2; // "into the screen" is to the left
  switch (pose.eye) {
    case "closed":
      out.push(sleepyEye(ex, ey, 3.6));
      break;
    case "wink":
      out.push(happyEye(ex, ey, 3.6));
      break;
    case "narrow":
      out.push(line(`M${ex - 3.5 + dx} ${ey + 0.5} L${ex + 3.5 + dx} ${ey + 0.5}`, EYE, 2.6));
      out.push(line(`M${ex - 6} ${ey - 5} L${ex + 5} ${ey - 2.5}`, L, 2.2));
      break;
    case "wide":
      out.push(...dotEye(ex + dx, ey, 3.8));
      out.push(...marks(hx, hy - 31, -100));
      break;
    default:
      out.push(...dotEye(ex + dx, ey, 2.8));
  }
  return out;
}

// ─── Plain SVG output (previews, tests, icon generation) ────────────────────

export function toSvg(shapes: Shape[], width = 120, height = 120, font = "Nunito, sans-serif"): string {
  const defsOut: string[] = [];
  const body = shapes.map((s) => renderSvg(s, defsOut, font)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defsOut.join("")}</defs>${body}</svg>`;
}

function renderSvg(s: Shape, defsOut: string[], font: string): string {
  const stops = (list: GradientStop[]) =>
    list.map((g) => `<stop offset="${g.offset}" stop-color="${g.color}" stop-opacity="${g.opacity ?? 1}"/>`).join("");
  const paint = (p: Paint) =>
    [
      p.fill ? `fill="${p.fill}"` : `fill="none"`,
      p.stroke ? `stroke="${p.stroke}" stroke-width="${p.strokeWidth ?? 1}" stroke-linecap="round" stroke-linejoin="round"` : "",
      p.opacity != null ? `opacity="${p.opacity}"` : "",
      p.transform ? `transform="${p.transform}"` : "",
    ]
      .filter(Boolean)
      .join(" ");
  switch (s.kind) {
    case "linearGradient":
      defsOut.push(`<linearGradient id="${s.id}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}">${stops(s.stops)}</linearGradient>`);
      return "";
    case "radialGradient":
      defsOut.push(`<radialGradient id="${s.id}" cx="${s.cx}" cy="${s.cy}" r="${s.r}" fx="${s.fx ?? s.cx}" fy="${s.fy ?? s.cy}">${stops(s.stops)}</radialGradient>`);
      return "";
    case "clipPath":
      defsOut.push(`<clipPath id="${s.id}">${s.children.map((c) => renderSvg(c, defsOut, font)).join("")}</clipPath>`);
      return "";
    case "group":
      return `<g ${s.transform ? `transform="${s.transform}"` : ""} ${s.opacity != null ? `opacity="${s.opacity}"` : ""} ${s.clipPath ? `clip-path="url(#${s.clipPath})"` : ""}>${s.children.map((c) => renderSvg(c, defsOut, font)).join("")}</g>`;
    case "path":
      return `<path d="${s.d}" ${paint(s)}/>`;
    case "circle":
      return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${paint(s)}/>`;
    case "ellipse":
      return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" ${paint(s)}/>`;
    case "rect":
      return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.rx ?? 0}" ${paint(s)}/>`;
    case "text":
      return `<text x="${s.x}" y="${s.y}" font-size="${s.size}" font-weight="${s.weight ?? "normal"}" font-family="${font}" ${paint(s)}>${s.text}</text>`;
  }
}
