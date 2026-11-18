/**
 * TMDB bir başlığın platformdaki doğrudan adresini vermez. Bildiğimiz
 * platformlar için o platformun arama sayfasını başlık adıyla açarız.
 * Tanımadığımız platformlarda null döner; çağıran TMDB'nin liste sayfasına düşer.
 */
const SEARCH_URLS: { match: RegExp; url: (q: string) => string }[] = [
  { match: /netflix/i, url: (q) => `https://www.netflix.com/search?q=${q}` },
  { match: /disney/i, url: (q) => `https://www.disneyplus.com/search?q=${q}` },
  {
    match: /amazon|prime video/i,
    url: (q) => `https://www.primevideo.com/search/?phrase=${q}`,
  },
  { match: /\bmax\b|hbo/i, url: (q) => `https://play.hbomax.com/search?q=${q}` },
  { match: /apple tv/i, url: (q) => `https://tv.apple.com/tr/search?term=${q}` },
  { match: /mubi/i, url: (q) => `https://mubi.com/tr/search/films?query=${q}` },
  {
    match: /youtube/i,
    url: (q) => `https://www.youtube.com/results?search_query=${q}`,
  },
  {
    match: /google play/i,
    url: (q) => `https://play.google.com/store/search?q=${q}&c=movies`,
  },
];

export function providerSearchUrl(
  providerName: string,
  title: string,
): string | null {
  const q = encodeURIComponent(title);
  const hit = SEARCH_URLS.find((p) => p.match.test(providerName));
  return hit ? hit.url(q) : null;
}

export const PROVIDER_KIND_LABEL = {
  flatrate: "Abonelik",
  rent: "Kirala",
  buy: "Satın al",
} as const;
