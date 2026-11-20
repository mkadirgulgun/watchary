import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { EpisodeNote, episodeKey, MediaRef, slim } from "./types";

export type Entry = {
  ref: MediaRef;
  watchlist: boolean;
  watched: boolean;
  favorite: boolean;
  rating: number | null; // 0.5 - 5
  runtime: number | null; // dk (film süresi ya da ortalama bölüm süresi)
  addedAt: number;
  watchedAt: number | null;
};

export type Review = {
  id: string;
  ref: MediaRef;
  rating: number | null;
  text: string;
  spoiler: boolean;
  liked: boolean;
  rewatch: boolean;
  watchedOn: string; // YYYY-MM-DD
  season: number | null;
  episode: number | null;
  createdAt: number;
  /** Yalnızca başkalarının yorumlarında dolu (buluttan gelir); kendi yorumlarında boş */
  userId?: string;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string | null;
};

export type Activity = {
  id: string;
  kind: "watched" | "episode" | "review" | "rated";
  ref: MediaRef;
  at: number;
  detail?: string;
  rating?: number | null;
};

export type PostComment = {
  id: string;
  text: string;
  createdAt: number;
};

export type CustomList = {
  id: string;
  name: string;
  description: string;
  items: MediaRef[];
  createdAt: number;
};

export type Profile = {
  name: string;
  handle: string;
  bio: string;
  location: string;
  /** https adresi ya da galeriden seçilen resmin data URI'si; yoksa baş harf gösterilir */
  avatarUri: string | null;
  coverUri: string | null;
};

type State = {
  entries: Record<string, Entry>;
  /** showKey -> { "1x3": zamanDamgası } */
  episodes: Record<string, Record<string, number>>;
  /** showKey -> { "1x3": bölüm notu (puan, his, en sevilen oyuncu) } */
  episodeNotes: Record<string, Record<string, EpisodeNote>>;
  reviews: Review[];
  activity: Activity[];
  lists: CustomList[];
  reminders: Record<string, true>;
  likes: Record<string, true>;
  /** gönderi kimliği -> kullanıcının o gönderiye yazdığı yorumlar */
  comments: Record<string, PostComment[]>;
  profile: Profile;
  onboarded: boolean;
  recentSearches: string[];
  /** Bu cihazdaki verinin sahibi olan hesabın kimliği (buluta yazılmaz) */
  ownerId: string | null;
  /** Bildirimler en son ne zaman açıldı (bundan yeni olanlar okunmamış sayılır) */
  notifSeenAt: number;
};

