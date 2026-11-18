import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddToListSheet } from "@/components/add-to-list-sheet";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { EpisodeGuide } from "@/components/episode-guide";
import { ReviewCard } from "@/components/review-card";
import { useReviews } from "@/lib/community";
import { StarRating } from "@/components/star-rating";
import { ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { formatRuntime } from "@/lib/format";
import { openPerson, openReview } from "@/lib/nav";
import { PROVIDER_KIND_LABEL, providerSearchUrl } from "@/lib/providers";
import { useStore } from "@/lib/store";
import { getDetails } from "@/lib/tmdb";
import { MediaDetails, MediaType } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

export default function DetailScreen() {
  const params = useLocalSearchParams<{ type: string; id: string }>();
  const type: MediaType = params.type === "tv" ? "tv" : "movie";
  const id = Number(params.id);

  const { data, error, loading, reload } = useAsync(
    () => getDetails(type, id),
    [type, id],
  );

  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      {loading && !data && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <DetailBody item={data} onBack={back} topInset={insets.top} />}
      {!data && (
        <Pressable
          onPress={back}
          style={[styles.back, { top: insets.top + spacing.sm }]}
          accessibilityLabel="Geri"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      )}
    </View>
  );
}

function DetailBody({
  item,
  onBack,
  topInset,
}: {
  item: MediaDetails;
  onBack: () => void;
  topInset: number;
}) {
  const entry = useStore((s) => s.entries[item.key]);
  const { reviews } = useReviews(item.key);
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const toggleWatched = useStore((s) => s.toggleWatched);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const setRating = useStore((s) => s.setRating);
  const setRuntime = useStore((s) => s.setRuntime);

  const [expanded, setExpanded] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [hideSpoilers, setHideSpoilers] = useState(true);
  const [revealReviews, setRevealReviews] = useState(false);

  // İstatistikler için süreyi kayıtlı öğeye işle.
  useEffect(() => {
    if (entry && item.runtime && entry.runtime !== item.runtime) {
      setRuntime(item, item.runtime);
    }
  }, [entry, item, setRuntime]);

  const isMovie = item.type === "movie";
  const rating = entry?.rating ?? 0;
  const watchedEpisodes = useStore((s) => Object.keys(s.episodes[item.key] ?? {}).length);
  // Puan vermek ve yorum yazmak için önce izlemiş olmak gerekir.
  const canReview = isMovie ? !!entry?.watched : watchedEpisodes > 0 || !!entry?.watched;
  const lockHint = isMovie
    ? "Puanlamak ve yorum yazmak için önce “İzledim” olarak işaretle."
    : "Puanlamak ve yorum yazmak için önce en az bir bölümü izlendi olarak işaretle.";

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.backdrop}>
        {item.backdropUrl && (
          <Image
            source={{ uri: item.backdropUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        )}
        <LinearGradient
          colors={["rgba(9,10,15,0.2)", "rgba(9,10,15,0.5)", colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          onPress={onBack}
          style={[styles.back, { top: topInset + spacing.sm }]}
          accessibilityLabel="Geri"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        {item.trailerUrl && (
          <Pressable
            style={styles.trailer}
            onPress={() => Linking.openURL(item.trailerUrl as string)}
          >
            <Ionicons name="play" size={14} color={colors.text} />
            <AppText variant="label">Fragman</AppText>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.headRow}>
          <View style={styles.poster}>
            {item.posterUrl && (
              <Image
                source={{ uri: item.posterUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
              />
            )}
          </View>
          <View style={styles.headInfo}>
            <View style={styles.badges}>
              {!!item.year && (
                <View style={styles.badge}>
                  <AppText variant="caption">{item.year}</AppText>
                </View>
              )}
              <View style={styles.badge}>
                <AppText variant="caption" color={colors.primaryLight}>
                  {isMovie ? "Film" : "Dizi"}
                </AppText>
              </View>
              {!!item.runtime && (
                <View style={styles.badge}>
                  <AppText variant="caption">
                    {formatRuntime(item.runtime)}
                    {isMovie ? "" : " / bölüm"}
                  </AppText>
                </View>
              )}
            </View>
            <AppText variant="display" numberOfLines={3}>
              {item.title}
            </AppText>
            <AppText variant="caption" numberOfLines={2}>
              {item.genres.join(" • ")}
            </AppText>
          </View>
        </View>

        {!!item.tagline && (
          <AppText variant="bodySmall" style={styles.tagline}>
            “{item.tagline}”
          </AppText>
        )}

        <View style={styles.stats}>
          <Stat icon="star" value={item.rating.toFixed(1)} label="TMDB" />
          <View style={styles.divider} />
          <Stat
            icon={isMovie ? "person-outline" : "tv-outline"}
            value={isMovie ? (item.director ?? "—") : `${item.seasons.length} sezon`}
            label={isMovie ? "Yönetmen" : `${item.episodeCount} bölüm`}
          />
          <View style={styles.divider} />
          <Stat
            icon="business-outline"
            value={item.network ?? "—"}
            label={isMovie ? "Yapım" : "Kanal"}
          />
        </View>

        <View style={styles.actions}>
          {isMovie ? (
            <Button
              style={styles.flex}
              icon={entry?.watched ? "checkmark-circle" : "checkmark-circle-outline"}
              label={entry?.watched ? "İzlendi" : "İzledim"}
              onPress={() => toggleWatched(item, item.runtime)}
            />
          ) : (
            <Button
              style={styles.flex}
              icon={entry?.watchlist ? "bookmark" : "bookmark-outline"}
              label={entry?.watchlist ? "Takipte" : "Takip Et"}
              onPress={() => toggleWatchlist(item)}
            />
          )}
          {isMovie && (
            <Button
              variant="secondary"
              icon={entry?.watchlist ? "bookmark" : "bookmark-outline"}
              active={entry?.watchlist}
              onPress={() => toggleWatchlist(item)}
            />
          )}
          <Button
            variant="secondary"
            icon={entry?.favorite ? "heart" : "heart-outline"}
            active={entry?.favorite}
            onPress={() => toggleFavorite(item)}
          />
          <Button variant="secondary" icon="add" onPress={() => setSheet(true)} />
        </View>

        {canReview ? (
          <View style={styles.rateBox}>
            <View style={styles.rateTop}>
              <AppText variant="overline">Senin Puanın</AppText>
              <Pressable onPress={() => openReview(item.type, item.id)}>
                <AppText variant="caption" color={colors.primary}>
                  Günlüğe yaz
                </AppText>
              </Pressable>
            </View>
            <View style={styles.rateRow}>
              <StarRating value={rating} size={30} onChange={(v) => setRating(item, v || null)} />
              <View style={styles.rateValue}>
                <AppText variant="label">{rating ? rating.toFixed(1) : "—"} / 5</AppText>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.lockedBox}>
            <Ionicons name="lock-closed" size={18} color={colors.primary} />
            <AppText variant="bodySmall" style={{ flex: 1 }}>
              {lockHint}
            </AppText>
          </View>
        )}

        <View style={styles.section}>
          <AppText variant="headline">Özet</AppText>
          <AppText variant="body" color={colors.textSecondary} numberOfLines={expanded ? undefined : 4}>
            {item.overview || "Bu başlık için özet bulunamadı."}
          </AppText>
          {item.overview.length > 220 && (
            <Pressable onPress={() => setExpanded((v) => !v)}>
              <AppText variant="label" color={colors.primary}>
                {expanded ? "Daha az göster" : "Devamını oku"}
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <AppText variant="headline">Nerede İzlenir</AppText>
          {item.providers.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providers}>
              {item.providers.map((p) => (
                <Pressable
                  key={p.id}
                  style={styles.provider}
                  onPress={() => {
                    const url = providerSearchUrl(p.name, item.title) ?? item.watchLink;
                    if (url) Linking.openURL(url);
                  }}
                  accessibilityLabel={`${p.name} üzerinde aç`}
                >
                  <View style={styles.providerLogo}>
                    {p.logoUrl && (
                      <Image source={{ uri: p.logoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                    )}
                  </View>
                  <AppText variant="caption" numberOfLines={1} style={styles.providerName}>
                    {p.name}
                  </AppText>
                  <AppText variant="overline" color={colors.primary} style={styles.providerKind}>
                    {PROVIDER_KIND_LABEL[p.kind]}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <AppText variant="bodySmall">
              Türkiye için platform bilgisi bulunamadı.
            </AppText>
          )}
          {item.watchLink && (
            <Pressable
              style={styles.allOptions}
              onPress={() => Linking.openURL(item.watchLink as string)}
            >
              <Ionicons name="open-outline" size={14} color={colors.primary} />
              <AppText variant="label" color={colors.primary}>
                Tüm seçenekleri gör
              </AppText>
            </Pressable>
          )}
        </View>

        {item.cast.length > 0 && (
          <View style={styles.section}>
            <AppText variant="headline">Oyuncular</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.castRow}>
              {item.cast.map((c) => (
                <Pressable key={c.id} style={styles.cast} onPress={() => openPerson(c.id)}>
                  <View style={styles.castPhoto}>
                    {c.photoUrl ? (
                      <Image source={{ uri: c.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Ionicons name="person" size={28} color={colors.textTertiary} />
                    )}
                  </View>
                  <AppText variant="label" numberOfLines={1} style={styles.castText}>
                    {c.name}
                  </AppText>
                  <AppText variant="caption" numberOfLines={1} style={styles.castText}>
                    {c.character}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {!isMovie && item.seasons.length > 0 && <EpisodeGuide show={item} />}

        <View style={styles.section}>
          <View style={styles.reviewsTop}>
            <AppText variant="headline">Günlük ve İncelemeler</AppText>
            <View style={styles.spoilerRow}>
              <AppText variant="caption">Spoiler gizle</AppText>
              <Switch
                value={hideSpoilers}
                onValueChange={setHideSpoilers}
                trackColor={{ true: colors.primaryDeep, false: colors.border }}
                thumbColor={hideSpoilers ? colors.primaryLight : colors.textSecondary}
              />
            </View>
          </View>
          {reviews.length === 0 && (
            <AppText variant="bodySmall">
              {canReview
                ? "Henüz yazı yok. İlk izlenimini günlüğüne ekle."
                : "Henüz yazı yok."}
            </AppText>
          )}
          {reviews.length > 0 && !canReview && !revealReviews ? (
            <View style={styles.warn}>
              <View style={styles.warnTop}>
                <Ionicons name="warning" size={18} color={colors.primary} />
                <AppText variant="title" style={{ flex: 1 }}>
                  Dikkat, spoiler olabilir!
                </AppText>
              </View>
              <AppText variant="bodySmall">
                {isMovie
                  ? "Bu filmi henüz izlemedin. Yorumlar olayları açık edebilir."
                  : "Bu diziden henüz bir bölüm izlemedin. Yorumlar olayları açık edebilir."}
              </AppText>
              {isMovie && (
                <Button
                  size="sm"
                  icon="checkmark-circle"
                  label="Filmi izledim"
                  onPress={() => {
                    // İzlendi yap ve yorum sayfasını aç.
                    toggleWatched(item, item.runtime);
                    openReview(item.type, item.id);
                  }}
                />
              )}
              <Button
                size="sm"
                variant="secondary"
                icon="eye-outline"
                label={`Yine de ${reviews.length} yorumu göster`}
                onPress={() => setRevealReviews(true)}
              />
            </View>
          ) : (
            reviews.map((r) => (
              <ReviewCard key={r.id} review={r} hideSpoilers={hideSpoilers} />
            ))
          )}
          <Button
            variant="secondary"
            icon={canReview ? "create-outline" : "lock-closed-outline"}
            label="İnceleme Yaz"
            disabled={!canReview}
            onPress={() => openReview(item.type, item.id)}
          />
        </View>
      </View>

      <AddToListSheet visible={sheet} item={item} onClose={() => setSheet(false)} />
    </ScrollView>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statTop}>
        <Ionicons name={icon} size={13} color={colors.primary} />
        <AppText variant="label" numberOfLines={1} style={styles.statValue}>
          {value}
        </AppText>
      </View>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl * 2 },
  back: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: { height: 260, backgroundColor: colors.surface, justifyContent: "flex-end", alignItems: "flex-end" },
  trailer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.lg,
    marginBottom: 56,
  },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, marginTop: -72 },
  headRow: { flexDirection: "row", gap: spacing.md, alignItems: "flex-end" },
  poster: {
    width: 110,
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  headInfo: { flex: 1, gap: spacing.xs + 2, paddingBottom: 2 },
  badges: { flexDirection: "row", gap: spacing.xs + 2, flexWrap: "wrap" },
  badge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  tagline: { fontStyle: "italic" },
  stats: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 2, paddingHorizontal: spacing.sm },
  statTop: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { flexShrink: 1 },
  divider: { width: 1, backgroundColor: colors.border },
  actions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  warn: {
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    padding: spacing.md,
  },
  warnTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  lockedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: spacing.md,
  },
  rateBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rateTop: { flexDirection: "row", justifyContent: "space-between" },
  rateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rateValue: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  section: { gap: spacing.md },
  providers: { gap: spacing.md },
  provider: { alignItems: "center", gap: 2, width: 72 },
  providerKind: { fontSize: 9, letterSpacing: 0.3 },
  allOptions: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  providerLogo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  providerName: { textAlign: "center" },
  castRow: { gap: spacing.md },
  cast: { width: 84, alignItems: "center", gap: 2 },
  castPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  castText: { textAlign: "center" },
  reviewsTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  spoilerRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
