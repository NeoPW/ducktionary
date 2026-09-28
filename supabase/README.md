# Backup server (Supabase) — setup

Ducktionary works without any server. With a Supabase project, signed-in users get an automatic cloud backup
and can restore their library on a new phone. This folder holds everything the server needs; there are no
secrets in the repo.

**How it stays safe in an open-source app**

- The app only ever contains the **publishable key**. Supabase designs it to be public — it can only reach what
  Row Level Security allows.
- **Nobody can create an account**: sign-ups and anonymous sign-ins are off; you add the users yourself.
- **Row Level Security**: a signed-in user can only read, add and delete *their own* backups. Backups can't be
  changed, each is capped at 5 MB, and the newest 30 per user are kept (`migrations/0001_backups.sql`).
- The **secret key is never used** by the app or any script — don't put it in `.env.local` or anywhere in the repo.
- `npm run supabase:check` attacks your project with the public key and fails if anything gets through.

## Setup (~15 minutes)

1. **Create a project** at <https://supabase.com/dashboard> → *New project*. Pick a region close to you
   (e.g. Frankfurt), set a strong database password and store it in your password manager.
2. **Lock down sign-in** — *Authentication → Sign In / Providers*:
   - turn **off** "Allow new users to sign up"
   - turn **off** "Allow anonymous sign-ins"
   - keep **Email** enabled; turn off every other provider
3. **Create the database table** — *SQL Editor* → *New query* → paste the whole of
   `supabase/migrations/0001_backups.sql` → *Run*. (Running it again is safe.)
4. **Check it** — *Advisors → Security Advisor* should show no warning for `backups`.
5. **Add the users** — *Authentication → Users → Add user → Create new user*: email, a strong password,
   tick **Auto Confirm User**. Repeat for everyone. Give each person their password over a private channel;
   they can change it in the app (*Settings → Account & backup → Change password*).
6. **Connect the app** — *Project Settings → API Keys*: copy the **Project URL** and the **publishable key**
   (`sb_publishable_…`) into `.env.local` in the repo root (git-ignored; see `.env.example`):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```

   Restart the dev server with `npx expo start --clear`. For EAS builds, add the same two values as EAS
   environment variables instead.
7. **Attack-test it** — add two test users (step 5), put their logins into `.env.local` as
   `SECURITY_CHECK_A_EMAIL`, `SECURITY_CHECK_A_PASSWORD`, `SECURITY_CHECK_B_EMAIL`, `SECURITY_CHECK_B_PASSWORD`,
   then run `npm run supabase:check`. Every line must show ✓. Delete the test users afterwards if you like.

## Good to know

- **Free projects pause after a week without any use.** Nothing is lost: you get an email and can resume the
  project from the dashboard. While paused, the app says it can't reach the backup server — the books on the
  phone are unaffected, and *Settings → Backup file → Export* still works.
- The free plan has no database backups of its own; the app keeps the last 30 backups per user itself, and the
  exported backup file is a second copy you control.
- To remove someone: *Authentication → Users → Delete user* — their backups are deleted with them.
