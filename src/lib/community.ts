import { useMemo } from "react";

import { useAuth } from "./auth-store";
import { supabase } from "./supabase";
import { Profile, Review, useStore } from "./store";
import { MediaRef } from "./types";
import { useAsync } from "./use-async";

// ---------- Kullanıcı adı ve profil ----------

const TR_MAP: Record<string, string> = { ı: "i", ğ: "g", ü: "u", ş: "s", ö: "o", ç: "c", İ: "i" };

/** Kullanıcı adını küçük harf, rakam ve alt çizgiye çevirir (3-20 karakter). */
export function normalizeHandle(raw: string): string {
  let h = raw
    .trim()
    .replace(/^@/, "")
    .replace(/[ığüşöçİ]/g, (c) => TR_MAP[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  while (h.length < 3) h += "0";
  return h;
}

const TAKEN = "Bu kullanıcı adı alınmış. Başka bir tane dene.";

/** Profili buluta yazar. Hata mesajı döner, başarılıysa null. */
export async function saveProfile(p: Profile): Promise<string | null> {
  const uid = useAuth.getState().session?.user.id;
  if (!uid) return "Giriş yapılmamış.";
  const { error } = await supabase.from("profiles").upsert({
    id: uid,
    handle: normalizeHandle(p.handle),
    name: p.name,
    bio: p.bio,
    location: p.location,
    avatar_url: p.avatarUri && p.avatarUri.startsWith("http") ? p.avatarUri : null,
  });
  if (!error) return null;
  if (error.code === "23505") return TAKEN;
  return error.message;
}

/** Hesabın profil satırı yoksa cihazdakinden oluşturur; kullanıcı adı doluysa sonuna rakam ekler. */
export async function ensureProfile(uid: string): Promise<void> {
  const { data, error } = await supabase.from("profiles").select("id").eq("id", uid).maybeSingle();
  if (error || data) return;
  const local = useStore.getState().profile;
  let handle = normalizeHandle(local.handle);
  for (let i = 0; i < 5; i++) {
    const err = await saveProfile({ ...local, handle });
    if (!err) {
      if (handle !== local.handle) useStore.getState().updateProfile({ handle });
      return;
    }
    if (err !== TAKEN) return;
    handle = `${normalizeHandle(handle).slice(0, 16)}${Math.floor(100 + Math.random() * 900)}`;
  }
}

export type PublicProfile = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  location: string;
  avatarUrl: string | null;
};

export type ProfileRow = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  location: string;
  avatar_url: string | null;
};

export const toProfile = (r: ProfileRow): PublicProfile => ({
  id: r.id,
  handle: r.handle,
  name: r.name,
  bio: r.bio,
  location: r.location,
  avatarUrl: r.avatar_url,
});

export async function fetchProfileByHandle(handle: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,handle,name,bio,location,avatar_url")
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toProfile(data as ProfileRow) : null;
}

// ---------- Yorumlar ----------

export type ReviewRow = {
  id: string;
  user_id: string;
  media_key: string;
  media_type: "movie" | "tv";
  media_id: number;
  media_title: string;
  media_year: string;
  media_poster: string | null;
  season: number | null;
  episode: number | null;
  rating: number | null;
  text: string;
  spoiler: boolean;
  liked: boolean;
  rewatch: boolean;
  watched_on: string | null;
  created_at: string;
  profiles?: { handle: string; name: string; avatar_url: string | null } | null;
};

export function reviewToRow(r: Review, uid: string) {
  return {
    id: r.id,
    user_id: uid,
    media_key: r.ref.key,
    media_type: r.ref.type,
    media_id: r.ref.id,
    media_title: r.ref.title,
    media_year: r.ref.year,
    media_poster: r.ref.posterUrl,
    season: r.season,
    episode: r.episode,
    rating: r.rating,
    text: r.text,
    spoiler: r.spoiler,
    liked: r.liked,
    rewatch: r.rewatch,
    watched_on: r.watchedOn,
    created_at: new Date(r.createdAt).toISOString(),
  };
}

export function rowToReview(row: ReviewRow): Review {
  const ref: MediaRef = {
    key: row.media_key,
    type: row.media_type,
    id: row.media_id,
    title: row.media_title,
    year: row.media_year,
    releaseDate: "",
    posterUrl: row.media_poster,
    backdropUrl: null,
    overview: "",
    rating: 0,
    genreIds: [],
  };
  return {
    id: row.id,
    ref,
    rating: row.rating,
    text: row.text,
    spoiler: row.spoiler,
    liked: row.liked,
    rewatch: row.rewatch,
    watchedOn: row.watched_on ?? row.created_at.slice(0, 10),
    season: row.season,
    episode: row.episode,
    createdAt: new Date(row.created_at).getTime(),
    userId: row.user_id,
    authorName: row.profiles?.name,
    authorHandle: row.profiles?.handle,
    authorAvatar: row.profiles?.avatar_url ?? null,
  };
}

export const REVIEW_SELECT = "*, profiles(handle,name,avatar_url)";

/** Bir yapımın (ya da tek bir bölümün) herkese açık yorumları. */
export async function fetchReviews(
  mediaKey: string,
  season?: number,
  episode?: number,
): Promise<Review[]> {
  let q = supabase.from("reviews").select(REVIEW_SELECT).eq("media_key", mediaKey);
  if (season !== undefined && episode !== undefined) {
    q = q.eq("season", season).eq("episode", episode);
  }
  const { data, error } = await q.order("created_at", { ascending: false }).limit(60);
  if (error) throw new Error(error.message);
  return (data as unknown as ReviewRow[]).map(rowToReview);
}

export async function fetchUserReviews(userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data as unknown as ReviewRow[]).map(rowToReview);
}

/**
 * Kendi yorumların cihazdan (anında görünür), diğer kullanıcıların yorumları buluttan gelir.
 * Bulut okunamazsa yalnızca kendi yorumların gösterilir.
 */
export function useReviews(mediaKey: string, season?: number, episode?: number) {
  const uid = useAuth((s) => s.session?.user.id);
  const allLocal = useStore((s) => s.reviews);
  const remote = useAsync(() => fetchReviews(mediaKey, season, episode), [mediaKey, season, episode]);

  const reviews = useMemo(() => {
    const exact = season !== undefined && episode !== undefined;
    const mine = allLocal.filter(
      (r) => r.ref.key === mediaKey && (!exact || (r.season === season && r.episode === episode)),
    );
    const others = (remote.data ?? []).filter((r) => r.userId !== uid);
    return [...mine, ...others].sort((a, b) => b.createdAt - a.createdAt);
  }, [allLocal, remote.data, uid, mediaKey, season, episode]);

  return { reviews, loading: remote.loading && !remote.data };
}
