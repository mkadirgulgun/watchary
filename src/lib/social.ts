import { create } from "zustand";

import { useAuth } from "./auth-store";
import {
  PublicProfile,
  ProfileRow,
  REVIEW_SELECT,
  ReviewRow,
  rowToReview,
  toProfile,
} from "./community";
import { Activity, Review } from "./store";
import { supabase } from "./supabase";
import { MediaRef } from "./types";

const meId = () => useAuth.getState().session?.user.id ?? null;

// ---------- Takip ----------

type SocialState = {
  /** Takip ettiklerimin kimlikleri */
  following: Record<string, true>;
  loaded: boolean;
};

export const useSocial = create<SocialState>(() => ({ following: {}, loaded: false }));

export const useIsFollowing = (userId: string | undefined) =>
  useSocial((s) => (userId ? !!s.following[userId] : false));

export async function loadFollowing(): Promise<void> {
  const uid = meId();
  if (!uid) return;
  const { data, error } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", uid);
  if (error) {
    console.warn("Takip listesi okunamadı:", error.message);
    return;
  }
  const following: Record<string, true> = {};
  for (const r of data as { following_id: string }[]) following[r.following_id] = true;
  useSocial.setState({ following, loaded: true });
}

export function clearSocial() {
  useSocial.setState({ following: {}, loaded: false });
}

/** Takip et / bırak. Ekran hemen güncellenir, hata olursa geri alınır. Hata mesajı ya da null döner. */
export async function setFollow(targetId: string, follow: boolean): Promise<string | null> {
  const uid = meId();
  if (!uid) return "Giriş yapılmamış.";
  const prev = useSocial.getState().following;
  const next = { ...prev };
  if (follow) next[targetId] = true;
  else delete next[targetId];
  useSocial.setState({ following: next });

  const { error } = follow
    ? await supabase.from("follows").insert({ follower_id: uid, following_id: targetId })
    : await supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", targetId);
  // 23505: zaten takip ediliyor, sorun değil
  if (error && error.code !== "23505") {
    useSocial.setState({ following: prev });
    return error.message;
  }
  return null;
}

export async function fetchFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [a, b] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);
  if (a.error) throw new Error(a.error.message);
  if (b.error) throw new Error(b.error.message);
  return { followers: a.count ?? 0, following: b.count ?? 0 };
}

const PROFILE_COLS = "id,handle,name,bio,location,avatar_url";

export async function fetchFollowList(
  userId: string,
  type: "followers" | "following",
): Promise<PublicProfile[]> {
  const followers = type === "followers";
  const { data, error } = await supabase
    .from("follows")
    .select(
      followers
        ? `created_at, p:profiles!follows_follower_id_fkey(${PROFILE_COLS})`
        : `created_at, p:profiles!follows_following_id_fkey(${PROFILE_COLS})`,
    )
    .eq(followers ? "following_id" : "follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data as unknown as { p: ProfileRow | null }[])
    .map((r) => r.p)
    .filter((p): p is ProfileRow => !!p)
    .map(toProfile);
}

/** Ad ya da kullanıcı adıyla kişi arar. */
export async function searchUsers(query: string): Promise<PublicProfile[]> {
  // PostgREST filtre sözdizimini bozan karakterleri at
  const q = query.replace(/[,()%*\\]/g, " ").trim().replace(/^@/, "");
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .or(`handle.ilike.%${q}%,name.ilike.%${q}%`)
    .limit(12);
  if (error) throw new Error(error.message);
  return (data as ProfileRow[]).map(toProfile);
}

// ---------- Aktiviteler ----------

export function activityToRow(a: Activity, uid: string) {
  return {
    id: a.id,
    user_id: uid,
    kind: a.kind,
    media_key: a.ref.key,
    media_type: a.ref.type,
    media_id: a.ref.id,
    media_title: a.ref.title,
    media_year: a.ref.year,
    media_poster: a.ref.posterUrl,
    detail: a.detail ?? null,
    rating: a.rating ?? null,
    created_at: new Date(a.at).toISOString(),
  };
}

type ActivityRow = {
  id: string;
  user_id: string;
  kind: "watched" | "episode" | "rated" | "review";
  media_key: string;
  media_type: "movie" | "tv";
  media_id: number;
  media_title: string;
  media_year: string;
  media_poster: string | null;
  detail: string | null;
  rating: number | null;
  created_at: string;
  profiles?: { handle: string; name: string; avatar_url: string | null } | null;
};

// ---------- Akış ----------

type Author = { userId: string; name: string; handle: string; avatar: string | null };

export type FeedReview = {
  type: "review";
  id: string;
  at: number;
  review: Review;
  likes: number;
  liked: boolean;
  comments: number;
};

export type FeedActivity = {
  type: "activity";
  id: string;
  at: number;
  kind: "watched" | "episode" | "rated";
  author: Author;
  ref: MediaRef;
  detail: string | null;
  rating: number | null;
};

export type FeedItem = FeedReview | FeedActivity;
export type FeedScope = "following" | "all" | "mine";

function mediaRef(r: {
  media_key: string;
  media_type: "movie" | "tv";
  media_id: number;
  media_title: string;
  media_year: string;
  media_poster: string | null;
}): MediaRef {
  return {
    key: r.media_key,
    type: r.media_type,
    id: r.media_id,
    title: r.media_title,
    year: r.media_year,
    releaseDate: "",
    posterUrl: r.media_poster,
    backdropUrl: null,
    overview: "",
    rating: 0,
    genreIds: [],
  };
}

const ACTIVITY_SELECT = "*, profiles(handle,name,avatar_url)";

/** Akışı getirir: takip ettiklerin, herkes ya da kendi paylaşımların. */
export async function fetchFeed(scope: FeedScope): Promise<FeedItem[]> {
  const uid = meId();
  if (!uid) return [];
  const ids =
    scope === "following" ? Object.keys(useSocial.getState().following) : scope === "mine" ? [uid] : null;
  if (ids && ids.length === 0) return [];

  let rq = supabase.from("reviews").select(REVIEW_SELECT);
  if (ids) rq = rq.in("user_id", ids);
  const reviewsReq = rq.order("created_at", { ascending: false }).limit(40);

  const activitiesReq = ids
    ? supabase
        .from("activities")
        .select(ACTIVITY_SELECT)
        .in("user_id", ids)
        .in("kind", ["watched", "episode", "rated"])
        .order("created_at", { ascending: false })
        .limit(40)
    : Promise.resolve({ data: [] as ActivityRow[], error: null });

  const [revRes, actRes] = await Promise.all([reviewsReq, activitiesReq]);
  if (revRes.error) throw new Error(revRes.error.message);
  if (actRes.error) throw new Error(actRes.error.message);

  const reviews = (revRes.data as unknown as ReviewRow[]).map(rowToReview);
  const reviewIds = reviews.map((r) => r.id);

  const likeCount: Record<string, number> = {};
  const likedByMe = new Set<string>();
  const commentCount: Record<string, number> = {};
  if (reviewIds.length > 0) {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from("review_likes").select("review_id,user_id").in("review_id", reviewIds),
      supabase.from("review_comments").select("review_id").in("review_id", reviewIds),
    ]);
    for (const l of (likesRes.data ?? []) as { review_id: string; user_id: string }[]) {
      likeCount[l.review_id] = (likeCount[l.review_id] ?? 0) + 1;
      if (l.user_id === uid) likedByMe.add(l.review_id);
    }
    for (const c of (commentsRes.data ?? []) as { review_id: string }[]) {
      commentCount[c.review_id] = (commentCount[c.review_id] ?? 0) + 1;
    }
  }

  const items: FeedItem[] = reviews.map((review) => ({
    type: "review",
    id: `rv:${review.id}`,
    at: review.createdAt,
    review,
    likes: likeCount[review.id] ?? 0,
    liked: likedByMe.has(review.id),
    comments: commentCount[review.id] ?? 0,
  }));

  for (const a of actRes.data as unknown as ActivityRow[]) {
    items.push({
      type: "activity",
      id: `ac:${a.id}`,
      at: new Date(a.created_at).getTime(),
      kind: a.kind as FeedActivity["kind"],
      author: {
        userId: a.user_id,
        name: a.profiles?.name ?? "Kullanıcı",
        handle: a.profiles?.handle ?? "",
        avatar: a.profiles?.avatar_url ?? null,
      },
      ref: mediaRef(a),
      detail: a.detail,
      rating: a.rating,
    });
  }

  return items.sort((x, y) => y.at - x.at).slice(0, 60);
}

