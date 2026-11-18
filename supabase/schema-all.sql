-- Watchary: TÜM şema (tek seferde çalıştır). SQL Editor'e yapıştırıp Run'a bas.

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


-- Watchary: 2. aşama şeması (profiller + herkese açık yorumlar)
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır. schema.sql'den SONRA çalıştırılmalı.

-- ---------- Profiller ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  handle     text not null,
  name       text not null default '',
  bio        text not null default '',
  location   text not null default '',
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_handle_format check (handle ~ '^[a-z0-9_]{3,20}$')
);

-- Kullanıcı adı benzersiz olmalı
create unique index if not exists profiles_handle_key on public.profiles (handle);

alter table public.profiles enable row level security;

drop policy if exists "profiles select all" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles delete own" on public.profiles;

-- Giriş yapmış herkes profilleri görebilir; yalnızca sahibi değiştirir.
create policy "profiles select all" on public.profiles
  for select to authenticated using (true);
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles delete own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- ---------- Yorumlar / incelemeler ----------
create table if not exists public.reviews (
  id          text primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  media_key   text not null,            -- "tv:123" ya da "movie:456"
  media_type  text not null check (media_type in ('movie', 'tv')),
  media_id    integer not null,
  media_title text not null default '',
  media_year  text not null default '',
  media_poster text,
  season      integer,
  episode     integer,
  rating      numeric(2, 1),
  text        text not null default '',
  spoiler     boolean not null default false,
  liked       boolean not null default false,
  rewatch     boolean not null default false,
  watched_on  date,
  created_at  timestamptz not null default now()
);

create index if not exists reviews_media_idx on public.reviews (media_key, season, episode, created_at desc);
create index if not exists reviews_user_idx on public.reviews (user_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "reviews select all" on public.reviews;
drop policy if exists "reviews insert own" on public.reviews;
drop policy if exists "reviews update own" on public.reviews;
drop policy if exists "reviews delete own" on public.reviews;

create policy "reviews select all" on public.reviews
  for select to authenticated using (true);
create policy "reviews insert own" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "reviews update own" on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "reviews delete own" on public.reviews
  for delete to authenticated using ((select auth.uid()) = user_id);
