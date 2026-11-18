-- Watchary: 1. aşama şeması
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır.

create table if not exists public.library (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Satır güvenliği: her kullanıcı yalnızca kendi satırını görür ve değiştirir.
alter table public.library enable row level security;

drop policy if exists "library select own" on public.library;
drop policy if exists "library insert own" on public.library;
drop policy if exists "library update own" on public.library;
drop policy if exists "library delete own" on public.library;

create policy "library select own" on public.library
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "library insert own" on public.library
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "library update own" on public.library
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "library delete own" on public.library
  for delete to authenticated using ((select auth.uid()) = user_id);