// ---------- Beğeni ve yorum ----------

export async function setReviewLike(reviewId: string, like: boolean): Promise<string | null> {
  const uid = meId();
  if (!uid) return "Giriş yapılmamış.";
  const { error } = like
    ? await supabase.from("review_likes").insert({ review_id: reviewId, user_id: uid })
    : await supabase.from("review_likes").delete().eq("review_id", reviewId).eq("user_id", uid);
  if (error && error.code !== "23505") return error.message;
  return null;
}

export type ThreadComment = {
  id: string;
  userId: string;
  text: string;
  at: number;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
};

type CommentRow = {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
  profiles?: { handle: string; name: string; avatar_url: string | null } | null;
};

const toComment = (c: CommentRow): ThreadComment => ({
  id: c.id,
  userId: c.user_id,
  text: c.text,
  at: new Date(c.created_at).getTime(),
  authorName: c.profiles?.name ?? "Kullanıcı",
  authorHandle: c.profiles?.handle ?? "",
  authorAvatar: c.profiles?.avatar_url ?? null,
});

export type Thread = {
  review: Review;
  likes: number;
  liked: boolean;
  comments: ThreadComment[];
};

/** Tek bir inceleme, beğenileri ve yorumlarıyla. Yoksa null. */
export async function fetchThread(reviewId: string): Promise<Thread | null> {
  const uid = meId();
  const { data, error } = await supabase
    .from("reviews")
    .select(REVIEW_SELECT)
    .eq("id", reviewId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const [likesRes, commentsRes] = await Promise.all([
    supabase.from("review_likes").select("user_id").eq("review_id", reviewId),
    supabase
      .from("review_comments")
      .select("id,user_id,text,created_at, profiles(handle,name,avatar_url)")
      .eq("review_id", reviewId)
      .order("created_at", { ascending: true })
      .limit(200),
  ]);
  const likeRows = (likesRes.data ?? []) as { user_id: string }[];
  return {
    review: rowToReview(data as unknown as ReviewRow),
    likes: likeRows.length,
    liked: likeRows.some((l) => l.user_id === uid),
    comments: ((commentsRes.data ?? []) as unknown as CommentRow[]).map(toComment),
  };
}

export async function addReviewComment(
  reviewId: string,
  text: string,
): Promise<{ comment: ThreadComment | null; error: string | null }> {
  const uid = meId();
  if (!uid) return { comment: null, error: "Giriş yapılmamış." };
  const { data, error } = await supabase
    .from("review_comments")
    .insert({ review_id: reviewId, user_id: uid, text: text.trim() })
    .select("id,user_id,text,created_at, profiles(handle,name,avatar_url)")
    .single();
  if (error) return { comment: null, error: error.message };
  return { comment: toComment(data as unknown as CommentRow), error: null };
}

export async function deleteReviewComment(commentId: string): Promise<string | null> {
  const { error } = await supabase.from("review_comments").delete().eq("id", commentId);
  return error ? error.message : null;
}
