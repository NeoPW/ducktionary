-- Ducktionary cloud backups.
--
-- One row = one complete snapshot of a user's library (JSON). Rows are immutable; the newest 30 per
-- user are kept. Row Level Security limits every signed-in user to their own rows, and the public
-- ("anon") role gets no access at all — the publishable key shipped in the app can reach nothing else.
--
-- Apply once: Supabase dashboard → SQL Editor → paste this file → Run   (or `supabase db push`).

create table if not exists public.backups (
  id             bigint generated always as identity primary key,
  user_id        uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  app_version    text        not null check (char_length(app_version) <= 32),
  schema_version integer     not null check (schema_version between 1 and 1000),
  book_count     integer     not null check (book_count between 0 and 100000),
  data           jsonb       not null,
  -- Even a legitimate account can't fill the database: ~1 MB covers thousands of books.
  constraint backups_data_size check (pg_column_size(data) <= 5 * 1024 * 1024)
);

create index if not exists backups_user_created_idx on public.backups (user_id, created_at desc);

-- ─── Access ────────────────────────────────────────────────────────────────

alter table public.backups enable row level security;

-- Nobody without a session gets anything; signed-in users get exactly the operations below.
revoke all on public.backups from anon;
revoke all on public.backups from authenticated;
grant select, insert, delete on public.backups to authenticated;

drop policy if exists "Read own backups" on public.backups;
create policy "Read own backups" on public.backups
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Create own backups" on public.backups;
create policy "Create own backups" on public.backups
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own backups" on public.backups;
create policy "Delete own backups" on public.backups
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- No update policy (and no update grant): a backup never changes after it is written.

-- ─── Keep the newest 30 backups per user ──────────────────────────────────

create or replace function public.prune_old_backups()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.backups
  where user_id = new.user_id
    and id not in (
      select id from public.backups
      where user_id = new.user_id
      order by created_at desc, id desc
      limit 30
    );
  return null;
end;
$$;

drop trigger if exists prune_old_backups on public.backups;
create trigger prune_old_backups
  after insert on public.backups
  for each row execute function public.prune_old_backups();
