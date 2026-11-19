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


-- Watchary: 3. aşama şeması (takip sistemi, gerçek akış, beğeni ve yorumlar)
-- Supabase panelinde SQL Editor'e yapıştırıp çalıştır. schema.sql ve schema-2.sql'den SONRA çalıştırılmalı.

-- ---------- Takip ----------
create table if not exists public.follows (
  follower_id  uuid not null,
  following_id uuid not null,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_follower_id_fkey  foreign key (follower_id)  references public.profiles (id) on delete cascade,
  constraint follows_following_id_fkey foreign key (following_id) references public.profiles (id) on delete cascade,
  constraint follows_not_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
drop policy if exists "follows select all" on public.follows;
drop policy if exists "follows insert own" on public.follows;
drop policy if exists "follows delete own" on public.follows;

create policy "follows select all" on public.follows
  for select to authenticated using (true);
create policy "follows insert own" on public.follows
  for insert to authenticated with check ((select auth.uid()) = follower_id);
create policy "follows delete own" on public.follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- ---------- İnceleme beğenileri ----------
create table if not exists public.review_likes (
  review_id  text not null references public.reviews (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_likes enable row level security;
drop policy if exists "likes select all" on public.review_likes;
drop policy if exists "likes insert own" on public.review_likes;
drop policy if exists "likes delete own" on public.review_likes;

create policy "likes select all" on public.review_likes
  for select to authenticated using (true);
create policy "likes insert own" on public.review_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "likes delete own" on public.review_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- İnceleme yorumları ----------
create table if not exists public.review_comments (
  id         uuid primary key default gen_random_uuid(),
  review_id  text not null references public.reviews (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  text       text not null check (char_length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists review_comments_review_idx on public.review_comments (review_id, created_at);

alter table public.review_comments enable row level security;
drop policy if exists "comments select all" on public.review_comments;
drop policy if exists "comments insert own" on public.review_comments;
drop policy if exists "comments delete own" on public.review_comments;

create policy "comments select all" on public.review_comments
  for select to authenticated using (true);
create policy "comments insert own" on public.review_comments
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "comments delete own" on public.review_comments
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------- Aktiviteler (izledi, bölüm izledi, puanladı) ----------
-- Yalnızca sahibi ve onu takip edenler görebilir.
create table if not exists public.activities (
  id           text primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  kind         text not null check (kind in ('watched', 'episode', 'rated', 'review')),
  media_key    text not null,
  media_type   text not null check (media_type in ('movie', 'tv')),
  media_id     integer not null,
  media_title  text not null default '',
  media_year   text not null default '',
  media_poster text,
  detail       text,
  rating       numeric(2, 1),
  created_at   timestamptz not null default now()
);
create index if not exists activities_user_idx on public.activities (user_id, created_at desc);

alter table public.activities enable row level security;
drop policy if exists "activities select followed" on public.activities;
drop policy if exists "activities insert own" on public.activities;
drop policy if exists "activities delete own" on public.activities;

create policy "activities select followed" on public.activities
  for select to authenticated using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.follows f
      where f.follower_id = (select auth.uid()) and f.following_id = activities.user_id
    )
  );
create policy "activities insert own" on public.activities
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "activities delete own" on public.activities
  for delete to authenticated using ((select auth.uid()) = user_id);
