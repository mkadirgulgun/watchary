import { GENRES } from "./tmdb";
import { Entry } from "./store";

const DEFAULT_MOVIE_MIN = 110;
const DEFAULT_EPISODE_MIN = 45;

export type Stats = {
  totalMinutes: number;
  movieMinutes: number;
  showMinutes: number;
  moviesWatched: number;
  rewatched: number;
  showsTracked: number;
  showsCompleted: number;
  episodesWatched: number;
  episodesThisMonth: number;
  genres: { name: string; pct: number }[];
  /** 0.5 .. 5.0 için 10 kovanın sayıları */
  ratingBuckets: number[];
  ratingMean: number | null;
  ratingPeakIndex: number;
};

export function computeStats(
  entries: Record<string, Entry>,
  episodes: Record<string, Record<string, number>>,
  rewatchedMovies: number,
): Stats {
  const all = Object.values(entries);
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).getTime();

  let movieMinutes = 0;
  let showMinutes = 0;
  let moviesWatched = 0;
  let showsTracked = 0;
  let showsCompleted = 0;
  let episodesWatched = 0;
  let episodesThisMonth = 0;
  const genreCount = new Map<string, number>();
  const buckets = new Array(10).fill(0) as number[];
  let ratingSum = 0;
  let ratingN = 0;

  const bumpGenres = (e: Entry) => {
    for (const id of e.ref.genreIds) {
      const name = GENRES[id];
      if (name) genreCount.set(name, (genreCount.get(name) ?? 0) + 1);
    }
  };

  for (const e of all) {
    if (e.rating) {
      const idx = Math.min(9, Math.max(0, Math.round(e.rating * 2) - 1));
      buckets[idx] += 1;
      ratingSum += e.rating;
      ratingN += 1;
    }

    if (e.ref.type === "movie") {
      if (e.watched) {
        moviesWatched += 1;
        movieMinutes += e.runtime ?? DEFAULT_MOVIE_MIN;
        bumpGenres(e);
      }
    } else {
      const eps = Object.values(episodes[e.ref.key] ?? {});
      if (eps.length > 0) {
        showsTracked += 1;
        episodesWatched += eps.length;
        episodesThisMonth += eps.filter((t) => t >= monthStart).length;
        showMinutes += eps.length * (e.runtime ?? DEFAULT_EPISODE_MIN);
        bumpGenres(e);
      }
      if (e.watched) showsCompleted += 1;
    }
  }

  const genreTotal = [...genreCount.values()].reduce((a, b) => a + b, 0);
  const genres = [...genreCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, n]) => ({ name, pct: Math.round((n / genreTotal) * 100) }));

  const peak = Math.max(...buckets);
  return {
    totalMinutes: movieMinutes + showMinutes,
    movieMinutes,
    showMinutes,
    moviesWatched,
    rewatched: rewatchedMovies,
    showsTracked,
    showsCompleted,
    episodesWatched,
    episodesThisMonth,
    genres,
    ratingBuckets: buckets,
    ratingMean: ratingN ? ratingSum / ratingN : null,
    ratingPeakIndex: peak > 0 ? buckets.indexOf(peak) : -1,
  };
}
