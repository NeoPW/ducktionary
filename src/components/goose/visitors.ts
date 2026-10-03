/**
 * Who may visit and how often: every single visit — each pop-up look doing each of its acts, and each waddler —
 * has its own on/off switch and weight. Pure (no React Native), so the chances can be checked in Node.
 */
import { PEEK_LOOKS, SPECIES, type PeekLook, type PeekPose, type Species } from "@/components/mascot/art";

/** What a pop-up visitor does once it's up. */
export type PopupAct = "honk" | "look" | "peck" | "suspicious" | "wink" | "wave" | "steal";

/** Each act, the pose it needs (and shows in previews), and how it reads in the list. */
export const POPUP_ACTS: readonly { act: PopupAct; pose: PeekPose; label: string }[] = [
  { act: "honk", pose: "honk", label: "Honks" },
  { act: "look", pose: "blink", label: "Looks around" },
  { act: "peck", pose: "rest", label: "Pecks at the screen" },
  { act: "suspicious", pose: "suspicious", label: "Peeks suspiciously" },
  { act: "wink", pose: "wink", label: "Winks" },
  { act: "wave", pose: "wave", label: "Waves" },
  { act: "steal", pose: "steal", label: "Steals something" },
];

export type Visitor =
  | { id: string; kind: "popup"; species: Species; look: PeekLook; act: PopupAct; pose: PeekPose; label: string }
  | { id: string; kind: "waddle"; species: Species; label: string };
export type VisitorId = string;

/** The groups the visitors page shows, in order. */
export const VISITOR_GROUPS: readonly { id: string; title: string }[] = [
  { id: "goose", title: "Goose pops up" },
  { id: "duckling", title: "Duckling peeks over the edge" },
  { id: "duckling-wings", title: "Duckling flaps its wings" },
  { id: "waddle", title: "Waddling by" },
];

const quack = (species: Species, label: string) => (species === "duckling" && label === "Honks" ? "Quacks" : label);

/** Every possible visitor. Which of them have drawings is decided by the app (see AVAILABLE_VISITORS). */
export const VISITORS: readonly (Visitor & { group: string })[] = [
  ...PEEK_LOOKS.flatMap(({ look, species }) =>
    POPUP_ACTS.map(({ act, pose, label }) => ({
      id: `${look}:${act}`,
      kind: "popup" as const,
      species,
      look,
      act,
      pose,
      label: quack(species, label),
      group: look,
    })),
  ),
  ...SPECIES.map((species) => ({
    id: `${species}:waddle`,
    kind: "waddle" as const,
    species,
    label: species === "goose" ? "Goose waddles across" : "Duckling waddles across",
    group: "waddle",
  })),
];

/** Off keeps the weight, so switching a visitor back on restores its old chance. Weights are 0–100. */
export type VisitorChoice = { on: boolean; weight: number };
export type VisitorSettings = {
  visitors: Record<VisitorId, VisitorChoice>;
  /** Share of pop-ups where a goose and a duckling pop up together (0–0.5). */
  pairs: { on: boolean; share: number };
};

export const MAX_PAIR_SHARE = 0.5;

/**
 * Close to the old mix: the goose and the ducklings pop up about equally often (the goose has fewer acts, so each
 * weighs more; honking comes twice as often as the rest), and about three in ten visits are waddles.
 */
function defaultWeight(visitor: Visitor): number {
  if (visitor.kind === "waddle") return 60;
  const each = visitor.species === "goose" ? 20 : 9;
  return visitor.act === "honk" ? each * 2 : each;
}

export const DEFAULT_VISITOR_SETTINGS: VisitorSettings = {
  visitors: Object.fromEntries(VISITORS.map((v) => [v.id, { on: true, weight: defaultWeight(v) }])),
  pairs: { on: true, share: 0.2 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Reads the stored JSON; anything missing or malformed falls back to the default. */
export function parseVisitorSettings(raw: string | null): VisitorSettings {
  let data: unknown = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    // Default below.
  }
  const stored = isObject(data) && isObject(data.visitors) ? data.visitors : {};
  const visitors = { ...DEFAULT_VISITOR_SETTINGS.visitors };
  for (const { id } of VISITORS) {
    const choice = stored[id];
    if (isObject(choice) && typeof choice.on === "boolean" && typeof choice.weight === "number" && Number.isFinite(choice.weight)) {
      visitors[id] = { on: choice.on, weight: clamp(Math.round(choice.weight), 0, 100) };
    }
  }
  const pairs = isObject(data) && isObject(data.pairs) ? data.pairs : null;
  return {
    visitors,
    pairs:
      pairs && typeof pairs.on === "boolean" && typeof pairs.share === "number" && Number.isFinite(pairs.share)
        ? { on: pairs.on, share: clamp(pairs.share, 0, MAX_PAIR_SHARE) }
        : DEFAULT_VISITOR_SETTINGS.pairs,
  };
}

/** The weight a visitor really has: 0 when it's off or its drawings aren't there. */
const weightOf = (settings: VisitorSettings, available: ReadonlySet<VisitorId>, id: VisitorId) => {
  const choice = settings.visitors[id];
  return choice?.on && available.has(id) ? choice.weight : 0;
};

/** Each visitor's share of all visits (0–1); all zero when nobody may visit. */
export function visitorShares(settings: VisitorSettings, available: ReadonlySet<VisitorId>): Record<VisitorId, number> {
  const total = VISITORS.reduce((sum, v) => sum + weightOf(settings, available, v.id), 0);
  return Object.fromEntries(VISITORS.map((v) => [v.id, total ? weightOf(settings, available, v.id) / total : 0]));
}

/** Draws a visitor by weight, among those passing `filter`; null when none has a chance. */
export function pickVisitor(
  settings: VisitorSettings,
  available: ReadonlySet<VisitorId>,
  random: () => number = Math.random,
  filter: (visitor: Visitor) => boolean = () => true,
): Visitor | null {
  const candidates = VISITORS.filter((v) => filter(v) && weightOf(settings, available, v.id) > 0);
  const total = candidates.reduce((sum, v) => sum + weightOf(settings, available, v.id), 0);
  let left = random() * total;
  for (const visitor of candidates) {
    left -= weightOf(settings, available, visitor.id);
    if (left < 0) return visitor;
  }
  return candidates.at(-1) ?? null;
}

/**
 * The second pop-up of a pair: a pop-up of the other species, by weight. Null when pairs are off, didn't come
 * up this time, or the other species has no pop-up switched on.
 */
export function pickPartner(
  settings: VisitorSettings,
  available: ReadonlySet<VisitorId>,
  first: Visitor,
  random: () => number = Math.random,
): Visitor | null {
  if (first.kind !== "popup" || !settings.pairs.on || random() >= settings.pairs.share) return null;
  return pickVisitor(settings, available, random, (v) => v.kind === "popup" && v.species !== first.species);
}

export const anyVisitor = (settings: VisitorSettings, available: ReadonlySet<VisitorId>) =>
  VISITORS.some((v) => weightOf(settings, available, v.id) > 0);
