import { todayISO } from "./format";
import { getDetails, getSeason } from "./tmdb";
import { episodeKey, EpisodeInfo, MediaDetails, MediaRef } from "./types";

export type UpNextItem = {
  show: MediaDetails;
  /** Yayınlanmış ama izlenmemiş ilk bölüm. Yetişilmişse null. */
  next: EpisodeInfo | null;
  seasonWatched: number;
  seasonTotal: number;
  /** Yayınlanmış ama izlenmemiş toplam bölüm sayısı. */
  behind: number;
};

/**
 * Bir dizi için "sıradaki bölüm" bilgisini hesaplar.
 * `watched`: { "1x3": zamanDamgası } biçiminde izlenen bölümler.
 */
export async function computeUpNext(
  ref: MediaRef,
  watched: Record<string, number>,
): Promise<UpNextItem> {
  const show = await getDetails("tv", ref.id);
  const today = todayISO();
  const seasonLists = await Promise.all(
    show.seasons.map((s) => getSeason(ref.id, s.number)),
  );

  let next: EpisodeInfo | null = null;
  let behind = 0;
  for (const eps of seasonLists) {
    for (const e of eps) {
      const aired = !!e.airDate && e.airDate <= today;
      if (aired && !watched[episodeKey(e.season, e.number)]) {
        behind += 1;
        if (!next) next = e;
      }
    }
  }

  // Gösterilecek sezon: sıradaki bölümün sezonu, yoksa son sezon.
  const focusSeason = next
    ? next.season
    : (show.seasons[show.seasons.length - 1]?.number ?? 1);
  const focusEps = seasonLists.find((l) => l[0]?.season === focusSeason) ?? [];
  const seasonWatched = focusEps.filter(
    (e) => watched[episodeKey(e.season, e.number)],
  ).length;

  return {
    show,
    next,
    seasonWatched,
    seasonTotal: focusEps.length,
    behind,
  };
}
