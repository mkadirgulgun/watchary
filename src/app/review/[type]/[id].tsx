import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { StarRating } from "@/components/star-rating";
import { ErrorState, Loading } from "@/components/states";
import { colors, fonts, radius, spacing, noOutline } from "@/constants/theme";
import {
  addDays,
  formatEpisodeCode,
  formatLongDate,
  formatRuntime,
  todayISO,
} from "@/lib/format";
import { openEpisode } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { getDetails, sized } from "@/lib/tmdb";
import { episodeKey, MediaType } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

const MAX = 2000;

export default function ReviewModal() {
  const params = useLocalSearchParams<{
    type: string;
    id: string;
    season?: string;
    episode?: string;
  }>();
  const type: MediaType = params.type === "tv" ? "tv" : "movie";
  const id = Number(params.id);
  const season = params.season ? Number(params.season) : null;
  const episode = params.episode ? Number(params.episode) : null;
  const isEpisode = type === "tv" && season !== null && episode !== null;

  const { data, error, loading, reload } = useAsync(() => getDetails(type, id), [type, id]);

  const existing = useStore((s) => s.entries[`${type}:${id}`]);
  const addReview = useStore((s) => s.addReview);
  const toggleEpisode = useStore((s) => s.toggleEpisode);
  const alreadyWatchedEp = useStore((s) =>
    isEpisode ? !!s.episodes[`${type}:${id}`]?.[episodeKey(season, episode)] : false,
  );

  const showEpisodeCount = useStore(
    (s) => Object.keys(s.episodes[`${type}:${id}`] ?? {}).length,
  );
  // İzlemediğin yapıma puan verip yorum yazamazsın.
  const eligible = isEpisode
    ? alreadyWatchedEp
    : type === "movie"
      ? !!existing?.watched
      : showEpisodeCount > 0 || !!existing?.watched;

  const [rating, setRating] = useState<number>(existing?.rating ?? 0);
  const [liked, setLiked] = useState(existing?.favorite ?? false);
  const [text, setText] = useState("");
  const [spoiler, setSpoiler] = useState(false);
  const [rewatch, setRewatch] = useState(false);
  const [date, setDate] = useState(todayISO());

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
    // Bölüm panelinden gelindiyse, yorum ekranı kapanınca panele geri dön.
    if (isEpisode) {
      setTimeout(() => openEpisode(id, season, episode), 350);
    }
  };

  const publish = () => {
    if (!data) return;
    addReview({
      ref: data,
      rating: rating || null,
      text: text.trim(),
      spoiler,
      liked,
      rewatch,
      watchedOn: date,
      season: isEpisode ? season : null,
      episode: isEpisode ? episode : null,
    });
    if (isEpisode && !alreadyWatchedEp) {
      toggleEpisode(data, season, episode, data.runtime);
    }
    close();
  };

  const canPublish = !!data && eligible && (rating > 0 || text.trim().length > 0 || liked);
  const today = todayISO();

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.top}>
        <Pressable onPress={close} hitSlop={10}>
          <AppText variant="body" color={colors.textSecondary}>
            İptal
          </AppText>
        </Pressable>
        <View style={styles.topCenter}>
          <AppText variant="title">Günlük ve İnceleme</AppText>
          <AppText variant="overline">{isEpisode ? "Bölüm kaydı" : "Günlük kaydı"}</AppText>
        </View>
        <Button label="Yayınla" size="sm" onPress={publish} disabled={!canPublish} />
      </View>

      {loading && !data && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}

      {data && !eligible && (
        <View style={styles.lockedWrap}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed" size={26} color={colors.primary} />
          </View>
          <AppText variant="headline" style={styles.lockedText}>
            Önce izlemen gerekiyor
          </AppText>
          <AppText variant="bodySmall" style={styles.lockedText}>
            {isEpisode
              ? "Bu bölüme yorum yazmak için bölümü “İzledim” olarak işaretle."
              : type === "movie"
                ? "Bu filme yorum yazmak için filmi “İzledim” olarak işaretle."
                : "Bu diziye yorum yazmak için en az bir bölümü izlendi olarak işaretle."}
          </AppText>
          <Button label="Tamam" onPress={close} />
        </View>
      )}

      {data && eligible && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.media}>
            <View style={styles.poster}>
              {data.posterUrl && (
                <Image source={{ uri: sized(data.posterUrl, "w154") ?? data.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="caption" color={colors.primaryLight}>
                {isEpisode ? "BÖLÜM KAYDI" : type === "tv" ? "DİZİ" : "FİLM"} • {data.year}
              </AppText>
              <AppText variant="headline" numberOfLines={2}>
                {data.title}
              </AppText>
              {isEpisode && (
                <AppText variant="bodySmall">{formatEpisodeCode(season, episode)}</AppText>
              )}
              <AppText variant="caption">
                {[formatRuntime(data.runtime), data.genres.slice(0, 2).join(", ")]
                  .filter(Boolean)
                  .join(" • ")}
              </AppText>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <AppText variant="overline">Puanın</AppText>
              <Pressable style={styles.likeBtn} onPress={() => setLiked((v) => !v)}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={18}
                  color={liked ? colors.primary : colors.textSecondary}
                />
                <AppText variant="label" color={liked ? colors.primary : colors.textSecondary}>
                  Beğendim
                </AppText>
              </Pressable>
            </View>
            <View style={styles.cardRow}>
              <StarRating value={rating} size={34} onChange={setRating} />
              <AppText variant="label">{rating ? rating.toFixed(1) : "—"} / 5</AppText>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={[styles.card, styles.flex]}>
              <View style={styles.inline}>
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <AppText variant="overline">İzleme tarihi</AppText>
              </View>
              <View style={styles.dateRow}>
                <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={8}>
                  <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                </Pressable>
                <AppText variant="label" style={styles.dateText}>
                  {date === today ? "Bugün" : formatLongDate(date)}
                </AppText>
                <Pressable
                  onPress={() => date < today && setDate(addDays(date, 1))}
                  hitSlop={8}
                  disabled={date >= today}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={date >= today ? colors.border : colors.textSecondary}
                  />
                </Pressable>
              </View>
            </View>
            <View style={[styles.card, styles.flex]}>
              <View style={styles.inline}>
                <Ionicons name="refresh" size={16} color={colors.primary} />
                <AppText variant="overline">Tekrar mı?</AppText>
              </View>
              <View style={styles.cardRow}>
                <AppText variant="label">{rewatch ? "Tekrar izleme" : "İlk izleme"}</AppText>
                <Switch
                  value={rewatch}
                  onValueChange={setRewatch}
                  trackColor={{ true: colors.primaryDeep, false: colors.border }}
                  thumbColor={rewatch ? colors.primaryLight : colors.textSecondary}
                />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <AppText variant="overline">{isEpisode ? "Bölüm eleştirisi" : "İnceleme"}</AppText>
            <TextInput
              value={text}
              onChangeText={(t) => setText(t.slice(0, MAX))}
              placeholder="Ne düşündün? Düşüncelerini yaz..."
              placeholderTextColor={colors.textTertiary}
              multiline
              style={styles.input}
              textAlignVertical="top"
            />
            <View style={styles.cardRow}>
              <View style={styles.inline}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.textSecondary} />
                <AppText variant="caption">Cihazında saklanır</AppText>
              </View>
              <AppText variant="caption">
                {text.length} / {MAX}
              </AppText>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="label">Spoiler içeriyor</AppText>
                <AppText variant="caption">Metni spoiler korumasıyla gizle</AppText>
              </View>
              <Switch
                value={spoiler}
                onValueChange={setSpoiler}
                trackColor={{ true: colors.primaryDeep, false: colors.border }}
                thumbColor={spoiler ? colors.primaryLight : colors.textSecondary}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topCenter: { alignItems: "center" },
  lockedWrap: { alignItems: "center", gap: spacing.md, padding: spacing.xl, marginTop: spacing.xl },
  lockedIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedText: { textAlign: "center" },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  media: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  poster: {
    width: 64,
    height: 96,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  fill: { width: "100%", height: "100%" },
  card: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  twoCol: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  likeBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  dateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { flex: 1, textAlign: "center" },
  input: {
    minHeight: 130,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    ...noOutline,
  },
});
