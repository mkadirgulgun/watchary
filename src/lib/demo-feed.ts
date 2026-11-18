import { getDetails } from "./tmdb";
import { MediaRef, MediaType } from "./types";

/**
 * Hesap sistemi bağlanana kadar akışta gösterilen ÖRNEK içerik.
 * Gerçek kullanıcılara ait değildir.
 */

export type MediaId = { type: MediaType; id: number };

export type DemoPost = {
  id: string;
  user: string;
  hoursAgo: number;
  kind: "review" | "episode" | "list";
  media: MediaId;
  rating?: number;
  season?: number;
  episode?: number;
  spoiler?: boolean;
  text: string;
  title?: string;
  listItems?: MediaId[];
  likes: number;
  comments: number;
};

export type DemoComment = {
  user: string;
  hoursAgo: number;
  text: string;
  likes: number;
};

export const DEMO_FRIENDS: { name: string; watching: MediaId }[] = [
  { name: "Sarah", watching: { type: "tv", id: 95396 } },
  { name: "Liam K.", watching: { type: "movie", id: 693134 } },
  { name: "Zoe M.", watching: { type: "tv", id: 126308 } },
  { name: "Devon", watching: { type: "movie", id: 872585 } },
];

export const DEMO_POSTS: DemoPost[] = [
  {
    id: "demo-1",
    user: "Marcus Vance",
    hoursAgo: 2,
    kind: "review",
    media: { type: "movie", id: 693134 },
    rating: 5,
    text: "Ses tasarımı ve müzik göğsünde titreşen bir deneyim. Çöl sahneleri sinema salonunda izlenmek için yapılmış.",
    likes: 243,
    comments: 3,
  },
  {
    id: "demo-2",
    user: "Elena Rostova",
    hoursAgo: 4,
    kind: "episode",
    media: { type: "tv", id: 95396 },
    season: 2,
    episode: 1,
    rating: 4.5,
    spoiler: true,
    text: "Finaldeki sahne her şeyi değiştiriyor, kimse bunu beklemiyordu.",
    likes: 88,
    comments: 2,
  },
  {
    id: "demo-3",
    user: "Kenji Sato",
    hoursAgo: 6,
    kind: "list",
    media: { type: "movie", id: 438631 },
    title: "2020'lerin Zihin Bükücü Bilim Kurgusu",
    text: "Varoluşsal korku, kozmik kayıtsızlık ve sonsuz çöl. Beyin yoran filmler.",
    listItems: [
      { type: "movie", id: 438631 },
      { type: "movie", id: 693134 },
      { type: "movie", id: 872585 },
      { type: "movie", id: 329865 },
    ],
    likes: 512,
    comments: 2,
  },
];

export const DEMO_COMMENTS: Record<string, DemoComment[]> = {
  "demo-1": [
    {
      user: "Zeynep A.",
      hoursAgo: 2,
      text: "Katılıyorum, IMAX'te izlemek bambaşka bir deneyimdi. Hans Zimmer yine zirve yapmış.",
      likes: 18,
    },
    {
      user: "Burak T.",
      hoursAgo: 1,
      text: "Çöl sahneleri inanılmaz ama bence birinci filmin atmosferi biraz daha iyiydi.",
      likes: 7,
    },
    {
      user: "Elif K.",
      hoursAgo: 1,
      text: "Final sahnesinden sonra üçüncü filmi sabırsızlıkla bekliyorum.",
      likes: 11,
    },
  ],
  "demo-2": [
    {
      user: "Can Y.",
      hoursAgo: 3,
      text: "Bölümün temposu harika, Helly'nin sahnesi çok iyiydi.",
      likes: 9,
    },
    {
      user: "Merve S.",
      hoursAgo: 2,
      text: "Spoiler vermeden söyleyeyim, son 5 dakika için bölümü tekrar izledim.",
      likes: 14,
    },
  ],
  "demo-3": [
    {
      user: "Ayşe D.",
      hoursAgo: 5,
      text: "Arrival'ı listeye eklemişsin, çok doğru. Bir de Annihilation'ı ekleyebilirsin.",
      likes: 22,
    },
    {
      user: "Mert B.",
      hoursAgo: 4,
      text: "Blade Runner 2049 da bence bu listenin başına gelir.",
      likes: 16,
    },
  ],
};

export const allDemoIds: MediaId[] = [
  ...DEMO_FRIENDS.map((f) => f.watching),
  ...DEMO_POSTS.flatMap((p) => [p.media, ...(p.listItems ?? [])]),
];

/** Örnek gönderilerde geçen film/dizileri TMDB'den çeker. */
export async function loadRefs(
  ids: MediaId[],
): Promise<Record<string, MediaRef>> {
  const out: Record<string, MediaRef> = {};
  await Promise.all(
    ids.map(async (m) => {
      try {
        out[`${m.type}:${m.id}`] = await getDetails(m.type, m.id);
      } catch {
        // Tek bir başlık yüklenemezse akış yine görünsün.
      }
    }),
  );
  return out;
}
