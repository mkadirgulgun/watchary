import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ReviewCard } from "@/components/review-card";
import { useReviews } from "@/lib/community";
import { StarRating } from "@/components/star-rating";
import { ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { formatEpisodeCode, formatLongDate, todayISO } from "@/lib/format";
import { openMedia, openPerson, openReview } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { getDetails, getEpisode, getSeason } from "@/lib/tmdb";
import { episodeKey } from "@/lib/types";
import { EpisodeTarget, useUi } from "@/lib/ui-store";
import { useAsync } from "@/lib/use-async";

const FEELINGS = [
  { id: "loved", emoji: "😍", label: "Bayıldım" },
  { id: "funny", emoji: "😂", label: "Güldürdü" },
  { id: "shocked", emoji: "😱", label: "Şok oldum" },
  { id: "moved", emoji: "😢", label: "Duygulandım" },
  { id: "tense", emoji: "😬", label: "Gerildim" },
  { id: "confused", emoji: "🤯", label: "Aklım karıştı" },
  { id: "angry", emoji: "😡", label: "Sinirlendim" },
  { id: "bored", emoji: "😴", label: "Sıkıldım" },
];
const MAX_FEELINGS = 3;
const useNative = Platform.OS !== "web";

/** Uygulamanın en üstünde duran, bölüm paneli için tek bir yer. */
export function EpisodeSheetHost() {
  const target = useUi((s) => s.episodeSheet);
  if (!target) return null;
  return <EpisodeSheet target={target} />;
}

function EpisodeSheet({ target }: { target: EpisodeTarget }) {
  const { showId, season, episode: episodeNo } = target;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.round(height * 0.88);

  // Panel alttan kayarak açılır; tutma çubuğundan aşağı çekilince kapanır.
  const [y] = useState(() => new Animated.Value(height));
  const [opened, setOpened] = useState(false);
  const [spoilerFor, setSpoilerFor] = useState<string | null>(null);
  const [warnOpen, setWarnOpen] = useState(false);

  if (!opened) {
    setOpened(true);
    Animated.timing(y, { toValue: 0, duration: 260, useNativeDriver: useNative }).start();
  }

  const closeNow = () => useUi.getState().closeEpisode();
  const animateClose = () =>
    Animated.timing(y, { toValue: sheetHeight, duration: 200, useNativeDriver: useNative }).start(
      closeNow,
    );

  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) y.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 0.9) {
          Animated.timing(y, { toValue: height, duration: 180, useNativeDriver: useNative }).start(
            () => useUi.getState().closeEpisode(),
          );
        } else {
          Animated.spring(y, { toValue: 0, useNativeDriver: useNative }).start();
        }
      },
    }),
  );

  /** Başka bir sayfaya geçmeden önce paneli hemen kapat. */
  const leave = (action: () => void) => {
    closeNow();
    action();
  };

  const ep = useAsync(() => getEpisode(showId, season, episodeNo), [showId, season, episodeNo]);
  const show = useAsync(() => getDetails("tv", showId), [showId]);
  const seasonList = useAsync(() => getSeason(showId, season), [showId, season]);

  const showKey = `tv:${showId}`;
  const ek = episodeKey(season, episodeNo);
  const spoilerOk = spoilerFor === `${showId}:${ek}`;
  const watched = useStore((s) => !!s.episodes[showKey]?.[ek]);
  const note = useStore((s) => s.episodeNotes[showKey]?.[ek]);
  const toggleEpisode = useStore((s) => s.toggleEpisode);
  const setNote = useStore((s) => s.setEpisodeNote);

  const { reviews } = useReviews(showKey, season, episodeNo);

  const eps = seasonList.data ?? [];
  const idx = eps.findIndex((e) => e.number === episodeNo);
  const prev = idx > 0 ? eps[idx - 1] : null;
  const next = idx >= 0 && idx < eps.length - 1 ? eps[idx + 1] : null;
  const go = (n: number) =>
    useUi.getState().showEpisode({ showId, season, episode: n });

  // Sola kaydırınca sonraki, sağa kaydırınca önceki bölüm.
  const prevNo = prev?.number ?? null;
  const nextNo = next?.number ?? null;
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (g.dx < -70 && nextNo !== null) {
            useUi.getState().showEpisode({ showId, season, episode: nextNo });
          } else if (g.dx > 70 && prevNo !== null) {
            useUi.getState().showEpisode({ showId, season, episode: prevNo });
          }
        },
      }),
    [showId, season, prevNo, nextNo],
  );

  const data = ep.data;
  const showData = show.data;
  const aired = !!data?.airDate && data.airDate <= todayISO();

  const toggleFeeling = (id: string) => {
    const cur = note?.feelings ?? [];
    const list = cur.includes(id)
      ? cur.filter((f) => f !== id)
      : [...cur, id].slice(-MAX_FEELINGS);
    setNote(showKey, season, episodeNo, { feelings: list });
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={animateClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={animateClose} accessibilityLabel="Kapat" />
        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight, paddingBottom: insets.bottom, transform: [{ translateY: y }] },
          ]}
        >
          <View {...pan.panHandlers} style={styles.dragZone}>
            <View style={styles.grabber} />
          </View>
          <Pressable style={styles.close} onPress={animateClose} accessibilityLabel="Kapat">
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>

          {ep.loading && !data && <Loading />}
          {ep.error && <ErrorState message={ep.error} onRetry={ep.reload} />}

          {data && (
            <View style={styles.flex} {...swipe.panHandlers}>
            <ScrollView
              key={`${season}x${episodeNo}`}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.hero}>
                {data.stillUrl && (
                  <Image
                    source={{ uri: data.stillUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                )}
                <LinearGradient
                  colors={["rgba(18,19,26,0.1)", "rgba(18,19,26,0.55)", colors.surface]}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.body}>
                <View style={{ gap: 4 }}>
                  <Pressable onPress={() => leave(() => openMedia("tv", showId))}>
                    <AppText variant="label" color={colors.primary}>
                      {showData?.title ?? "Dizi"} ›
                    </AppText>
                  </Pressable>
                  <AppText variant="display">{data.name}</AppText>
                  <AppText variant="caption">
                    {formatEpisodeCode(season, episodeNo)}
                    {data.airDate ? ` • ${formatLongDate(data.airDate)}` : ""}
                    {data.runtime ? ` • ${data.runtime} dk` : ""}
                    {data.voteAverage > 0 ? ` • TMDB ${data.voteAverage.toFixed(1)}` : ""}
                  </AppText>
                </View>

                {aired ? (
                  <Button
                    icon={watched ? "checkmark-circle" : "checkmark-circle-outline"}
                    label={watched ? "İzlendi" : "İzledim"}
                    onPress={() =>
                      showData &&
                      toggleEpisode(showData, season, episodeNo, data.runtime ?? showData.runtime)
                    }
                  />
                ) : (
                  <View style={styles.notAired}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <AppText variant="label" style={{ flex: 1 }}>
                      {data.airDate
                        ? `${formatLongDate(data.airDate)} tarihinde yayınlanacak`
                        : "Yayın tarihi henüz belli değil"}
                    </AppText>
                  </View>
                )}

                {!!data.overview && (
                  <View style={styles.section}>
                    <AppText variant="headline">Özet</AppText>
                    <AppText variant="body" color={colors.textSecondary}>
                      {data.overview}
                    </AppText>
                  </View>
                )}

                {aired && !watched && (
                  <>
                    <View style={styles.locked}>
                      <View style={styles.lockIcon}>
                        <Ionicons name="lock-closed" size={20} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="title">Puan vermek için önce izle</AppText>
                        <AppText variant="bodySmall">
                          Puan vermek, tepki seçmek ve yorum yazmak için bölümü “İzledim” olarak
                          işaretle.
                        </AppText>
                      </View>
                    </View>

                    {/* İzlemeyen kişi yorumları görebilir; önce spoiler uyarısı çıkar. */}
                    <View style={styles.section}>
                      <AppText variant="headline">Yorumlar</AppText>
                      {reviews.length === 0 ? (
                        <AppText variant="bodySmall">Bu bölüm için henüz yorum yok.</AppText>
                      ) : spoilerOk ? (
                        reviews.map((r) => <ReviewCard key={r.id} review={r} />)
                      ) : (
                        <Button
                          variant="secondary"
                          icon="chatbubbles-outline"
                          label={`Yorumları Gör (${reviews.length})`}
                          onPress={() => setWarnOpen(true)}
                        />
                      )}
                    </View>
                  </>
                )}

                {aired && watched && (
                  <>
                    <View style={styles.card}>
                      <AppText variant="overline">Bölüm puanın</AppText>
                      <View style={styles.rateRow}>
                        <StarRating
                          value={note?.rating ?? 0}
                          size={30}
                          onChange={(v) => {
                            setNote(showKey, season, episodeNo, { rating: v || null });
                          }}
                        />
                        <AppText variant="label">
                          {note?.rating ? note.rating.toFixed(1) : "—"} / 5
                        </AppText>
                      </View>
                    </View>

                    <View style={styles.section}>
                      <AppText variant="headline">Bölüm sana nasıl hissettirdi?</AppText>
                      <AppText variant="caption">En fazla {MAX_FEELINGS} tanesini seç</AppText>
                      <View style={styles.feelings}>
                        {FEELINGS.map((f) => {
                          const on = note?.feelings.includes(f.id) ?? false;
                          return (
                            <Pressable
                              key={f.id}
                              style={[styles.feeling, on && styles.feelingOn]}
                              onPress={() => toggleFeeling(f.id)}
                            >
                              <AppText variant="headline" style={styles.emoji}>
                                {f.emoji}
                              </AppText>
                              <AppText
                                variant="caption"
                                color={on ? colors.primaryLight : colors.textSecondary}
                              >
                                {f.label}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {data.cast.length > 0 && (
                      <View style={styles.section}>
                        <AppText variant="headline">Bu bölümde en çok kimi sevdin?</AppText>
                        <AppText variant="caption">
                          Fotoğrafa dokunarak seç, adına dokunarak oyuncu sayfasını aç
                        </AppText>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.castRow}
                        >
                          {data.cast.map((c) => {
                            const on = note?.favoriteActor?.id === c.id;
                            return (
                              <View key={c.id} style={styles.cast}>
                                <Pressable
                                  onPress={() => {
                                    setNote(showKey, season, episodeNo, {
                                      favoriteActor: on
                                        ? null
                                        : { id: c.id, name: c.name, photoUrl: c.photoUrl },
                                    });
                                  }}
                                >
                                  <View style={[styles.castPhoto, on && styles.castPhotoOn]}>
                                    {c.photoUrl ? (
                                      <Image
                                        source={{ uri: c.photoUrl }}
                                        style={StyleSheet.absoluteFill}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                      />
                                    ) : (
                                      <Ionicons name="person" size={28} color={colors.textTertiary} />
                                    )}
                                    {on && (
                                      <View style={styles.heart}>
                                        <Ionicons name="heart" size={14} color={colors.onPrimary} />
                                      </View>
                                    )}
                                  </View>
                                </Pressable>
                                <Pressable
                                  style={styles.fullWidth}
                                  onPress={() => leave(() => openPerson(c.id))}
                                  hitSlop={4}
                                >
                                  <AppText
                                    variant="label"
                                    numberOfLines={1}
                                    color={on ? colors.primary : colors.text}
                                    style={[styles.center, styles.castName]}
                                  >
                                    {c.name}
                                  </AppText>
                                </Pressable>
                                <AppText
                                  variant="caption"
                                  numberOfLines={1}
                                  style={[styles.center, styles.fullWidth]}
                                >
                                  {c.character}
                                </AppText>
                              </View>
                            );
                          })}
                        </ScrollView>
                      </View>
                    )}

                    <View style={styles.section}>
                      <AppText variant="headline">Yorumlar ({reviews.length})</AppText>
                      {reviews.length === 0 && (
                        <AppText variant="bodySmall">Bu bölüm için henüz yorum yok.</AppText>
                      )}
                      {reviews.map((r) => (
                        <ReviewCard key={r.id} review={r} />
                      ))}
                      <Button
                        variant="secondary"
                        icon="create-outline"
                        label="Bölüm Hakkında Yaz"
                        onPress={() => leave(() => openReview("tv", showId, season, episodeNo))}
                      />
                    </View>
                  </>
                )}

                <View style={styles.pager}>
                  <Button
                    style={styles.flex}
                    variant="secondary"
                    icon="chevron-back"
                    label="Önceki"
                    disabled={!prev}
                    onPress={() => prev && go(prev.number)}
                  />
                  <Button
                    style={styles.flex}
                    variant="secondary"
                    icon="chevron-forward"
                    label="Sonraki"
                    disabled={!next}
                    onPress={() => next && go(next.number)}
                  />
                </View>
              </View>
            </ScrollView>
            </View>
          )}

          {/* TV Time'daki gibi: izlenmemiş bölümün yorumları için spoiler uyarısı */}
          {warnOpen && (
            <View style={styles.dialogRoot}>
              <Pressable style={styles.dialogBackdrop} onPress={() => setWarnOpen(false)} />
              <View style={styles.dialog}>
                <View style={styles.dialogIcon}>
                  <Ionicons name="warning" size={26} color={colors.primary} />
                </View>
                <AppText variant="headline" style={styles.center}>
                  Dikkat, spoiler olabilir!
                </AppText>
                <AppText variant="bodySmall" style={styles.center}>
                  Bu bölümü henüz izlemedin. Yorumlarda bölümün önemli olayları açık edilmiş
                  olabilir.
                </AppText>
                <Button
                  style={styles.fullWidth}
                  icon="checkmark-circle"
                  label="Bölümü izledim"
                  onPress={() => {
                    // Bölümü izlendi yap; izlenen bölümde yorumlar zaten görünür.
                    if (showData) {
                      toggleEpisode(showData, season, episodeNo, data?.runtime ?? showData.runtime);
                    }
                    setWarnOpen(false);
                  }}
                />
                <Button
                  style={styles.fullWidth}
                  variant="secondary"
                  icon="eye-outline"
                  label="Yine de göster"
                  onPress={() => {
                    setSpoilerFor(`${showId}:${ek}`);
                    setWarnOpen(false);
                  }}
                />
                <Pressable onPress={() => setWarnOpen(false)} hitSlop={8}>
                  <AppText variant="caption">Vazgeç</AppText>
                </Pressable>
              </View>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    overflow: "hidden",
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  dragZone: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  close: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 6,
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingBottom: spacing.xxl },
  hero: { height: 190, backgroundColor: colors.surfaceHigh },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, marginTop: -40 },
  section: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  notAired: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  feelings: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  feeling: {
    alignItems: "center",
    gap: 2,
    width: "23%",
    flexGrow: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feelingOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  emoji: { fontSize: 26, lineHeight: 32 },
  castRow: { gap: spacing.md },
  cast: { width: 88, alignItems: "center", gap: 2 },
  fullWidth: { width: "100%" },
  locked: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: spacing.md,
  },
  warn: {
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.35)",
    padding: spacing.md,
  },
  warnTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dialogRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  dialogBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  dialog: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  castPhoto: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 4,
  },
  castPhotoOn: { borderColor: colors.primary },
  heart: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  castName: { textDecorationLine: "underline", textDecorationColor: "rgba(148,163,184,0.4)" },
  pager: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
});
