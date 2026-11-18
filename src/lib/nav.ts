import { Href, router } from "expo-router";

import { MediaType } from "./types";
import { useUi } from "./ui-store";

export const openMedia = (type: MediaType, id: number) =>
  router.push(`/media/${type}/${id}` as Href);

export const openReview = (
  type: MediaType,
  id: number,
  season?: number,
  episode?: number,
) => {
  const q =
    season !== undefined && episode !== undefined
      ? `?season=${season}&episode=${episode}`
      : "";
  router.push(`/review/${type}/${id}${q}` as Href);
};

/** Bölüm panelini mevcut sayfanın üstünde açar (ayrı bir sayfa değil). */
export const openEpisode = (showId: number, season: number, episode: number) =>
  useUi.getState().showEpisode({ showId, season, episode });

export const openPerson = (id: number) =>
  router.push(`/person/${id}` as Href);

export const openPost = (id: string) =>
  router.push(`/post/${encodeURIComponent(id)}` as Href);

export const openList = (id: string) => router.push(`/list/${id}` as Href);
export const openSearch = () => router.push("/search" as Href);
export const openProfile = () => router.push("/profile" as Href);
