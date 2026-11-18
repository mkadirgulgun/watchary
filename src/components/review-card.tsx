import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { StarRating } from "@/components/star-rating";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { formatEpisodeCode, formatShortDate } from "@/lib/format";
import { Review, useStore } from "@/lib/store";

type Props = {
  review: Review;
  hideSpoilers?: boolean;
  /** Profil sayfasında yazar zaten belli olduğu için gizlenebilir */
  showAuthor?: boolean;
};

/** Hazır bulanık metin satırı görselleri: satır sayısı (1-4) ve son satırın uzunluğu (s/m/l). */
const BLURRED = {
  "1s": require("../../assets/images/spoiler/spoiler-1s.png"),
  "1m": require("../../assets/images/spoiler/spoiler-1m.png"),
  "1l": require("../../assets/images/spoiler/spoiler-1l.png"),
  "2s": require("../../assets/images/spoiler/spoiler-2s.png"),
  "2m": require("../../assets/images/spoiler/spoiler-2m.png"),
  "2l": require("../../assets/images/spoiler/spoiler-2l.png"),
  "3s": require("../../assets/images/spoiler/spoiler-3s.png"),
  "3m": require("../../assets/images/spoiler/spoiler-3m.png"),
  "3l": require("../../assets/images/spoiler/spoiler-3l.png"),
  "4s": require("../../assets/images/spoiler/spoiler-4s.png"),
  "4m": require("../../assets/images/spoiler/spoiler-4m.png"),
  "4l": require("../../assets/images/spoiler/spoiler-4l.png"),
} as const;

const CHARS_PER_LINE = 36;

/**
 * Spoiler metninin yerine, metnin boyuna uygun hazır bir bulanık görsel gösterir. Bulanıklık
 * görselin içine işlenmiştir; çalışma anında efekt gerekmez, her cihazda aynı görünür.
 * Gerçek yazı hiç ekrana verilmez.
 */
function BlurredText({ text }: { text: string }) {
  const len = Math.max(text.trim().length, 1);
  const lines = Math.min(4, Math.ceil(len / CHARS_PER_LINE));
  const rest = lines < 4 ? len - (lines - 1) * CHARS_PER_LINE : CHARS_PER_LINE;
  const ratio = rest / CHARS_PER_LINE;
  const tail = ratio < 0.5 ? "s" : ratio < 0.8 ? "m" : "l";
  return (
    <Image
      source={BLURRED[`${lines}${tail}` as keyof typeof BLURRED]}
      style={{ width: "100%", height: lines * 22 + 14 }}
      contentFit="fill"
    />
  );
}

export function ReviewCard({ review, hideSpoilers = true, showAuthor = true }: Props) {
  const profile = useStore((s) => s.profile);
  const deleteReview = useStore((s) => s.deleteReview);
  const me = useAuth((s) => s.session?.user.id);
  const [revealed, setRevealed] = useState(false);

  const mine = !review.userId || review.userId === me;
  const name = mine ? profile.name : (review.authorName ?? "Kullanıcı");
  const handle = mine ? profile.handle : review.authorHandle;
  const avatar = mine ? profile.avatarUri : (review.authorAvatar ?? null);

  const masked = review.spoiler && hideSpoilers && !revealed;
  const episodeLabel =
    review.season !== null && review.episode !== null
      ? formatEpisodeCode(review.season, review.episode)
      : null;
  const shown = review.text.trim() || "Bu yorum spoiler içeriyor.";

  const openAuthor = () => {
    if (handle) router.push(`/user/${handle}` as Href);
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Pressable
          style={styles.author}
          onPress={openAuthor}
          disabled={!showAuthor || !handle}
        >
          {showAuthor && <Avatar name={name} uri={avatar} size={34} />}
          <View style={styles.who}>
            {showAuthor && <AppText variant="title">{name}</AppText>}
            <AppText variant="caption">
              {episodeLabel ? `${episodeLabel} • ` : ""}
              {formatShortDate(review.watchedOn)}
              {review.rewatch ? " • Tekrar izledi" : ""}
            </AppText>
          </View>
        </Pressable>
        {review.rating ? <StarRating value={review.rating} size={13} /> : null}
      </View>

      {masked ? (
        <Pressable style={styles.mask} onPress={() => setRevealed(true)}>
          <BlurredText text={shown} />
          <View style={styles.maskLabel}>
            <Ionicons name="eye-off-outline" size={18} color={colors.primary} />
            <AppText variant="label" color={colors.primary}>
              Spoiler içeriyor
            </AppText>
            <AppText variant="caption">Görmek için dokun</AppText>
          </View>
        </Pressable>
      ) : (
        !!review.text && <AppText variant="body">{review.text}</AppText>
      )}

      <View style={styles.bottom}>
        {review.liked && <Ionicons name="heart" size={14} color={colors.primary} />}
        <View style={{ flex: 1 }} />
        {mine && (
          <Pressable onPress={() => deleteReview(review.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  author: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  who: { flex: 1 },
  mask: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    padding: spacing.md,
    minHeight: 84,
    justifyContent: "center",
  },
  maskLabel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  bottom: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
