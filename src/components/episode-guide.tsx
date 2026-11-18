import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { ProgressBar } from "@/components/progress-bar";
import { ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { formatEpisodeCode, formatShortDate, todayISO } from "@/lib/format";
import { openEpisode, openReview } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { getSeason } from "@/lib/tmdb";
import { episodeKey, MediaDetails } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

type Props = { show: MediaDetails };

export function EpisodeGuide({ show }: Props) {
  const watchedMap = useStore((s) => s.episodes[show.key]);
  const toggleEpisode = useStore((s) => s.toggleEpisode);
  const setEpisodes = useStore((s) => s.setEpisodes);

  const initialSeason = useMemo(() => {
    const seasons = Object.keys(watchedMap ?? {}).map((k) => Number(k.split("x")[0]));
    const wanted = seasons.length ? Math.max(...seasons) : show.seasons[0]?.number;
    return wanted ?? 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [season, setSeason] = useState(initialSeason);
  const { data, loading, error, reload } = useAsync(
    () => getSeason(show.id, season),
    [show.id, season],
  );

  const today = todayISO();
  const episodes = data ?? [];
  const aired = episodes.filter((e) => e.airDate && e.airDate <= today);
  const watchedCount = episodes.filter(
    (e) => watchedMap?.[episodeKey(e.season, e.number)],
  ).length;
  const allAiredWatched =
    aired.length > 0 &&
    aired.every((e) => watchedMap?.[episodeKey(e.season, e.number)]);
  const nextUp = aired.find((e) => !watchedMap?.[episodeKey(e.season, e.number)]);

  const toggleSeason = () =>
    setEpisodes(
      show,
      aired.map((e) => ({ season: e.season, episode: e.number })),
      !allAiredWatched,
      show.runtime,
    );

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <AppText variant="headline">Bölüm Rehberi</AppText>
        {aired.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            icon={allAiredWatched ? "close-circle-outline" : "checkmark-done"}
            label={allAiredWatched ? "Sezonu Geri Al" : "Sezonu İşaretle"}
            onPress={toggleSeason}
          />
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.seasons}>
        {show.seasons.map((s) => (
          <Chip
            key={s.number}
            label={`Sezon ${s.number}`}
            active={s.number === season}
            onPress={() => setSeason(s.number)}
          />
        ))}
      </ScrollView>

      <View style={styles.progressBox}>
        <View style={styles.progressTop}>
          <AppText variant="caption">
            {episodes.length} bölümün {watchedCount} tanesi izlendi
          </AppText>
          <AppText variant="caption" color={colors.primary}>
            {episodes.length ? Math.round((watchedCount / episodes.length) * 100) : 0}%
          </AppText>
        </View>
        <ProgressBar progress={episodes.length ? watchedCount / episodes.length : 0} />
      </View>

      {loading && !data && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {episodes.map((e) => {
        const watched = !!watchedMap?.[episodeKey(e.season, e.number)];
        const future = !e.airDate || e.airDate > today;
        const isNext = nextUp?.id === e.id;
        return (
          <Pressable
            key={e.id}
            style={[styles.row, isNext && styles.rowNext]}
            onPress={() => openEpisode(show.id, e.season, e.number)}
          >
            <View style={styles.still}>
              {e.stillUrl && (
                <Image
                  source={{ uri: e.stillUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              )}
              {watched && (
                <View style={styles.stillCheck}>
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                </View>
              )}
            </View>
            <View style={styles.info}>
              {isNext && (
                <AppText variant="overline" color={colors.primary}>
                  Sıradaki
                </AppText>
              )}
              <AppText variant="caption" color={colors.primaryLight}>
                {formatEpisodeCode(e.season, e.number)}
                {e.airDate ? ` • ${formatShortDate(e.airDate)}` : ""}
                {e.runtime ? ` • ${e.runtime} dk` : ""}
              </AppText>
              <AppText variant="title" numberOfLines={1}>
                {e.name}
              </AppText>
              {future ? (
                <AppText variant="caption">
                  {e.airDate ? `${formatShortDate(e.airDate)} tarihinde yayınlanacak` : "Yayın tarihi belli değil"}
                </AppText>
              ) : (
                <AppText variant="caption" numberOfLines={2}>
                  {e.overview || "Özet yok."}
                </AppText>
              )}
            </View>
            <View style={styles.actions}>
              {!future && (
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    toggleEpisode(show, e.season, e.number, e.runtime ?? show.runtime)
                  }
                  accessibilityLabel="İzlendi olarak işaretle"
                >
                  <Ionicons
                    name={watched ? "checkmark-circle" : "ellipse-outline"}
                    size={28}
                    color={watched ? colors.primary : colors.textTertiary}
                  />
                </Pressable>
              )}
              {!future && (
                <Pressable
                  hitSlop={8}
                  onPress={() => openReview("tv", show.id, e.season, e.number)}
                  accessibilityLabel="Bölüm için yorum yaz"
                >
                  <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seasons: { gap: spacing.sm },
  progressBox: {
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
  },
  rowNext: { borderColor: colors.primary },
  still: {
    width: 96,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  stillCheck: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(9,10,15,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, gap: 1 },
  actions: { alignItems: "center", gap: spacing.md },
});
