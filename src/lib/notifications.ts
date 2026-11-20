import { useEffect } from "react";
import { AppState } from "react-native";
import { create } from "zustand";

import { useAuth } from "./auth-store";
import { supabase } from "./supabase";
import { useStore } from "./store";

export type NotificationItem = {
  id: string;
  kind: "follow" | "like" | "comment";
  at: number;
  actor: { id: string; name: string; handle: string; avatar: string | null };
  /** Beğeni ve yorumlarda, ilgili incelemenin kimliği */
  reviewId?: string;
  title?: string;
  season?: number | null;
  episode?: number | null;
  /** Yorumun metni */
  text?: string;
};

type NotifState = { items: NotificationItem[]; loaded: boolean };

export const useNotifications = create<NotifState>(() => ({ items: [], loaded: false }));

export function clearNotifications() {
  useNotifications.setState({ items: [], loaded: false });
}

type ProfileJoin = { id: string; handle: string; name: string; avatar_url: string | null } | null;
type ReviewJoin = { user_id: string; media_title: string; season: number | null; episode: number | null } | null;

const actorOf = (p: ProfileJoin, fallbackId: string) => ({
  id: p?.id ?? fallbackId,
  name: p?.name ?? "Kullanıcı",
  handle: p?.handle ?? "",
  avatar: p?.avatar_url ?? null,
});

const PROFILE = "id,handle,name,avatar_url";
const REVIEW = "user_id,media_title,season,episode";

/**
 * Bildirimleri hesaplar: yeni takipçiler, incelemelerine gelen beğeniler ve yorumlar.
 * Ayrı bir tablo yoktur, mevcut tablolardan türetilir.
 */
export async function refreshNotifications(): Promise<void> {
  const uid = useAuth.getState().session?.user.id;
  if (!uid) return;

  const [follows, likes, comments] = await Promise.all([
    supabase
      .from("follows")
      .select(`created_at, follower_id, p:profiles!follows_follower_id_fkey(${PROFILE})`)
      .eq("following_id", uid)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("review_likes")
      .select(`created_at, review_id, user_id, p:profiles(${PROFILE}), reviews!inner(${REVIEW})`)
      .eq("reviews.user_id", uid)
      .neq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("review_comments")
      .select(`id, created_at, review_id, user_id, text, p:profiles(${PROFILE}), reviews!inner(${REVIEW})`)
      .eq("reviews.user_id", uid)
      .neq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Hepsi başarısızsa (ör. tablolar yoksa) mevcut liste korunur
  if (follows.error && likes.error && comments.error) {
    console.warn("Bildirimler okunamadı:", follows.error.message);
    return;
  }

  const items: NotificationItem[] = [];

  for (const f of (follows.data ?? []) as unknown as { created_at: string; follower_id: string; p: ProfileJoin }[]) {
    items.push({
      id: `f:${f.follower_id}`,
      kind: "follow",
      at: new Date(f.created_at).getTime(),
      actor: actorOf(f.p, f.follower_id),
    });
  }

  for (const l of (likes.data ?? []) as unknown as {
    created_at: string;
    review_id: string;
    user_id: string;
    p: ProfileJoin;
    reviews: ReviewJoin;
  }[]) {
    items.push({
      id: `l:${l.review_id}:${l.user_id}`,
      kind: "like",
      at: new Date(l.created_at).getTime(),
      actor: actorOf(l.p, l.user_id),
      reviewId: l.review_id,
      title: l.reviews?.media_title,
      season: l.reviews?.season,
      episode: l.reviews?.episode,
    });
  }

  for (const c of (comments.data ?? []) as unknown as {
    id: string;
    created_at: string;
    review_id: string;
    user_id: string;
    text: string;
    p: ProfileJoin;
    reviews: ReviewJoin;
  }[]) {
    items.push({
      id: `c:${c.id}`,
      kind: "comment",
      at: new Date(c.created_at).getTime(),
      actor: actorOf(c.p, c.user_id),
      reviewId: c.review_id,
      title: c.reviews?.media_title,
      season: c.reviews?.season,
      episode: c.reviews?.episode,
      text: c.text,
    });
  }

  items.sort((a, b) => b.at - a.at);
  useNotifications.setState({ items: items.slice(0, 60), loaded: true });
}

/** Okunmamış bildirim sayısı. */
export function useUnreadCount(): number {
  const seenAt = useStore((s) => s.notifSeenAt);
  return useNotifications((s) => s.items.filter((i) => i.at > seenAt).length);
}

/** Giriş yapılınca, uygulama öne gelince ve dakikada bir bildirimleri tazeler. */
export function useNotificationPolling() {
  const uid = useAuth((s) => s.session?.user.id ?? null);

  useEffect(() => {
    if (!uid) return;
    void refreshNotifications();
    const timer = setInterval(() => void refreshNotifications(), 60_000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshNotifications();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [uid]);
}
