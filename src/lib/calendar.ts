import { addDays, formatEpisodeCode, todayISO } from "./format";
import { getDetails, getSeason, getUpcomingMovies } from "./tmdb";
import { EpisodeInfo, MediaRef } from "./types";

export type CalItem = {
  id: string; // hatırlatıcı anahtarı
  kind: "episode" | "movie";
  date: string; // YYYY-MM-DD
  title: string;
  subtitle: string;
  overview: string;
  imageUrl: string | null;
  network: string | null;
  runtime: number | null;
  ref: MediaRef;
  episode?: { season: number; number: number };
};

/** Takip edilen bir dizinin takvim durumu. */
export type ShowStatus = {
  ref: MediaRef;
  network: string | null;
  /** Önümüzdeki ilk yayınlanacak bölüm (varsa) */
  next: CalItem | null;
  /** En son yayınlanan bölüm (varsa) */
  lastAired: EpisodeInfo | null;
  /** TMDB dizi durumu: "Returning Series", "Ended", "Canceled"... */
  status: string;
};

export type CalendarData = {
  items: CalItem[];
  shows: ShowStatus[];
};

/** Takvimde geriye ve ileriye kaç gün gösterilir */
export const PAST_DAYS = 14;
export const FUTURE_DAYS = 90;

/** Takip edilen dizilerin yaklaşan (ve son günlerde yayınlanan) bölümleri + vizyona girecek filmler. */
export async function loadCalendar(tracked: MediaRef[]): Promise<CalendarData> {
  const today = todayISO();
  const start = addDays(today, -PAST_DAYS);
  const end = addDays(today, FUTURE_DAYS);

  const perShow = await Promise.all(
    tracked.map(async (ref): Promise<{ items: CalItem[]; status: ShowStatus } | null> => {
      try {
        const show = await getDetails("tv", ref.id);
        const last = show.seasons[show.seasons.length - 1];
        const eps = last ? await getSeason(ref.id, last.number) : [];

        const toItem = (e: EpisodeInfo): CalItem => ({
          id: `${ref.key}:${e.season}x${e.number}`,
          kind: "episode",
          date: e.airDate as string,
          title: show.title,
          subtitle: `${formatEpisodeCode(e.season, e.number)} • ${e.name}`,
          overview: e.overview,
          imageUrl: e.stillUrl ?? show.backdropUrl,
          network: show.network,
          runtime: e.runtime ?? show.runtime,
          ref,
          episode: { season: e.season, number: e.number },
        });

        const dated = eps.filter((e) => !!e.airDate);
        const upcoming = dated
          .filter((e) => (e.airDate as string) >= today)
          .sort((a, b) => (a.airDate as string).localeCompare(b.airDate as string));
        const aired = dated
          .filter((e) => (e.airDate as string) < today)
          .sort((a, b) => (b.airDate as string).localeCompare(a.airDate as string));

        // Sezon listesinde yoksa TMDB'nin "sıradaki bölüm" bilgisine bak.
        const nextEp = upcoming[0] ?? show.nextEpisode ?? null;
        const nextItem = nextEp && nextEp.airDate ? toItem(nextEp) : null;

        return {
          items: dated
            .filter((e) => (e.airDate as string) >= start && (e.airDate as string) <= end)
            .map(toItem),
          status: {
            ref,
            network: show.network,
            next: nextItem,
            lastAired: aired[0] ?? null,
            status: show.status,
          },
        };
      } catch {
        return null;
      }
    }),
  );
  const okShows = perShow.filter((s): s is NonNullable<typeof s> => s !== null);

  let movieItems: CalItem[] = [];
  try {
    const movies = await getUpcomingMovies();
    movieItems = movies
      .filter((m) => m.releaseDate <= end)
      .map((m) => ({
        id: m.key,
        kind: "movie" as const,
        date: m.releaseDate,
        title: m.title,
        subtitle: "Vizyona giriyor",
        overview: m.overview,
        imageUrl: m.backdropUrl ?? m.posterUrl,
        network: null,
        runtime: null,
        ref: m,
      }));
  } catch {
    // Film verisi gelmezse dizi takvimi yine de gösterilsin.
  }

  const items = [...okShows.flatMap((s) => s.items), ...movieItems].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return { items, shows: okShows.map((s) => s.status) };
}
