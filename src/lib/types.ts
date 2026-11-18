export type MediaType = "movie" | "tv";

/** Uygulamanın her yerinde kullandığımız, hafif film/dizi özeti. */
export type MediaRef = {
  key: string; // "movie:123" | "tv:456"
  type: MediaType;
  id: number;
  title: string;
  year: string;
  releaseDate: string; // YYYY-MM-DD ya da ""
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  rating: number; // 0-5 (TMDB puanı / 2)
  genreIds: number[];
};

export type Cast = {
  id: number;
  name: string;
  character: string;
  photoUrl: string | null;
};

export type Provider = {
  id: number;
  name: string;
  logoUrl: string | null;
  /** abonelik / kiralık / satın alma */
  kind: "flatrate" | "rent" | "buy";
};

export type SeasonInfo = {
  number: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
};

export type EpisodeInfo = {
  id: number;
  season: number;
  number: number;
  name: string;
  overview: string;
  airDate: string | null;
  runtime: number | null;
  stillUrl: string | null;
};

/** Bir oyuncunun (ya da yönetmenin) yer aldığı yapım. */
export type PersonCredit = MediaRef & {
  /** Canlandırdığı karakter ya da yönetmen/senarist gibi görev */
  role: string;
  popularity: number;
};

export type PersonDetails = {
  id: number;
  name: string;
  photoUrl: string | null;
  department: string; // "Oyunculuk", "Yönetmenlik"...
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  biography: string;
  /** Oyuncu olarak yer aldığı yapımlar */
  credits: PersonCredit[];
  /** Yönetmen olarak çalıştığı yapımlar */
  directed: PersonCredit[];
};

export type EpisodeDetails =EpisodeInfo & {
  /** Bölümde yer alan oyuncular (dizinin kadrosu + konuk oyuncular) */
  cast: Cast[];
  voteAverage: number; // 0-5
};

/** Bölüm için kullanıcının kendi notları (cihazda saklanır). */
export type EpisodeNote = {
  rating: number | null;
  feelings: string[];
  favoriteActor: { id: number; name: string; photoUrl: string | null } | null;
};

export type MediaDetails = MediaRef & {
  tagline: string;
  genres: string[];
  runtime: number | null; // film süresi ya da ortalama bölüm süresi (dk)
  status: string;
  cast: Cast[];
  director: string | null;
  providers: Provider[];
  /** TMDB/JustWatch'ın bu başlık için tüm platformları listeleyen sayfası */
  watchLink: string | null;
  trailerUrl: string | null;
  network: string | null;
  seasons: SeasonInfo[];
  episodeCount: number;
  nextEpisode: EpisodeInfo | null;
};

/** Depoya yazılacak nesneden fazlalıkları (oyuncu, sezon vb.) atar. */
export function slim(r: MediaRef): MediaRef {
  return {
    key: r.key,
    type: r.type,
    id: r.id,
    title: r.title,
    year: r.year,
    releaseDate: r.releaseDate,
    posterUrl: r.posterUrl,
    backdropUrl: r.backdropUrl,
    overview: r.overview,
    rating: r.rating,
    genreIds: r.genreIds,
  };
}

export const makeKey =(type: MediaType, id: number) => `${type}:${id}`;
export const episodeKey = (season: number, episode: number) =>
  `${season}x${episode}`;
