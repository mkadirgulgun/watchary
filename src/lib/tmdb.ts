import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Cast,
  EpisodeDetails,
  EpisodeInfo,
  makeKey,
  MediaDetails,
  MediaRef,
  MediaType,
  PersonCredit,
  PersonDetails,
  Provider,
  SeasonInfo,
} from "./types";

const BASE_URL = "https://api.themoviedb.org/3";
const TOKEN = process.env.EXPO_PUBLIC_TMDB_TOKEN;
const LANG = "tr-TR";
const REGION = "TR";

type RawItem = {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  overview?: string;
  popularity?: number;
};

type RawEpisode = {
  id: number;
  season_number: number;
  episode_number: number;
  name?: string;
  overview?: string;
  air_date?: string | null;
  runtime?: number | null;
  still_path?: string | null;
};

const cache = new Map<string, { at: number; data: unknown }>();
const CACHE_MS = 5 * 60 * 1000;

// Liste uçları diske de yazılır: uygulama ikinci açılışta anında dolar,
// internet yokken de son görülen liste gösterilir.
const PERSIST_PREFIXES = [
  "/trending/",
  "/movie/popular",
  "/tv/popular",
  "/movie/upcoming",
  "/movie/top_rated",
  "/tv/top_rated",
];
const PERSIST_MS = 30 * 60 * 1000;
const STORE_PREFIX = "tmdb-cache:";

async function fetchTmdb<T>(path: string): Promise<T> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data as T;

  const persist = PERSIST_PREFIXES.some((p) => path.startsWith(p));
  let stale: T | null = null;

  if (persist) {
    try {
      const raw = await AsyncStorage.getItem(STORE_PREFIX + path);
      if (raw) {
        const saved = JSON.parse(raw) as { at: number; data: T };
        if (Date.now() - saved.at < PERSIST_MS) {
          cache.set(path, { at: Date.now(), data: saved.data });
          return saved.data;
        }
        stale = saved.data;
      }
    } catch {
      // Disk okunamazsa ağdan devam et.
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!response.ok) {
      throw new Error(`TMDB hatası: ${response.status}`);
    }
    const data = await response.json();
    cache.set(path, { at: Date.now(), data });
    if (persist) {
      AsyncStorage.setItem(
        STORE_PREFIX + path,
        JSON.stringify({ at: Date.now(), data }),
      ).catch(() => {});
    }
    return data as T;
  } catch (e) {
    if (stale) return stale; // İnternet yoksa eski veriyi göster.
    throw e;
  }
}

type PosterSize = "w92" | "w154" | "w185" | "w342" | "w500" | "w780";
type BackdropSize = "w300" | "w780" | "w1280";
type StillSize = "w185" | "w300";

