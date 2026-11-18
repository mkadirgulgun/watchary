import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { ProgressBar } from "@/components/progress-bar";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import {
  daysBetween,
  formatEpisodeCode,
  formatShortDate,
  todayISO,
} from "@/lib/format";
import { openEpisode, openMedia, openSearch } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { computeUpNext, UpNextItem } from "@/lib/up-next";
import { useAsync } from "@/lib/use-async";

type Filter = "all" | "week" | "behind";

function relativeAir(iso: string | null): string {
  if (!iso) return "";
  const diff = daysBetween(iso, todayISO());
  if (diff <= 0) return "Bugün";
  if (diff === 1) return "Dün";
  if (diff < 7) return `${diff} gün önce`;
  return formatShortDate(iso);
}

export default function UpNextScreen() {
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const toggleEpisode = useStore((s) => s.toggleEpisode);
  const [filter, setFilter] = useState<Filter>("all");

  // Takip edilen diziler: izleme listesinde olanlar ya da en az bir bölümü izlenenler.
  const tracked = useMemo(
    () =>
      Object.values(entries)
        .filter(
          (e) =>
            e.ref.type === "tv" &&
            (e.watchlist || Object.keys(episodes[e.ref.key] ?? {}).length > 0),
        )
        .map((e) => e.ref),
    [entries, episodes],
  );

  // Bölüm işaretlenince yeniden hesaplansın diye izlenen bölüm sayısını imzaya katıyoruz.
  const signature = tracked
    .map((t) => `${t.key}:${Object.keys(episodes[t.key] ?? {}).length}`)
    .join("|");

  const { data, loading, error, reload } = useAsync<UpNextItem[]>(
    async () => {
      const results = await Promise.all(
        tracked.map(async (t) => {
          try {
            return await computeUpNext(t, episodes[t.key] ?? {});
          } catch {
            return null; // Tek bir dizi yüklenemezse diğerleri görünmeye devam etsin.
          }
        }),
      );
      return results.filter((r): r is UpNextItem => r !== null);
    },
    [signature],
  );

  const items = data ?? [];
  const waiting = items.filter((i) => i.next);
  const caughtUp = items.filter((i) => !i.next);

  const filtered = waiting.filter((i) => {
    if (filter === "week") {
      return !!i.next?.airDate && daysBetween(i.next.airDate, todayISO()) <= 7;
    }
    if (filter === "behind") return i.behind >= 2;
    return true;
  });

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleLine}>
              <AppText variant="display">Sıradaki</AppText>
              {waiting.length > 0 && (
                <View style={styles.countPill}>
                  <AppText variant="caption" color={colors.primaryLight}>
                    {waiting.reduce((n, i) => n + i.behind, 0)} bölüm bekliyor
                  </AppText>
                </View>
              )}
            </View>
            <AppText variant="bodySmall">Kişisel bölüm kuyruğun</AppText>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Tümü" active={filter === "all"} onPress={() => setFilter("all")} />
          <Chip label="Bu Hafta" active={filter === "week"} onPress={() => setFilter("week")} />
          <Chip label="Yetişiyorum" active={filter === "behind"} onPress={() => setFilter("behind")} />
        </ScrollView>

        {tracked.length === 0 && (
          <EmptyState
            icon="tv-outline"
            title="Takip ettiğin dizi yok"
            message="Bir diziyi “Takip Et” dediğinde sıradaki bölümü burada görürsün."
            actionLabel="Dizi ara"
            onAction={openSearch}
          />
        )}
        {tracked.length > 0 && loading && !data && <Loading />}
        {error && <ErrorState message={error} onRetry={reload} />}

        {filtered.map((item) => (
          <UpNextCard
            key={item.show.key}
            item={item}
            onMark={() =>
              item.next &&
              toggleEpisode(
                item.show,
                item.next.season,
                item.next.number,
                item.next.runtime ?? item.show.runtime,
              )
            }
          />
        ))}

        {waiting.length > 0 && filtered.length === 0 && (
          <EmptyState icon="funnel-outline" title="Bu filtrede dizi yok" />
        )}

        {caughtUp.length > 0 && (
          <View style={styles.caught}>
            <AppText variant="headline">Yetiştin</AppText>
            {caughtUp.map((i) => (
              <Pressable
                key={i.show.key}
                style={styles.caughtRow}
                onPress={() => openMedia("tv", i.show.id)}
              >
                <View style={styles.smallPoster}>
                  {i.show.posterUrl && (
                    <Image source={{ uri: sized(i.show.posterUrl, "w154") ?? i.show.posterUrl }} style={styles.fill} contentFit="cover" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="title" numberOfLines={1}>
                    {i.show.title}
                  </AppText>
                  <AppText variant="caption">
                    {i.show.nextEpisode?.airDate
                      ? `Sıradaki: ${formatEpisodeCode(i.show.nextEpisode.season, i.show.nextEpisode.number)} • ${formatShortDate(i.show.nextEpisode.airDate)}`
                      : "Yeni bölüm tarihi henüz belli değil"}
                  </AppText>
                </View>
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function UpNextCard({ item, onMark }: { item: UpNextItem; onMark: () => void }) {
  const { show, next } = item;
  if (!next) return null;
  const pct = item.seasonTotal ? item.seasonWatched / item.seasonTotal : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Pressable style={styles.poster} onPress={() => openMedia("tv", show.id)}>
          {show.posterUrl && (
            <Image source={{ uri: sized(show.posterUrl, "w154") ?? show.posterUrl }} style={styles.fill} contentFit="cover" />
          )}
        </Pressable>
        <View style={styles.cardInfo}>
          <View style={styles.titleLine}>
            <AppText variant="headline" numberOfLines={1} style={{ flex: 1 }}>
              {show.title}
            </AppText>
            <AppText variant="caption">{relativeAir(next.airDate)}</AppText>
          </View>
          <Pressable
            style={styles.epRow}
            onPress={() => openEpisode(show.id, next.season, next.number)}
          >
            <View style={styles.codePill}>
              <AppText variant="caption" color={colors.primaryLight}>
                {formatEpisodeCode(next.season, next.number)}
              </AppText>
            </View>
            <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
              {next.name}
            </AppText>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          </Pressable>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
            <AppText variant="caption">
              {next.runtime ?? show.runtime ?? "—"} dk
              {show.network ? ` • ${show.network}` : ""}
            </AppText>
          </View>
          <View style={styles.progressTop}>
            <AppText variant="caption">Sezon ilerlemesi</AppText>
            <AppText variant="caption" color={colors.primary}>
              {item.seasonWatched}/{item.seasonTotal} bölüm ({Math.round(pct * 100)}%)
            </AppText>
          </View>
          <ProgressBar progress={pct} />
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Pressable style={styles.details} onPress={() => openMedia("tv", show.id)}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <AppText variant="label" color={colors.textSecondary}>
            Detaylar
          </AppText>
        </Pressable>
        <Button icon="checkmark" label="İzlendi İşaretle" onPress={onMark} style={styles.mark} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  titleLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  countPill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  chips: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardTop: { flexDirection: "row", gap: spacing.md },
  poster: {
    width: 92,
    height: 138,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  fill: { width: "100%", height: "100%" },
  cardInfo: { flex: 1, gap: spacing.xs + 2 },
  epRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  codePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  progressTop: { flexDirection: "row", justifyContent: "space-between", marginTop: "auto" },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  details: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, padding: spacing.xs },
  mark: { minWidth: 170 },
  caught: { gap: spacing.md },
  caughtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  smallPoster: {
    width: 44,
    height: 66,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
});
