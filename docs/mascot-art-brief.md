# Mascot art brief — the Ducktionary goose

The white goose: 5 full-body moods, 6 pop-up poses for the goose visits, and 2 waddle frames (13 images).

> **Status (29 Sep 2026): all 13 drawn.** `npm run mascots:generate` shows the current state; the concept
> explorations that led to the pop-up and waddle visits are in `docs/mascot-art/candidates/concept/` (git-ignored).

Sizing, background removal, the sticker edge and compression are done by `npm run mascots:process` —
you only generate and save the originals.

The images in `example_images/` are other artists' work. Use them as *style direction only* —
don't upload them to a generator as a style reference, and don't ask for "in the style of" a named artist.

## The character

The approved goose is [`reference/base.png`](mascot-art/reference/base.png). Every new image is drawn from it
(and from the finished images), so the set stays one character. The prompts — style block, the
same-character instruction and one line per image — live in [`scripts/mascot-prompts.ts`](../scripts/mascot-prompts.ts).

## Generating with the API (recommended)

`npm run mascots:generate` draws images with the OpenAI image API, paid per image (a few cents each), with
`base.png` and the finished images attached as references. Put `OPENAI_API_KEY=…` in `.env.local` (never with
`EXPO_PUBLIC_` — that would put the key into the app). A budget stop defaults to $4.50 (`MASCOT_BUDGET_USD`).

```bash
npm run mascots:generate                                   # what's done, what's left, what's been spent
npm run mascots:generate -- goose/celebrating              # dry run: references, prompt, rough cost — sends nothing
npm run mascots:generate -- goose/celebrating --go         # draw ONE candidate (costs money)
npm run mascots:generate -- goose/celebrating --go --note "wings raised higher"   # a retry with extra direction
npm run mascots:generate -- accept goose/celebrating 2     # use candidate 2 as the raw original
npm run mascots:process                                    # cut out, frame, compress → assets/mascots/
```

Candidates and the spending log stay in `docs/mascot-art/candidates/` (git-ignored). Look at each candidate
before accepting — a slightly weaker drawing that matches the others beats a great one that looks like a
different goose.

## Generating by hand (ChatGPT, Gemini, …)

Run the dry run above and paste the printed prompt, with `base.png` (and a finished goose) attached as
reference images. Save the original, untouched, as `docs/mascot-art/raw/<folder>/<name>.png` (`.jpg` and
`.webp` work too). Any plain light background is fine — also the painted checkerboard ChatGPT sometimes produces
instead of real transparency. Then run `npm run mascots:process`.

## Framing

- **Full-body moods** (`goose/<mood>`): full body, 3/4 view facing left, generated at 1024 × 1536. The process
  script frames them at 1024 × 1024: goose at ~80% of the height, feet on a shared ground line.
- **Pop-up poses** (`goose-peek/<pose>`): the upper body with both wings resting on the bottom edge, as if
  popping up over a windowsill; the cut is flush with the bottom of the image. Framed at 768 × 768. The app swaps
  the six poses mid-animation, so they must line up exactly: draw `rest`, then make every other pose as an
  **edit** of it (`--edit docs/mascot-art/candidates/goose-peek/rest-1.png --note "…"`), which keeps the body in
  place and only changes the face.
- **Waddle frames** (`goose-walk/step-1`, `step-2`): full body, side view, mid-step; `step-2` is an edit of
  `step-1` with the other foot lifted, so the two alternate as a walk. Framed at 768 × 768, feet on the ground line.
- Sets that animate together (the pop-up poses, the waddle frames) are cropped with one shared box by
  `mascots:process`, so swapping images never makes the goose jump.
- **One sticker:** everything (sparkles, sweat drops) must sit inside the single white sticker border. The
  process script keeps only the main sticker, so anything floating separately is cut off.
- **No text** in the images — the speech bubbles ("HONK!", "mine now", …) are added by the app.

## Checklist before `npm run mascots:process`

- [ ] Original saved under `docs/mascot-art/raw/` with the exact folder and name (see `npm run mascots:generate`)
- [ ] Plain, light, neutral or transparent background — not a coloured one
- [ ] The whole goose is in the picture, nothing cut off (pop-up poses: only the bottom cut touches the edge)
- [ ] It looks like the same goose as the others; pop-up poses and waddle frames line up with each other
- [ ] You have the right to use the image (generator terms allow app use)

The app only uses complete sets: goose visits pop up only when all six pop-up poses exist, and waddle only when
both frames exist. `npm run mascots:icons` rebuilds the app icons from `goose/reading.png`.
