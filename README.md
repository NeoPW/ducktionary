# Ducktionary

A cozy book log for Android (and iOS), built with Expo. Scan a book's barcode or search for it, rate it, note
what you thought, what it cost and how you got it — then browse your reading stats. A goose keeps you company.

## Run it

```bash
npm install
npx expo start        # open in Expo Go on your phone
```

Everything runs in Expo Go; no development build is needed.

### Google Books (optional)

Book lookups use Open Library. To also search Google Books, create a key restricted to the Books API and put it in
`.env.local` (git-ignored), then restart with `npx expo start --clear`:

```
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=your-key
```

## Checks

```bash
npx tsc --noEmit            # app types
npm run typecheck:scripts   # Node scripts in scripts/
npx expo lint
```

## Mascots

The mascots (a goose and a few ducklings) are drawn in code in `src/components/mascot/shapes.ts` and are being
replaced by drawn images — **work in progress**, see `docs/mascot-art-brief.md` for the prompts and status.

```bash
npm run mascots:process   # raw images in docs/mascot-art/raw/ → app-ready images in assets/mascots/
npm run mascots           # check the images, register them for the app, build docs/mascot-gallery.html
npm run mascots:icons     # rebuild the app icons from the goose
```

Open `docs/mascot-gallery.html` in a browser to see every character, mood and goose visit.

## Where things are

- `src/app/` — screens (Expo Router): library, add/scan, stats, settings
- `src/db/` — on-device SQLite (books, migrations, sample data)
- `src/api/` — Open Library and Google Books lookups
- `src/stats/` — stats and chart data
- `src/theme/` — colour schemes and tokens
- `scripts/` — mascot tooling (Node, run through the npm scripts above)
