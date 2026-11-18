import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { ProgressBar } from "@/components/progress-bar";
import { EmptyState } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { openMedia, openSearch } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";

type Sort = "order" | "rating" | "year";

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const list = useStore((s) => s.lists.find((l) => l.id === id));
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const removeFromList = useStore((s) => s.removeFromList);
  const deleteList = useStore((s) => s.deleteList);
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const [sort, setSort] = useState<Sort>("order");

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const isWatched = (key: string) => {
    const e = entries[key];
    return !!e && (e.watched || Object.keys(episodes[key] ?? {}).length > 0);
  };

  const items = useMemo(() => {
    const arr = [...(list?.items ?? [])];
    if (sort === "rating") arr.sort((a, b) => b.rating - a.rating);
    if (sort === "year") arr.sort((a, b) => Number(b.year) - Number(a.year));
    return arr;
  }, [list, sort]);

  if (!list) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <Pressable onPress={back} style={styles.backRow}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <EmptyState icon="albums-outline" title="Liste bulunamadı" />
      </View>
    );
  }

  const watchedCount = list.items.filter((i) => isWatched(i.key)).length;
  const pct = list.items.length ? watchedCount / list.items.length : 0;

  const remove = () => {
    const run = () => {
      deleteList(list.id);
      back();
    };
    if (Platform.OS === "web") {
      if (window.confirm("Liste silinsin mi?")) run();
    } else {
      Alert.alert("Liste silinsin mi?", list.name, [
        { text: "Vazgeç", style: "cancel" },
        { text: "Sil", style: "destructive", onPress: run },
      ]);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.nav}>
          <Pressable onPress={back} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <AppText variant="title">Liste</AppText>
          <Pressable onPress={remove} hitSlop={10}>
            <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <AppText variant="overline" color={colors.primary}>
            Özel Koleksiyon
          </AppText>
          <AppText variant="display">{list.name}</AppText>
          {!!list.description && <AppText variant="body" color={colors.textSecondary}>{list.description}</AppText>}
          <View style={styles.inline}>
            <Ionicons name="film-outline" size={15} color={colors.textSecondary} />
            <AppText variant="caption">{list.items.length} başlık</AppText>
          </View>
        </View>

        <View style={styles.progress}>
          <View style={styles.progressTop}>
            <View style={styles.inline}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
              <AppText variant="title">İlerlemen</AppText>
            </View>
            <AppText variant="label" color={colors.primary}>
              {watchedCount} / {list.items.length} ({Math.round(pct * 100)}%)
            </AppText>
          </View>
          <ProgressBar progress={pct} />
          <AppText variant="caption">{list.items.length - watchedCount} başlık keşfedilmeyi bekliyor</AppText>
        </View>

        <Button icon="add" label="Başlık Ekle" onPress={openSearch} variant="secondary" />

        <View style={styles.sortRow}>
          <AppText variant="headline">Sıralama</AppText>
          <View style={styles.inline}>
            <Chip label="Ekleme" active={sort === "order"} onPress={() => setSort("order")} />
            <Chip label="Puan" active={sort === "rating"} onPress={() => setSort("rating")} />
            <Chip label="Yıl" active={sort === "year"} onPress={() => setSort("year")} />
          </View>
        </View>

        {items.length === 0 && (
          <EmptyState
            icon="albums-outline"
            title="Liste boş"
            message="Detay ekranındaki + düğmesiyle bu listeye başlık ekleyebilirsin."
          />
        )}

        {items.map((m, i) => {
          const watched = isWatched(m.key);
          return (
            <Pressable key={m.key} style={styles.row} onPress={() => openMedia(m.type, m.id)}>
              <View style={styles.poster}>
                {m.posterUrl && <Image source={{ uri: sized(m.posterUrl, "w154") ?? m.posterUrl }} style={styles.fill} contentFit="cover" />}
                {sort === "order" && (
                  <View style={styles.rank}>
                    <AppText variant="caption" color={colors.text}>
                      #{i + 1}
                    </AppText>
                  </View>
                )}
              </View>
              <View style={styles.info}>
                <View style={styles.rowTop}>
                  <AppText variant="title" numberOfLines={2} style={{ flex: 1 }}>
                    {m.title}
                  </AppText>
                  <AppText variant="caption">{m.year}</AppText>
                </View>
                <View style={styles.inline}>
                  <Ionicons name="star" size={12} color={colors.primary} />
                  <AppText variant="label">{m.rating.toFixed(1)}</AppText>
                  <AppText variant="caption">• {m.type === "tv" ? "Dizi" : "Film"}</AppText>
                </View>
                <View style={styles.rowBottom}>
                  {watched ? (
                    <View style={styles.inline}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      <AppText variant="label" color={colors.primary}>
                        İzlendi
                      </AppText>
                    </View>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={entries[m.key]?.watchlist ? "bookmark" : "bookmark-outline"}
                      label={entries[m.key]?.watchlist ? "Listemde" : "İzleme Listesine Ekle"}
                      onPress={() => toggleWatchlist(m)}
                    />
                  )}
                  <Pressable onPress={() => removeFromList(list.id, m.key)} hitSlop={10}>
                    <Ionicons name="close-circle-outline" size={20} color={colors.textTertiary} />
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  backRow: { padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2, flexWrap: "wrap" },
  progress: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  progressTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortRow: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  poster: {
    width: 84,
    height: 126,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  fill: { width: "100%", height: "100%" },
  rank: {
    position: "absolute",
    top: 4,
    left: 4,
    backgroundColor: colors.glass,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  info: { flex: 1, gap: spacing.xs + 2 },
  rowTop: { flexDirection: "row", gap: spacing.sm },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: "auto" },
});