export function imageUrl(
  path: string | null | undefined,
  size: PosterSize | BackdropSize | StillSize = "w342",
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

/** Kayıtlı bir TMDB görsel adresini daha küçük boyuta çevirir (hızlı yükleme için). */
export function sized(url: string | null, size: PosterSize | BackdropSize): string | null {
  if (!url) return null;
  return url.replace(/\/t\/p\/w\d+\//, `/t/p/${size}/`);
}

function toRef(raw: RawItem, forcedType?: MediaType): MediaRef | null {
  const type: MediaType | null =
    forcedType ??
    (raw.media_type === "movie" || raw.media_type === "tv"
      ? raw.media_type
      : null);
  if (!type) return null;
  const releaseDate = (type === "movie" ? raw.release_date : raw.first_air_date) ?? "";
  return {
    key: makeKey(type, raw.id),
    type,
    id: raw.id,
    title: (type === "movie" ? raw.title : raw.name) ?? "Adsız",
    year: releaseDate.slice(0, 4),
    releaseDate,
    posterUrl: imageUrl(raw.poster_path),
    backdropUrl: imageUrl(raw.backdrop_path, "w780"),
    overview: raw.overview ?? "",
    rating: (raw.vote_average ?? 0) / 2,
    genreIds: raw.genre_ids ?? [],
  };
}

function toRefs(results: RawItem[], forcedType?: MediaType): MediaRef[] {
  return results
    .map((r) => toRef(r, forcedType))
    .filter((r): r is MediaRef => r !== null);
}

type ListResponse = { results: RawItem[] };

export async function getTrending(
  type: MediaType | "all" = "all",
): Promise<MediaRef[]> {
  const data = await fetchTmdb<ListResponse>(
    `/trending/${type}/week?language=${LANG}`,
  );
  return toRefs(data.results, type === "all" ? undefined : type);
}

export async function getPopularMovies(): Promise<MediaRef[]> {
  const data = await fetchTmdb<ListResponse>(
    `/movie/popular?language=${LANG}&region=${REGION}`,
  );
  return toRefs(data.results, "movie");
}

export async function getPopularShows(): Promise<MediaRef[]> {
  const data = await fetchTmdb<ListResponse>(`/tv/popular?language=${LANG}`);
  return toRefs(data.results, "tv");
}

export async function getTopRated(type: MediaType): Promise<MediaRef[]> {
  const data = await fetchTmdb<ListResponse>(
    `/${type}/top_rated?language=${LANG}`,
  );
  return toRefs(data.results, type);
}

export async function getUpcomingMovies(): Promise<MediaRef[]> {
  const data = await fetchTmdb<ListResponse>(
    `/movie/upcoming?language=${LANG}&region=${REGION}`,
  );
  const today = new Date().toISOString().slice(0, 10);
  return toRefs(data.results, "movie")
    .filter((m) => m.releaseDate >= today)
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
}

export async function searchMulti(query: string): Promise<MediaRef[]> {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const data = await fetchTmdb<ListResponse>(
    `/search/multi?language=${LANG}&include_adult=false&query=${q}`,
  );
  return toRefs(data.results);
}

export async function searchMovieByTitle(
  title: string,
  year?: string,
): Promise<MediaRef | null> {
  const q = encodeURIComponent(title);
  const y = year ? `&year=${year}` : "";
  const data = await fetchTmdb<ListResponse>(
    `/search/movie?language=${LANG}&include_adult=false&query=${q}${y}`,
  );
  return toRefs(data.results, "movie")[0] ?? null;
}

// ---------- Detay ----------

type RawDetails = RawItem & {
  tagline?: string;
  genres?: { id: number; name: string }[];
  runtime?: number | null;
  episode_run_time?: number[];
  status?: string;
  number_of_episodes?: number;
  networks?: { name: string }[];
  production_companies?: { name: string }[];
  seasons?: {
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
  }[];
  next_episode_to_air?: RawEpisode | null;
  last_episode_to_air?: RawEpisode | null;
  credits?: {
    cast?: {
      id: number;
      name: string;
      character?: string;
      profile_path?: string | null;
    }[];
    crew?: { name: string; job: string }[];
  };
  videos?: {
    results?: { key: string; site: string; type: string }[];
  };
  "watch/providers"?: {
    results?: Record<
      string,
      {
        link?: string;
        flatrate?: RawProvider[];
        rent?: RawProvider[];
        buy?: RawProvider[];
      }
    >;
  };
};

type RawProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

function toEpisode(raw: RawEpisode): EpisodeInfo {
  return {
    id: raw.id,
    season: raw.season_number,
    number: raw.episode_number,
    name: raw.name || `Bölüm ${raw.episode_number}`,
    overview: raw.overview ?? "",
    airDate: raw.air_date || null,
    runtime: raw.runtime ?? null,
    stillUrl: imageUrl(raw.still_path, "w300"),
  };
}

export async function getDetails(
  type: MediaType,
  id: number,
): Promise<MediaDetails> {
  const append = "credits,videos,watch/providers";
  const raw = await fetchTmdb<RawDetails>(
    `/${type}/${id}?language=${LANG}&append_to_response=${append}`,
  );

  // Türkçe özet boşsa İngilizceye düş.
  let overview = raw.overview ?? "";
  if (!overview) {
    const en = await fetchTmdb<RawDetails>(`/${type}/${id}?language=en-US`);
    overview = en.overview ?? "";
  }

  const base = toRef({ ...raw, overview }, type) as MediaRef;

  const cast: Cast[] = (raw.credits?.cast ?? []).slice(0, 15).map((c) => ({
    id: c.id,
    name: c.name,
    character: c.character ?? "",
    photoUrl: imageUrl(c.profile_path, "w185"),
  }));

  const director =
    raw.credits?.crew?.find((c) => c.job === "Director")?.name ?? null;

  const region = raw["watch/providers"]?.results?.[REGION];
  const providers: Provider[] = [];
  const seen = new Set<number>();
  for (const kind of ["flatrate", "rent", "buy"] as const) {
    for (const p of region?.[kind] ?? []) {
      if (seen.has(p.provider_id)) continue; // aynı platformu bir kez göster
      seen.add(p.provider_id);
      providers.push({
        id: p.provider_id,
        name: p.provider_name,
        logoUrl: imageUrl(p.logo_path, "w92"),
        kind,
      });
    }
  }

  const trailer = raw.videos?.results?.find(
    (v) => v.site === "YouTube" && v.type === "Trailer",
  );

  const seasons: SeasonInfo[] = (raw.seasons ?? [])
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .map((s) => ({
      number: s.season_number,
      name: s.name,
      episodeCount: s.episode_count,
      airDate: s.air_date,
    }));

  const runtime =
    type === "movie"
      ? (raw.runtime ?? null)
      : (raw.episode_run_time?.[0] ?? raw.last_episode_to_air?.runtime ?? null);

  return {
    ...base,
    tagline: raw.tagline ?? "",
    genres: (raw.genres ?? []).map((g) => g.name),
    genreIds: (raw.genres ?? []).map((g) => g.id),
    runtime,
    status: raw.status ?? "",
    cast,
    director,
    providers,
    watchLink: region?.link ?? null,
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    network:
      type === "tv"
        ? (raw.networks?.[0]?.name ?? null)
        : (raw.production_companies?.[0]?.name ?? null),
    seasons,
    episodeCount: raw.number_of_episodes ?? 0,
    nextEpisode: raw.next_episode_to_air
      ? toEpisode(raw.next_episode_to_air)
      : null,
  };
}

export async function getSeason(
  showId: number,
  seasonNumber: number,
): Promise<EpisodeInfo[]> {
  const data = await fetchTmdb<{ episodes?: RawEpisode[] }>(
    `/tv/${showId}/season/${seasonNumber}?language=${LANG}`,
  );
  return (data.episodes ?? []).map(toEpisode);
}

type RawCredit = RawItem & {
  character?: string;
  job?: string;
  popularity?: number;
};

type RawPerson = {
  id: number;
  name: string;
  profile_path?: string | null;
  known_for_department?: string;
  birthday?: string | null;
  deathday?: string | null;
  place_of_birth?: string | null;
  biography?: string;
  combined_credits?: { cast?: RawCredit[]; crew?: RawCredit[] };
};

const DEPARTMENTS: Record<string, string> = {
  Acting: "Oyunculuk",
  Directing: "Yönetmenlik",
  Writing: "Senaryo",
  Production: "Yapımcılık",
  Sound: "Müzik / Ses",
  Camera: "Görüntü Yönetimi",
  Editing: "Kurgu",
};

/** Oyuncu ya da yönetmen sayfası için kişi bilgisi ve yer aldığı yapımlar. */
export async function getPerson(id: number): Promise<PersonDetails> {
  const raw = await fetchTmdb<RawPerson>(
    `/person/${id}?language=${LANG}&append_to_response=combined_credits`,
  );

  // Türkçe biyografi çoğu kişide boş; İngilizceye düş.
  let biography = raw.biography ?? "";
  if (!biography) {
    const en = await fetchTmdb<RawPerson>(`/person/${id}?language=en-US`);
    biography = en.biography ?? "";
  }

  const toCredit = (c: RawCredit, role: string): PersonCredit | null => {
    const ref = toRef(c);
    if (!ref || !ref.posterUrl) return null;
    return { ...ref, role, popularity: c.popularity ?? 0 };
  };
  const dedupe = (list: PersonCredit[]) =>
    list.filter((c, i, all) => all.findIndex((x) => x.key === c.key) === i);

  const credits = dedupe(
    (raw.combined_credits?.cast ?? [])
      .map((c) => toCredit(c, c.character ?? ""))
      .filter((c): c is PersonCredit => c !== null),
  );
  const directed = dedupe(
    (raw.combined_credits?.crew ?? [])
      .filter((c) => c.job === "Director")
      .map((c) => toCredit(c, "Yönetmen"))
      .filter((c): c is PersonCredit => c !== null),
  );

  return {
    id: raw.id,
    name: raw.name,
    photoUrl: raw.profile_path
      ? `https://image.tmdb.org/t/p/h632${raw.profile_path}`
      : null,
    department: DEPARTMENTS[raw.known_for_department ?? ""] ?? raw.known_for_department ?? "",
    birthday: raw.birthday || null,
    deathday: raw.deathday || null,
    placeOfBirth: raw.place_of_birth || null,
    biography,
    credits,
    directed,
  };
}

type RawEpisodeDetails = RawEpisode & {
  vote_average?: number;
  guest_stars?: {
    id: number;
    name: string;
    character?: string;
    profile_path?: string | null;
  }[];
};

/** Bir film/dizinin yazısız sahne görselleri (profil kapağı için). */
export async function getBackdrops(
  type: MediaType,
  id: number,
): Promise<string[]> {
  const data = await fetchTmdb<{ backdrops?: { file_path: string; vote_average?: number }[] }>(
    `/${type}/${id}/images?include_image_language=null`,
  );
  return (data.backdrops ?? [])
    .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
    .slice(0, 8)
    .map((b) => `https://image.tmdb.org/t/p/w1280${b.file_path}`);
}

/** Tek bir bölümün detayı: özet, süre ve konuk oyuncular. */
export async function getEpisode(
  showId: number,
  season: number,
  episode: number,
): Promise<EpisodeDetails> {
  const [raw, show] = await Promise.all([
    fetchTmdb<RawEpisodeDetails>(
      `/tv/${showId}/season/${season}/episode/${episode}?language=${LANG}`,
    ),
    getDetails("tv", showId),
  ]);

  const guests: Cast[] = (raw.guest_stars ?? []).slice(0, 8).map((g) => ({
    id: g.id,
    name: g.name,
    character: g.character ?? "",
    photoUrl: imageUrl(g.profile_path, "w185"),
  }));
  // Dizinin ana kadrosu + bu bölümün konukları; aynı kişiyi iki kez gösterme.
  const cast = [...show.cast.slice(0, 8), ...guests].filter(
    (c, i, all) => all.findIndex((x) => x.id === c.id) === i,
  );

  let overview = raw.overview ?? "";
  if (!overview) {
    const en = await fetchTmdb<RawEpisodeDetails>(
      `/tv/${showId}/season/${season}/episode/${episode}?language=en-US`,
    );
    overview = en.overview ?? "";
  }

  return {
    ...toEpisode({ ...raw, overview }),
    cast,
    voteAverage: (raw.vote_average ?? 0) / 2,
  };
}

// ---------- Genre tablosu (TMDB'nin sabit kimlikleri) ----------

export const GENRES: Record<number, string> = {
  28: "Aksiyon",
  12: "Macera",
  16: "Animasyon",
  35: "Komedi",
  80: "Suç",
  99: "Belgesel",
  18: "Dram",
  10751: "Aile",
  14: "Fantastik",
  36: "Tarih",
  27: "Korku",
  10402: "Müzik",
  9648: "Gizem",
  10749: "Romantik",
  878: "Bilim Kurgu",
  10770: "TV Filmi",
  53: "Gerilim",
  10752: "Savaş",
  37: "Western",
  10759: "Aksiyon & Macera",
  10762: "Çocuk",
  10763: "Haber",
  10764: "Reality",
  10765: "Bilim Kurgu & Fantastik",
  10766: "Pembe Dizi",
  10767: "Talk Show",
  10768: "Savaş & Politika",
};
