# Mascot art brief — the Ducktionary goose

Round one: **the white goose only** — 5 full-body moods + 6 peek-head poses (11 images).
Everything you add replaces the vector fallback in the app, the goose visits, the icons and the gallery.

> **Status (28 Sep 2026): paused at 1 / 11 — to be finished later** (ChatGPT image quota).
> - Done: `goose/reading` (processed and live in the app).
> - Still to draw: `sleepy`, `celebrating`, `confused`, `scanning`, and all six `goose-peek` poses.
> - `npm run mascots` always shows the current state.

Sizing, background removal, the sticker edge and compression are done by `npm run mascots:process` —
you only generate and save the originals.

The images in `example_images/` are other artists' work. Use them as *style direction only* —
don't upload them to a generator as a style reference, and don't ask for "in the style of" a named artist.

## Workflow

1. **Find the character.** Paste the style block + the character-sheet prompt below. Generate until one goose
   feels right. Save it in `docs/mascot-art/reference/` — the approved goose is `reference/base.png`.
2. **Keep it consistent.** For every image below, give the generator that approved goose as the reference:
   - ChatGPT (image generation): attach the reference and start the prompt with
     *"Same goose character as the attached image, same drawing style."*
   - Midjourney: add `--cref <url of your approved goose>` (and optionally `--sref` of the same image).
3. **Generate each image** from the prompt list. Pick the one that matches the others best — a slightly weaker
   drawing that matches beats a great one that looks like a different goose.
4. **Save the original, untouched,** as `docs/mascot-art/raw/<folder>/<name>.png` (`.jpg` and `.webp` work too),
   e.g. `docs/mascot-art/raw/goose/sleepy.png`. Any plain background is fine — a white or light-grey one, or
   the painted checkerboard ChatGPT sometimes produces instead of real transparency.
5. **Run `npm run mascots:process`.** For every raw image it removes the background, redraws an even white
   sticker edge, crops and fits it into the standard frame, compresses it, and saves the result to
   `assets/mascots/<folder>/<name>.png`. Then it checks everything and rebuilds `docs/mascot-gallery.html` —
   open it to see the progress. Look at the result: if part of the drawing went missing, the background was too
   close to the goose's colours — regenerate on a plain light-grey background.

## Style block (paste at the start of every prompt)

> Cute chubby white domestic goose, soft kawaii illustration, thin warm-brown hand-drawn outline, soft pastel
> airbrushed shading, cream-white feathers with a warm shadow underneath, a flat orange bill with a small knob at
> its base, tiny black dot eyes, rosy pink blush on the cheeks, short orange legs with little webbed feet, a few
> tiny yellow emphasis strokes near the head, die-cut sticker look with a thin white border, isolated, plain
> transparent background, centered.
>
> Avoid: text, letters, watermark, signature, scenery, ground, realistic feathers, heavy black shadows, gradient
> background, frames.

## Character sheet (step 1)

> [style block] Character sheet of the same goose: standing 3/4 view facing left, front view, and side view,
> evenly spaced, same size, neutral happy expression.

## Full-body moods — `assets/mascots/goose/<name>.png`

**Output 1024 × 1024** (the process script frames it: goose at ~80% of the height, feet on a shared ground
line). Generate full body, 3/4 view facing left, any aspect ratio.

| File | Prompt (after the style block) |
|---|---|
| `reading.png` ✓ | Standing, holding a small open book with a dark green cover in both wings, looking down at the pages, calm and content. |
| `sleepy.png` | Flopped on its back, orange feet up in the air, eyes closed, fast asleep, peaceful and a little silly. |
| `celebrating.png` | Standing, both wings raised high in joy, eyes closed in happy upside-down arcs, bill open in a big smile, a few small sparkles around it. |
| `confused.png` | Standing, head tilted to one side, one eyebrow raised, a small blue sweat drop near its head, puzzled. |
| `scanning.png` | Standing, holding a round magnifying glass up to one eye, curious and focused, the eye looks big through the lens. |

## Peek-head poses — `assets/mascots/goose-peek/<name>.png`

**Output 1200 × 960** (the process script right-aligns the neck). Only the head and a long neck, entering from the **right edge** of the
image and facing left — as if the goose pokes its head into the screen from the side. The neck must leave the
right edge **at the same height and thickness in all six images**, so the app can swap them mid-animation.
Tip: generate `rest.png` first, then use it as the reference for the other five.

| File | Prompt (after the style block) |
|---|---|
| `rest.png` | Only the head and long neck of the goose, entering from the right edge of the image, facing left, curious neutral expression. |
| `honk.png` | Same framing. Bill wide open mid-honk, eyes wide, very loud and a bit rude. |
| `blink.png` | Same framing. Eyes closed mid-blink, relaxed. |
| `suspicious.png` | Same framing. Eyes narrowed, one brow lowered, deeply suspicious. |
| `wink.png` | Same framing. Winking one eye, cheeky and charming. |
| `steal.png` | Same framing. Holding a tiny dark green book in its bill, eyes wide, caught stealing it. |

The speech bubbles ("HONK!", "mine now", …) are added by the app — **no text in the images**.

## Checklist before `npm run mascots:process`

- [ ] Original saved under `docs/mascot-art/raw/` with the exact names and folders from the tables above
- [ ] Plain, light, neutral background (white, light grey, or a painted checkerboard) — not a coloured one
- [ ] The whole goose is in the picture, nothing cut off (peek heads: only the neck may touch the right edge)
- [ ] All 11 look like the same goose; peek necks line up at the right edge
- [ ] You have the right to use the images (generator terms allow app use)

Once all five moods exist, the app shows only drawn geese (no mixing with the vector ducklings). The peek head
switches to the drawings once all six poses exist. `npm run mascots:icons` rebuilds the app icons from
`goose/reading.png`.
