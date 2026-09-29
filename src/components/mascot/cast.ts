/**
 * Which character plays which mood, decided once per app start: every mood gets a goose or a duckling at random,
 * and both always get some. (The visits pick their character per visit instead.) No React Native imports —
 * testable in Node.
 */
import { MOODS, SPECIES, type Mood, type Species } from "./art";

export type Cast = Record<Mood, Species>;

/** `drawn(species, mood)`: whether that character has that mood (a mood nobody has falls back to the goose). */
export function castMascots(drawn: (species: Species, mood: Mood) => boolean, random: () => number = Math.random): Cast {
  const pick = (options: readonly Species[]): Species => options[Math.floor(random() * options.length)] ?? "goose";
  const options = Object.fromEntries(MOODS.map((mood) => [mood, SPECIES.filter((s) => drawn(s, mood))])) as Record<
    Mood,
    Species[]
  >;
  const cast = Object.fromEntries(MOODS.map((mood) => [mood, pick(options[mood])])) as Cast;

  // Geese and ducklings should mix: if the dice gave every mood to one character, hand one mood that could go
  // either way to the other.
  const flexible = MOODS.filter((mood) => options[mood].length > 1);
  if (new Set(Object.values(cast)).size === 1 && flexible.length > 1) {
    const mood = flexible[Math.floor(random() * flexible.length)];
    cast[mood] = pick(options[mood].filter((s) => s !== cast[mood]));
  }
  return cast;
}