type Actions = {
  addComment: (postId: string, text: string) => void;
  deleteComment: (postId: string, commentId: string) => void;
  setEpisodeNote: (
    showKey: string,
    season: number,
    episode: number,
    patch: Partial<EpisodeNote>,
  ) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  toggleWatchlist: (ref: MediaRef) => void;
  toggleWatched: (ref: MediaRef, runtime?: number | null) => void;
  toggleFavorite: (ref: MediaRef) => void;
  setRating: (ref: MediaRef, rating: number | null) => void;
  setRuntime: (ref: MediaRef, runtime: number | null) => void;
  toggleEpisode: (
    show: MediaRef,
    season: number,
    episode: number,
    runtime?: number | null,
  ) => void;
  setEpisodes: (
    show: MediaRef,
    eps: { season: number; episode: number }[],
    watched: boolean,
    runtime?: number | null,
  ) => void;
  addReview: (review: Omit<Review, "id" | "createdAt">) => void;
  deleteReview: (id: string) => void;
  createList: (name: string, description: string) => string;
  addToList: (listId: string, ref: MediaRef) => void;
  removeFromList: (listId: string, key: string) => void;
  deleteList: (listId: string) => void;
  toggleReminder: (id: string) => void;
  toggleLike: (id: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  setOnboarded: (value: boolean) => void;
  markNotificationsSeen: () => void;
  importMovies: (
    items: { ref: MediaRef; rating: number | null; watchedAt: number }[],
  ) => number;
  resetAll: () => void;
};

const initialState: State = {
  entries: {},
  episodes: {},
  episodeNotes: {},
  reviews: [],
  activity: [],
  lists: [],
  reminders: {},
  likes: {},
  comments: {},
  profile: {
    name: "Sinemasever",
    handle: "sinemasever",
    bio: "Film ve dizi günlüğüm.",
    location: "",
    avatarUri: null,
    coverUri: null,
  },
  onboarded: false,
  recentSearches: [],
  ownerId: null,
  notifSeenAt: 0,
};

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function blankEntry(ref: MediaRef): Entry {
  return {
    ref,
    watchlist: false,
    watched: false,
    favorite: false,
    rating: null,
    runtime: null,
    addedAt: Date.now(),
    watchedAt: null,
  };
}

function pushActivity(list: Activity[], item: Omit<Activity, "id">): Activity[] {
  return [{ ...item, ref: slim(item.ref), id: uid() }, ...list].slice(0, 300);
}

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => {
      const patchEntry = (ref: MediaRef, patch: Partial<Entry>) =>
        set((s) => ({
          entries: {
            ...s.entries,
            [ref.key]: {
              ...(s.entries[ref.key] ?? blankEntry(slim(ref))),
              ...patch,
            },
          },
        }));

      return {
        ...initialState,

        addComment: (postId, text) => {
          const clean = text.trim();
          if (!clean) return;
          set((s) => ({
            comments: {
              ...s.comments,
              [postId]: [
                ...(s.comments[postId] ?? []),
                { id: uid(), text: clean, createdAt: Date.now() },
              ],
            },
          }));
        },

        deleteComment: (postId, commentId) =>
          set((s) => ({
            comments: {
              ...s.comments,
              [postId]: (s.comments[postId] ?? []).filter((c) => c.id !== commentId),
            },
          })),

        setEpisodeNote: (showKey, season, episode, patch) =>
          set((s) => {
            const ek = episodeKey(season, episode);
            const show = s.episodeNotes[showKey] ?? {};
            const prev: EpisodeNote = show[ek] ?? {
              rating: null,
              feelings: [],
              favoriteActor: null,
            };
            return {
              episodeNotes: {
                ...s.episodeNotes,
                [showKey]: { ...show, [ek]: { ...prev, ...patch } },
              },
            };
          }),

        addRecentSearch: (query) => {
          const q = query.trim();
          if (!q) return;
          set((s) => ({
            recentSearches: [
              q,
              ...s.recentSearches.filter((r) => r.toLowerCase() !== q.toLowerCase()),
            ].slice(0, 8),
          }));
        },

        clearRecentSearches: () => set({ recentSearches: [] }),

        toggleWatchlist: (ref) => {
          const cur = get().entries[ref.key];
          patchEntry(ref, { watchlist: !cur?.watchlist });
        },

        toggleWatched: (ref, runtime) => {
          const cur = get().entries[ref.key];
          const next = !cur?.watched;
          patchEntry(ref, {
            watched: next,
            watchedAt: next ? Date.now() : null,
            watchlist: next ? false : (cur?.watchlist ?? false),
            runtime: runtime ?? cur?.runtime ?? null,
          });
          if (next) {
            set((s) => ({
              activity: pushActivity(s.activity, {
                kind: "watched",
                ref,
                at: Date.now(),
              }),
            }));
          }
        },

        toggleFavorite: (ref) => {
          const cur = get().entries[ref.key];
          patchEntry(ref, { favorite: !cur?.favorite });
        },

        setRating: (ref, rating) => {
          patchEntry(ref, { rating });
          if (rating !== null) {
            set((s) => ({
              activity: pushActivity(s.activity, {
                kind: "rated",
                ref,
                at: Date.now(),
                rating,
              }),
            }));
          }
        },

        setRuntime: (ref, runtime) => {
          const cur = get().entries[ref.key];
          if (cur && cur.runtime === runtime) return;
          patchEntry(ref, { runtime });
        },

        toggleEpisode: (show, season, episode, runtime) => {
          const ek = episodeKey(season, episode);
          const showEps = { ...(get().episodes[show.key] ?? {}) };
          const was = ek in showEps;
          if (was) delete showEps[ek];
          else showEps[ek] = Date.now();
          set((s) => ({ episodes: { ...s.episodes, [show.key]: showEps } }));
          const cur = get().entries[show.key];
          patchEntry(show, {
            watchlist: cur?.watchlist ?? false,
            runtime: runtime ?? cur?.runtime ?? null,
          });
          if (!was) {
            set((s) => ({
              activity: pushActivity(s.activity, {
                kind: "episode",
                ref: show,
                at: Date.now(),
                detail: `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`,
              }),
            }));
          }
        },

        setEpisodes: (show, eps, watched, runtime) => {
          const showEps = { ...(get().episodes[show.key] ?? {}) };
          const now = Date.now();
          for (const e of eps) {
            const ek = episodeKey(e.season, e.episode);
            if (watched) showEps[ek] = showEps[ek] ?? now;
            else delete showEps[ek];
          }
          set((s) => ({ episodes: { ...s.episodes, [show.key]: showEps } }));
          const cur = get().entries[show.key];
          patchEntry(show, { runtime: runtime ?? cur?.runtime ?? null });
        },

        addReview: (review) => {
          const full: Review = {
            ...review,
            ref: slim(review.ref),
            id: uid(),
            createdAt: Date.now(),
          };
          set((s) => ({
            reviews: [full, ...s.reviews],
            activity: pushActivity(s.activity, {
              kind: "review",
              ref: review.ref,
              at: Date.now(),
              rating: review.rating,
              detail: review.text,
            }),
          }));
          const cur = get().entries[review.ref.key];
          if (review.ref.type === "movie") {
            patchEntry(review.ref, {
              watched: true,
              watchedAt: cur?.watchedAt ?? Date.now(),
              watchlist: false,
              rating: review.rating ?? cur?.rating ?? null,
              favorite: review.liked || (cur?.favorite ?? false),
            });
          } else {
            patchEntry(review.ref, {
              rating: review.rating ?? cur?.rating ?? null,
              favorite: review.liked || (cur?.favorite ?? false),
            });
          }
        },

        deleteReview: (id) =>
          set((s) => ({ reviews: s.reviews.filter((r) => r.id !== id) })),

        createList: (name, description) => {
          const id = uid();
          set((s) => ({
            lists: [
              { id, name, description, items: [], createdAt: Date.now() },
              ...s.lists,
            ],
          }));
          return id;
        },

        addToList: (listId, ref) =>
          set((s) => ({
            lists: s.lists.map((l) =>
              l.id === listId && !l.items.some((i) => i.key === ref.key)
                ? { ...l, items: [...l.items, slim(ref)] }
                : l,
            ),
          })),

        removeFromList: (listId, key) =>
          set((s) => ({
            lists: s.lists.map((l) =>
              l.id === listId
                ? { ...l, items: l.items.filter((i) => i.key !== key) }
                : l,
            ),
          })),

        deleteList: (listId) =>
          set((s) => ({ lists: s.lists.filter((l) => l.id !== listId) })),

        toggleReminder: (id) =>
          set((s) => {
            const next = { ...s.reminders };
            if (next[id]) delete next[id];
            else next[id] = true;
            return { reminders: next };
          }),

        toggleLike: (id) =>
          set((s) => {
            const next = { ...s.likes };
            if (next[id]) delete next[id];
            else next[id] = true;
            return { likes: next };
          }),

        updateProfile: (patch) =>
          set((s) => ({ profile: { ...s.profile, ...patch } })),

        setOnboarded: (value) => set({ onboarded: value }),
        markNotificationsSeen: () => set({ notifSeenAt: Date.now() }),

        importMovies: (items) => {
          let added = 0;
          set((s) => {
            const entries = { ...s.entries };
            for (const it of items) {
              const cur = entries[it.ref.key];
              if (cur?.watched) continue;
              entries[it.ref.key] = {
                ...(cur ?? blankEntry(it.ref)),
                watched: true,
                watchlist: false,
                watchedAt: it.watchedAt,
                rating: it.rating ?? cur?.rating ?? null,
              };
              added += 1;
            }
            return { entries };
          });
          return added;
        },

        resetAll: () => set({ ...initialState, ownerId: get().ownerId }),
      };
    },
    {
      name: "cinetrack-library-v1",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);

/** Kayıtlı veri diskten okunana kadar false döner. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

// ---------- Türetilmiş veriler (seçiciler) ----------

export function watchedEpisodeCount(
  episodes: Record<string, Record<string, number>>,
  showKey: string,
): number {
  return Object.keys(episodes[showKey] ?? {}).length;
}
