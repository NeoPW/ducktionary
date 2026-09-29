# Ducktionary

A cozy book log for Android (and iOS), built with Expo. Scan a book's barcode or search for it, rate it, note
what you thought, what it cost and how you got it — then browse your reading stats. A goose keeps you company.

## Run it

```bash
npm install
npx expo start        # open in Expo Go on your phone
```

Everything runs in Expo Go; no development build is needed.

All optional settings are listed in `.env.example`.

### Google Books (optional)

Book lookups use Open Library. To also search Google Books, create a key restricted to the Books API and put it in
`.env.local` (git-ignored), then restart with `npx expo start --clear`:

```
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=your-key
```

## Backups

Everything is stored on the phone. Two ways to keep a copy:

- **Cloud backup (optional):** with a Supabase project, signed-in users are backed up automatically and can
  restore on a new phone. Setup, security model and an attack test: [`supabase/README.md`](supabase/README.md).
  Without that config the feature is simply hidden.
- **Backup file:** *Settings → Backup file → Export* saves one JSON file anywhere; *Import* restores it.

## Checks

```bash
npx tsc --noEmit            # app types
npm run typecheck:scripts   # Node scripts in scripts/
npx expo lint
npm run supabase:check      # attack-test the backup server (after setting it up)
```

## Mascots

The mascot is a drawn white goose: five moods for the app's screens, plus pop-up poses and waddle frames for the
goose visits. The images live in `assets/mascots/`; how they are made is in `docs/mascot-art-brief.md`.

```bash
npm run mascots:generate  # draw one image with the OpenAI API (dry run unless --go; see the brief)
npm run mascots:process   # raw images in docs/mascot-art/raw/ → app-ready images in assets/mascots/
npm run mascots           # check the images, register them for the app, build docs/mascot-gallery.html
npm run mascots:icons     # rebuild the app icons from the goose
```

Open `docs/mascot-gallery.html` in a browser to see every image, a demo of the goose visits and the app icons.

## Where things are

- `src/app/` — screens (Expo Router): library, add/scan, stats, settings
- `src/db/` — on-device SQLite (books, migrations, sample data)
- `src/api/` — Open Library and Google Books lookups
- `src/stats/` — stats and chart data
- `src/theme/` — colour schemes and tokens
- `src/storage/` — on-device settings (kv-store) and the list of setting keys
- `src/sync/` — backups: snapshot format, Supabase access, backup files, the backup provider
- `supabase/` — backup server schema and setup checklist
- `patches/` — fixes for dependencies, applied on `npm install` (patch-package); remove each once upstream ships it
- `scripts/` — mascot tooling and the backup server check (Node, run through the npm scripts above)
