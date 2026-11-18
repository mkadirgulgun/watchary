import { create } from "zustand";

export type EpisodeTarget = {
  showId: number;
  season: number;
  episode: number;
};

type UiState = {
  /** Açık olan bölüm paneli (yoksa null). Kaydedilmez, sadece anlık arayüz durumu. */
  episodeSheet: EpisodeTarget | null;
  showEpisode: (target: EpisodeTarget) => void;
  closeEpisode: () => void;
};

export const useUi = create<UiState>()((set) => ({
  episodeSheet: null,
  showEpisode: (target) => set({ episodeSheet: target }),
  closeEpisode: () => set({ episodeSheet: null }),
}));
