import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { PosterCard } from "@/components/poster-card";
import { colors, radius, spacing } from "@/constants/theme";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { MediaRef } from "@/lib/types";

type Props = {
  title: string;
  /** undefined/null iken iskelet kartlar gösterilir */
  items: MediaRef[] | null | undefined;
  icon?: keyof typeof Ionicons.glyphMap;
};

const SKELETONS = [0, 1, 2, 3, 4];

export function MediaRow({ title, items, icon }: Props) {
  const entries = useStore((s) => s.entries);

  // Görünmeden önce ilk afişleri indirip önbelleğe al: kaydırınca anında gelsin.
  useEffect(() => {
    if (!items) return;
    const urls = items
      .slice(0, 10)
      .map((i) => sized(i.posterUrl, "w185"))
      .filter((u): u is string => !!u);
    if (urls.length) Image.prefetch(urls, "memory-disk");
  }, [items]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {icon && <Ionicons name={icon} size={18} color={colors.primary} />}
        <AppText variant="headline">{title}</AppText>
      </View>
      {items ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <PosterCard
              item={item}
              watched={entries[item.key]?.watched}
              favorite={entries[item.key]?.favorite}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
        />
      ) : (
        <View style={styles.list}>
          {SKELETONS.map((i) => (
            <View key={i} style={styles.skeleton}>
              <View style={styles.skeletonPoster} />
              <View style={styles.skeletonLine} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, flexDirection: "row" },
  skeleton: { width: 130, gap: spacing.sm },
  skeletonPoster: {
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skeletonLine: {
    height: 10,
    width: "70%",
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
});
