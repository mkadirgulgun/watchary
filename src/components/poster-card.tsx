import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, radius, spacing } from "@/constants/theme";
import { openMedia } from "@/lib/nav";
import { sized } from "@/lib/tmdb";
import { MediaRef } from "@/lib/types";

type Props = {
  item: MediaRef;
  width?: number;
  subtitle?: string;
  rating?: number | null; // verilmezse TMDB puanı gösterilir
  watched?: boolean;
  favorite?: boolean;
  onPress?: () => void;
};

export function PosterCard({
  item,
  width = 130,
  subtitle,
  rating,
  watched,
  favorite,
  onPress,
}: Props) {
  const shownRating = rating === undefined ? item.rating : rating;
  const sub =
    subtitle ??
    [item.year, item.type === "tv" ? "Dizi" : "Film"].filter(Boolean).join(" • ");

  return (
    <Pressable
      style={[styles.card, { width }]}
      onPress={onPress ?? (() => openMedia(item.type, item.id))}
    >
      <View style={styles.poster}>
        {item.posterUrl ? (
          <Image
            source={{ uri: sized(item.posterUrl, width > 140 ? "w342" : "w185") ?? item.posterUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={100}
            cachePolicy="memory-disk"
            recyclingKey={item.key}
          />
        ) : (
          <View style={styles.noPoster}>
            <AppText variant="caption" style={styles.noPosterText}>
              {item.title}
            </AppText>
          </View>
        )}
        {shownRating !== null && shownRating > 0 && (
          <View style={styles.ratingChip}>
            <Ionicons name="star" size={11} color={colors.primary} />
            <AppText variant="caption" color={colors.text} style={styles.ratingText}>
              {shownRating.toFixed(1)}
            </AppText>
          </View>
        )}
        {item.type === "tv" && (
          <View style={styles.typeChip}>
            <AppText variant="overline" color={colors.text} style={styles.typeText}>
              Dizi
            </AppText>
          </View>
        )}
        {watched && (
          <View style={styles.watched}>
            <Ionicons name="checkmark" size={14} color={colors.primary} />
          </View>
        )}
        {favorite && (
          <View style={styles.fav}>
            <Ionicons name="heart" size={14} color={colors.primary} />
          </View>
        )}
      </View>
      <AppText variant="label" numberOfLines={1}>
        {item.title}
      </AppText>
      <AppText variant="caption" numberOfLines={1}>
        {sub}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 2 },
  poster: {
    aspectRatio: 2 / 3,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: spacing.sm - 2,
    overflow: "hidden",
  },
  noPoster: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  noPosterText: { textAlign: "center" },
  ratingChip: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 11 },
  typeChip: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: { fontSize: 9, letterSpacing: 0.5 },
  watched: {
    position: "absolute",
    bottom: spacing.sm,
    left: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  fav: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
});
