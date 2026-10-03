# local/ — personal data, never committed

Everything in this folder except this README is git-ignored. It holds real data for testing on your own phone.

- `example-library.json` — a Ducktionary backup file. When it exists, the empty library shows a
  "Load example library (dev)" button; you can also import it via *Settings → Backup file → Import*.
  Create it from a Bookstats CSV export with `npm run import:bookstats -- local/<export>.csv`.
- `bookstats-series.json` (optional) — series the Bookstats titles don't give away, applied by the importer:
  `{ "The Well of Ascension": { "name": "Mistborn", "position": 2 } }` (keys are titles as imported).
