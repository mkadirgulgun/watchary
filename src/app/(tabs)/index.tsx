import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { MediaRow } from "@/components/media-row";
import { ErrorState } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { daysBetween, formatShortDate, todayISO } from "@/lib/format";
import { openMedia, openSearch } from "@/lib/nav";
import { useStore } from "@/lib/store";
import {
  GENRES,
  getPopularMovies,
  getPopularShows,
  getTopRated,
  getTrending,
  getUpcomingMovies,
  sized,
} from "@/lib/tmdb";
import { MediaRef, MediaType } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

type Filter = "all" | MediaType | "top";

async function loadTrending(filter: Filter): Promise<MediaRef[]> {
  if (filter === "top") {
    const [m, t] = await Promise.all([getTopRated("movie"), getTopRated("tv")]);
    return [...m.slice(0, 10), ...t.slice(0, 10)].sort(
      (a, b) => b.rating - a.rating,
    );
  }
  return getTrending(filter);
}

export default function DiscoverScreen() {
  const [filter, setFilter] = useState<Filter>("all");

  const trending = useAsync(() => loadTrending(filter), [filter]);
  const shows = useAsync(getPopularShows, []);
  const movies = useAsync(getPopularMovies, []);
  const upcoming = useAsync(getUpcomingMovies, []);

  const hero = trending.data?.find((i) => i.backdropUrl) ?? null;

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.search} onPress={openSearch}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <AppText
            variant="body"
            color={colors.textTertiary}
            style={styles.searchText}
          >
            Film, dizi veya oyuncu ara...
          </AppText>
          <Ionicons
            name="options-outline"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            label="Tümü"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />
          <Chip
            label="Diziler"
            active={filter === "tv"}
            onPress={() => setFilter("tv")}
          />
          <Chip
            label="Filmler"
            active={filter === "movie"}
            onPress={() => setFilter("movie")}
          />
          <Chip
            label="En İyiler"
            active={filter === "top"}
            onPress={() => setFilter("top")}
          />
        </ScrollView>

        {trending.error && (
          <ErrorState message={trending.error} onRetry={trending.reload} />
        )}
        {hero ? (
          <Hero item={hero} />
        ) : (
          !trending.error && <View style={styles.heroSkeleton} />
        )}

        <MediaRow
          title={filter === "top" ? "En Yüksek Puanlılar" : "Bu Hafta Trend"}
          icon="trending-up"
          items={trending.data}
        />
        {filter !== "movie" && (
          <MediaRow
            title="Popüler Diziler"
            icon="tv-outline"
            items={shows.data}
          />
        )}
        {filter !== "tv" && (
          <MediaRow
            title="Popüler Filmler"
            icon="film-outline"
            items={movies.data}
          />
        )}
        {filter !== "tv" && upcoming.data && upcoming.data.length > 0 && (
          <ComingSoon items={upcoming.data.slice(0, 6)} />
        )}
      </ScrollView>
    </View>
  );
}

function Hero({ item }: { item: MediaRef }) {
  const inWatchlist = useStore((s) => s.entries[item.key]?.watchlist ?? false);
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const genre = item.genreIds.map((id) => GENRES[id]).filter(Boolean)[0];

  return (
    <Pressable
      style={styles.hero}
      onPress={() => openMedia(item.type, item.id)}
    >
      {item.backdropUrl && (
        <Image
          source={{ uri: item.backdropUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          priority="high"
        />
      )}
      <LinearGradient
        colors={["transparent", "rgba(9,10,15,0.55)", "rgba(9,10,15,0.96)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.heroBody}>
        <View style={styles.heroBadge}>
          <AppText variant="overline" color={colors.primaryLight}>
            Haftanın Öne Çıkanı
          </AppText>
        </View>
        <View style={styles.heroMeta}>
          <Ionicons name="star" size={13} color={colors.primary} />
          <AppText variant="caption" color={colors.text}>
            {item.rating.toFixed(1)}
          </AppText>
          <AppText variant="caption">
            • {item.year} {genre ? `• ${genre}` : ""}
          </AppText>
        </View>
        <AppText variant="display" numberOfLines={2}>
          {item.title}
        </AppText>
        <View style={styles.heroActions}>
          <Button
            style={styles.heroButton}
            icon={inWatchlist ? "bookmark" : "bookmark-outline"}
            label={inWatchlist ? "Listemde" : "İzleme Listesi"}
            onPress={() => toggleWatchlist(item)}
          />
          <Button
            variant="secondary"
            icon="information-circle-outline"
            onPress={() => openMedia(item.type, item.id)}
          />
        </View>
      </View>
    </Pressable>
  );
}

function ComingSoon({ items }: { items: MediaRef[] }) {
  const reminders = useStore((s) => s.reminders);
  const toggleReminder = useStore((s) => s.toggleReminder);
  const today = todayISO();

  return (
    <View style={styles.coming}>
      <View style={styles.comingHeader}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <AppText variant="headline">Çok Yakında</AppText>
      </View>
      {items.map((m) => {
        const days = daysBetween(today, m.releaseDate);
        const on = !!reminders[m.key];
        return (
          <Pressable
            key={m.key}
            style={styles.comingCard}
            onPress={() => openMedia(m.type, m.id)}
          >
            <View style={styles.comingPoster}>
              {m.posterUrl && (
                <Image
                  source={{ uri: sized(m.posterUrl, "w154") ?? m.posterUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
            </View>
            <View style={styles.comingInfo}>
              <View style={styles.comingTop}>
                <View style={styles.pill}>
                  <AppText variant="caption" color={colors.primaryLight}>
                    {formatShortDate(m.releaseDate)}
                  </AppText>
                </View>
                <AppText variant="caption">
                  {days <= 0 ? "Bugün" : `${days} gün`}
                </AppText>
              </View>
              <AppText variant="title" numberOfLines={1}>
                {m.title}
              </AppText>
              <AppText variant="caption" numberOfLines={1}>
                {m.genreIds
                  .map((id) => GENRES[id])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join(" • ")}
              </AppText>
            </View>
            <Pressable onPress={() => toggleReminder(m.key)} hitSlop={10}>
              <Ionicons
                name={on ? "notifications" : "notifications-outline"}
                size={20}
                color={on ? colors.primary : colors.textSecondary}
              />
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl * 2, gap: spacing.xl },
  search: {
    marginHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  searchText: { flex: 1 },
  chips: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  hero: {
    marginHorizontal: spacing.lg,
    height: 360,
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    justifyContent: "flex-end",
  },
  heroSkeleton: {
    marginHorizontal: spacing.lg,
    height: 360,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroBody: { padding: spacing.lg, gap: spacing.sm },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  heroButton: { flex: 1 },
  coming: { paddingHorizontal: spacing.lg, gap: spacing.md },
  comingHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  comingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  comingPoster: {
    width: 56,
    height: 84,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  comingInfo: { flex: 1, gap: 2 },
  comingTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
