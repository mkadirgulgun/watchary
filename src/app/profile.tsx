import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Href, router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { ImagePickerSheet } from "@/components/image-picker-sheet";
import { PosterCard } from "@/components/poster-card";
import { colors, radius, spacing } from "@/constants/theme";
import { formatDuration } from "@/lib/format";
import { openList, openPerson, openSearch } from "@/lib/nav";
import { computeStats } from "@/lib/stats";
import { useAuth } from "@/lib/auth-store";
import { fetchFollowCounts, useSocial } from "@/lib/social";
import { useStore } from "@/lib/store";
import { useAsync } from "@/lib/use-async";
import { sized } from "@/lib/tmdb";
import { MediaRef } from "@/lib/types";

const GENRE_SHADES = ["#FFC174", "#F59E0B", "#D4A017", "#A8957A", "#6B5A45"];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile);
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const episodeNotes = useStore((s) => s.episodeNotes);
  const reviews = useStore((s) => s.reviews);
  const activity = useStore((s) => s.activity);
  const lists = useStore((s) => s.lists);
  const updateProfile = useStore((s) => s.updateProfile);
  const me = useAuth((s) => s.session?.user.id);
  const following = useSocial((s) => s.following);
  const counts = useAsync(
    () => (me ? fetchFollowCounts(me) : Promise.resolve(null)),
    [me, Object.keys(following).length],
  );
  const openPeople = (type: "followers" | "following") =>
    router.push(`/people/${profile.handle}?type=${type}` as Href);
  const [picker, setPicker] = useState<"avatar" | "cover" | null>(null);

  const stats = useMemo(
    () =>
      computeStats(
        entries,
        episodes,
        reviews.filter((r) => r.rewatch && r.ref.type === "movie").length,
      ),
    [entries, episodes, reviews],
  );

  const favorites = useMemo(
    () =>
      Object.values(entries)
        .filter((e) => e.favorite)
        .map((e) => e.ref),
    [entries],
  );

  // Son izlenenler: aktivite akışındaki benzersiz yapımlar.
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: MediaRef[] = [];
    for (const a of activity) {
      if (a.kind === "review" || a.kind === "rated") continue;
      if (seen.has(a.ref.key)) continue;
      seen.add(a.ref.key);
      out.push(a.ref);
      if (out.length >= 12) break;
    }
    return out;
  }, [activity]);

  // En sevdiğin oyuncular: bölüm ekranında "en çok kimi sevdin?" seçimlerinden.
  const topActors = useMemo(() => {
    const counts = new Map<number, { id: number; name: string; photoUrl: string | null; n: number }>();
    for (const showNotes of Object.values(episodeNotes)) {
      for (const note of Object.values(showNotes)) {
        const a = note.favoriteActor;
        if (!a) continue;
        const cur = counts.get(a.id);
        if (cur) cur.n += 1;
        else counts.set(a.id, { ...a, n: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  }, [episodeNotes]);

  const maxBucket = Math.max(1, ...stats.ratingBuckets);
  const hasData = stats.moviesWatched + stats.showsTracked + stats.episodesWatched > 0;
  const hasRatings = stats.ratingBuckets.some((n) => n > 0);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Kapak: ekranın en üstüne kadar uzanır */}
        <View style={[styles.cover, { height: 190 + insets.top }]}>
          {profile.coverUri ? (
            <Image
              source={{ uri: profile.coverUri }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <LinearGradient
              colors={["rgba(245,158,11,0.5)", "rgba(124,90,30,0.25)", "rgba(9,10,15,0.4)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}
          <LinearGradient
            colors={["rgba(9,10,15,0.45)", "rgba(9,10,15,0)", colors.background]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              style={styles.navBtn}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              accessibilityLabel="Geri"
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Pressable
              style={styles.navBtn}
              onPress={() => router.push("/settings" as Href)}
              accessibilityLabel="Ayarlar"
            >
              <Ionicons name="settings-outline" size={20} color={colors.text} />
            </Pressable>
          </View>
          <Pressable
            style={styles.coverEdit}
            onPress={() => setPicker("cover")}
            accessibilityLabel="Kapak resmini değiştir"
          >
            <Ionicons name="camera-outline" size={15} color={colors.text} />
            <AppText variant="caption" color={colors.text}>
              Kapak
            </AppText>
          </Pressable>
        </View>

        {/* Kimlik */}
        <View style={styles.identity}>
          <View style={styles.identityTop}>
            <Pressable
              style={styles.avatarRing}
              onPress={() => setPicker("avatar")}
              accessibilityLabel="Profil resmini değiştir"
            >
              <Avatar name={profile.name} uri={profile.avatarUri} size={92} />
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={13} color={colors.onPrimary} />
              </View>
            </Pressable>
            <Button
              size="sm"
              variant="secondary"
              icon="create-outline"
              label="Profili Düzenle"
              onPress={() => router.push("/profile-edit" as Href)}
            />
          </View>
          <AppText variant="display">{profile.name}</AppText>
          <View style={styles.handleRow}>
            <AppText variant="bodySmall" color={colors.primaryLight}>
              @{profile.handle}
            </AppText>
            {!!profile.location && (
              <>
                <AppText variant="bodySmall">•</AppText>
                <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                <AppText variant="bodySmall">{profile.location}</AppText>
              </>
            )}
          </View>
          {!!profile.bio && (
            <AppText variant="body" color={colors.textSecondary}>
              {profile.bio}
            </AppText>
          )}
          <View style={styles.followRow}>
            <Pressable onPress={() => openPeople("followers")} hitSlop={6}>
              <AppText variant="label">
                {counts.data?.followers ?? 0}{" "}
                <AppText variant="caption">takipçi</AppText>
              </AppText>
            </Pressable>
            <Pressable onPress={() => openPeople("following")} hitSlop={6}>
              <AppText variant="label">
                {counts.data?.following ?? 0}{" "}
                <AppText variant="caption">takip</AppText>
              </AppText>
            </Pressable>
          </View>
        </View>

        {/* Sayılar */}
        <View style={styles.strip}>
          <Stat value={stats.moviesWatched} label="Film" />
          <View style={styles.divider} />
          <Stat value={stats.showsTracked} label="Dizi" />
          <View style={styles.divider} />
          <Stat value={stats.episodesWatched} label="Bölüm" />
          <View style={styles.divider} />
          <Stat value={reviews.length} label="İnceleme" />
        </View>

        {/* Toplam süre */}
        <View style={styles.timeCard}>
          <View style={styles.timeTop}>
            <View style={styles.timeIcon}>
              <Ionicons name="time" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="overline">Toplam izleme süresi</AppText>
              <AppText variant="display" color={colors.primaryLight}>
                {formatDuration(stats.totalMinutes)}
              </AppText>
            </View>
            {stats.episodesThisMonth > 0 && (
              <View style={styles.monthPill}>
                <AppText variant="caption" color={colors.primaryLight}>
                  Bu ay {stats.episodesThisMonth} bölüm
                </AppText>
              </View>
            )}
          </View>

          {/* Film ve dizi payı */}
          <View style={styles.split}>
            <View style={[styles.splitMovie, { flex: Math.max(stats.movieMinutes, 1) }]} />
            <View style={[styles.splitShow, { flex: Math.max(stats.showMinutes, 1) }]} />
          </View>
          <View style={styles.splitLegend}>
            <View style={styles.splitItem}>
              <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              <View>
                <AppText variant="caption">Film</AppText>
                <AppText variant="label">{formatDuration(stats.movieMinutes)}</AppText>
              </View>
            </View>
            <View style={styles.splitItem}>
              <View style={[styles.dot, { backgroundColor: "#7C5A1E" }]} />
              <View>
                <AppText variant="caption">Dizi</AppText>
                <AppText variant="label">{formatDuration(stats.showMinutes)}</AppText>
              </View>
            </View>
          </View>
        </View>

        {!hasData && (
          <View style={styles.emptyCard}>
            <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
            <AppText variant="title" style={styles.center}>
              Profilin seninle birlikte dolacak
            </AppText>
            <AppText variant="bodySmall" style={styles.center}>
              Film ve dizi izledikçe istatistiklerin, favorilerin ve tür zevkin burada görünür.
            </AppText>
            <Button size="sm" label="Bir şey bul" icon="search" onPress={openSearch} />
          </View>
        )}

        {favorites.length > 0 && <Rail title="Favorilerin" icon="heart" items={favorites} />}
        {recent.length > 0 && <Rail title="Son İzlediklerin" icon="play-circle" items={recent} />}

        {topActors.length > 0 && (
          <View style={styles.block}>
            <SectionTitle icon="people" title="En Sevdiğin Oyuncular" />
            <FlatList
              data={topActors}
              keyExtractor={(a) => String(a.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railList}
              renderItem={({ item }) => (
                <Pressable style={styles.actor} onPress={() => openPerson(item.id)}>
                  <View style={styles.actorPhoto}>
                    {item.photoUrl ? (
                      <Image
                        source={{ uri: item.photoUrl }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={26} color={colors.textTertiary} />
                    )}
                    <View style={styles.actorCount}>
                      <Ionicons name="heart" size={10} color={colors.onPrimary} />
                      <AppText variant="caption" color={colors.onPrimary} style={styles.actorCountText}>
                        {item.n}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="label" numberOfLines={1} style={styles.center}>
                    {item.name}
                  </AppText>
                </Pressable>
              )}
            />
          </View>
        )}

        {stats.genres.length > 0 && (
          <View style={styles.card}>
            <SectionTitle icon="color-palette" title="Tür Zevkin" />
            <View style={styles.stack}>
              {stats.genres.map((g, i) => (
                <View key={g.name} style={{ flex: g.pct, backgroundColor: GENRE_SHADES[i] }} />
              ))}
            </View>
            <View style={styles.legend}>
              {stats.genres.map((g, i) => (
                <View key={g.name} style={styles.legendItem}>
                  <View style={[styles.dot, { backgroundColor: GENRE_SHADES[i] }]} />
                  <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
                    {g.name}
                  </AppText>
                  <AppText variant="label" color={colors.textSecondary}>
                    %{g.pct}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {hasRatings && (
          <View style={styles.card}>
            <View style={styles.spreadTop}>
              <SectionTitle icon="stats-chart" title="Puan Dağılımın" />
              {stats.ratingMean !== null && (
                <View style={styles.monthPill}>
                  <Ionicons name="star" size={11} color={colors.primary} />
                  <AppText variant="caption" color={colors.primaryLight}>
                    Ort. {stats.ratingMean.toFixed(1)}
                  </AppText>
                </View>
              )}
            </View>
            <View style={styles.bars}>
              {stats.ratingBuckets.map((n, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barArea}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${Math.max(5, (n / maxBucket) * 100)}%`,
                          backgroundColor:
                            i === stats.ratingPeakIndex ? colors.primary : colors.surfaceHigh,
                        },
                      ]}
                    />
                  </View>
                  <AppText variant="caption" style={styles.barLabel}>
                    {((i + 1) / 2).toFixed(1)}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        )}

        {lists.length > 0 && (
          <View style={styles.block}>
            <SectionTitle icon="albums" title="Listelerin" />
            <FlatList
              data={lists}
              keyExtractor={(l) => l.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.railList}
              renderItem={({ item }) => (
                <Pressable style={styles.listCard} onPress={() => openList(item.id)}>
                  <View style={styles.collage}>
                    {item.items.slice(0, 3).map((m) => (
                      <View key={m.key} style={styles.collageItem}>
                        {m.posterUrl && (
                          <Image
                            source={{ uri: sized(m.posterUrl, "w154") ?? m.posterUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        )}
                      </View>
                    ))}
                    {item.items.length === 0 && (
                      <Ionicons name="albums-outline" size={26} color={colors.textTertiary} />
                    )}
                  </View>
                  <AppText variant="title" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption">{item.items.length} başlık</AppText>
                </Pressable>
              )}
            />
          </View>
        )}
      </ScrollView>

      <ImagePickerSheet
        mode={picker}
        hasCurrent={picker === "avatar" ? !!profile.avatarUri : !!profile.coverUri}
        onClose={() => setPicker(null)}
        onPick={(uri) => {
          if (picker === "avatar") updateProfile({ avatarUri: uri });
          if (picker === "cover") updateProfile({ coverUri: uri });
          setPicker(null);
        }}
      />
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="display">{value}</AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <AppText variant="headline">{title}</AppText>
    </View>
  );
}

function Rail({
  title,
  icon,
  items,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: MediaRef[];
}) {
  return (
    <View style={styles.block}>
      <SectionTitle icon={icon} title={title} />
      <FlatList
        data={items}
        keyExtractor={(m) => m.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railList}
        initialNumToRender={4}
        windowSize={5}
        renderItem={({ item }) => <PosterCard item={item} width={108} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  nav: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  center: { textAlign: "center" },
  cover: { width: "100%", backgroundColor: colors.surfaceHigh },
  coverEdit: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  identity: { paddingHorizontal: spacing.lg, gap: spacing.xs + 2, marginTop: -52 },
  identityTop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.background,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  handleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  followRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.xs },
  strip: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  divider: { width: 1, backgroundColor: colors.border },
  timeCard: {
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  timeTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  split: {
    flexDirection: "row",
    height: 10,
    borderRadius: radius.full,
    overflow: "hidden",
    gap: 2,
  },
  splitMovie: { backgroundColor: colors.primary },
  splitShow: { backgroundColor: "#7C5A1E" },
  splitLegend: { flexDirection: "row", gap: spacing.xl },
  splitItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timeIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  monthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  emptyCard: {
    marginHorizontal: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  block: { gap: spacing.md },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  railList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  actor: { width: 84, alignItems: "center", gap: 6 },
  actorPhoto: {
    width: 74,
    height: 74,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  actorCount: {
    position: "absolute",
    bottom: -4,
    right: -4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  actorCountText: { fontSize: 10, lineHeight: 12 },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stack: {
    flexDirection: "row",
    height: 12,
    borderRadius: radius.full,
    overflow: "hidden",
    gap: 2,
  },
  legend: { gap: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.full },
  spreadTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bars: { flexDirection: "row", gap: 6, height: 120, alignItems: "flex-end" },
  barCol: { flex: 1, height: "100%", alignItems: "center", gap: 4 },
  barArea: { flex: 1, width: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 10 },
  listCard: { width: 150, gap: 2 },
  collage: {
    height: 100,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm - 2,
  },
  collageItem: {
    width: 48,
    height: 72,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    marginRight: -12,
    borderWidth: 1,
    borderColor: colors.surface,
  },
});
