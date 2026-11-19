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
