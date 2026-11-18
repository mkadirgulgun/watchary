import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { PosterCard } from "@/components/poster-card";
import { EmptyState } from "@/components/states";
import { colors, fonts, glow, radius, spacing } from "@/constants/theme";
import { formatRuntime } from "@/lib/format";
import { openList, openMedia, openSearch } from "@/lib/nav";
import { Entry, useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";

type Tab = "watchlist" | "watched" | "favorites" | "lists";
type TypeFilter = "all" | "movie" | "tv";
type Sort = "recent" | "rating" | "title";

const SORT_LABEL: Record<Sort, string> = {
  recent: "Yakın zamanlı",
  rating: "Puana göre",
  title: "A-Z",
};
const SORT_NEXT: Record<Sort, Sort> = {
  recent: "rating",
  rating: "title",
  title: "recent",
};

export default function MyListScreen() {
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const lists = useStore((s) => s.lists);
  const createList = useStore((s) => s.createList);

  const [tab, setTab] = useState<Tab>("watchlist");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [grid, setGrid] = useState(true);
  const [newName, setNewName] = useState("");

  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((Math.min(width, 720) - spacing.lg * 2 - spacing.md * 2) / 3);

  const all = useMemo(() => Object.values(entries), [entries]);

  const hasEpisodes = (e: Entry) => Object.keys(episodes[e.ref.key] ?? {}).length > 0;

  const byTab = useMemo(() => {
    const watchlist = all.filter((e) => e.watchlist);
    const watched = all.filter(
      (e) => e.watched || (e.ref.type === "tv" && hasEpisodes(e)),
    );
    const favorites = all.filter((e) => e.favorite);
    return { watchlist, watched, favorites };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, episodes]);

  const base = useMemo(
    () => (tab === "lists" ? [] : byTab[tab]),
    [tab, byTab],
  );
  const visible = useMemo(() => {
    const list = base.filter((e) => typeFilter === "all" || e.ref.type === typeFilter);
    const when = (e: Entry) => e.watchedAt ?? e.addedAt;
    if (sort === "recent") list.sort((a, b) => when(b) - when(a));
    if (sort === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    if (sort === "title") list.sort((a, b) => a.ref.title.localeCompare(b.ref.title, "tr"));
    return list;
  }, [base, typeFilter, sort]);

  const movieCount = base.filter((e) => e.ref.type === "movie").length;
  const showCount = base.filter((e) => e.ref.type === "tv").length;

  const year = new Date().getFullYear();
  const yearStart = new Date(year, 0, 1).getTime();
  const filmsThisYear = all.filter(
    (e) => e.ref.type === "movie" && e.watched && (e.watchedAt ?? 0) >= yearStart,
  ).length;
  const episodesThisYear = Object.values(episodes).reduce(
    (n, m) => n + Object.values(m).filter((t) => t >= yearStart).length,
    0,
  );

  const subtitleOf = (e: Entry): string => {
    if (e.ref.type === "movie") {
      return [e.ref.year, formatRuntime(e.runtime)].filter(Boolean).join(" • ");
    }
    const n = Object.keys(episodes[e.ref.key] ?? {}).length;
    return n > 0 ? `${n} bölüm izlendi` : `${e.ref.year} • Dizi`;
  };

  const header = (
    <View style={styles.header}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="İzleme Listesi" count={byTab.watchlist.length} active={tab === "watchlist"} onPress={() => setTab("watchlist")} />
        <Chip label="İzlenenler" count={byTab.watched.length} active={tab === "watched"} onPress={() => setTab("watched")} />
        <Chip label="Favoriler" count={byTab.favorites.length} active={tab === "favorites"} onPress={() => setTab("favorites")} />
        <Chip label="Listelerim" count={lists.length} active={tab === "lists"} onPress={() => setTab("lists")} />
      </ScrollView>

      {tab !== "lists" && (
        <View style={styles.toolbar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flex: 1 }}>
            <Chip label="Hepsi" count={base.length} active={typeFilter === "all"} onPress={() => setTypeFilter("all")} />
            <Chip label="Filmler" count={movieCount} active={typeFilter === "movie"} onPress={() => setTypeFilter("movie")} />
            <Chip label="Diziler" count={showCount} active={typeFilter === "tv"} onPress={() => setTypeFilter("tv")} />
          </ScrollView>
        </View>
      )}
      {tab !== "lists" && (
        <View style={styles.sortRow}>
          <Pressable style={styles.sortBtn} onPress={() => setSort(SORT_NEXT[sort])}>
            <Ionicons name="swap-vertical" size={14} color={colors.textSecondary} />
            <AppText variant="caption">{SORT_LABEL[sort]}</AppText>
          </Pressable>
          <View style={styles.viewToggle}>
            <Pressable onPress={() => setGrid(true)} style={[styles.toggleBtn, grid && styles.toggleOn]}>
              <Ionicons name="grid" size={16} color={grid ? colors.primary : colors.textSecondary} />
            </Pressable>
            <Pressable onPress={() => setGrid(false)} style={[styles.toggleBtn, !grid && styles.toggleOn]}>
              <Ionicons name="list" size={18} color={!grid ? colors.primary : colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <View style={styles.logCard}>
        <View style={styles.logIcon}>
          <Ionicons name="film-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title">{year} Sinema Günlüğü</AppText>
          <AppText variant="caption">
            {filmsThisYear} film • {episodesThisYear} dizi bölümü
          </AppText>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <AppHeader />

      {tab === "lists" ? (
        <ScrollView contentContainerStyle={styles.listsContent}>
          {header}
          <View style={styles.newList}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Yeni liste adı"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              onSubmitEditing={() => {
                if (!newName.trim()) return;
                openList(createList(newName.trim(), ""));
                setNewName("");
              }}
            />
            <Button
              label="Oluştur"
              size="sm"
              disabled={!newName.trim()}
              onPress={() => {
                openList(createList(newName.trim(), ""));
                setNewName("");
              }}
            />
          </View>
          {lists.length === 0 && (
            <EmptyState
              icon="albums-outline"
              title="Henüz listen yok"
              message="Film ve dizileri kendi koleksiyonlarında topla."
            />
          )}
          {lists.map((l) => (
            <Pressable key={l.id} style={styles.listCard} onPress={() => openList(l.id)}>
              <View style={styles.collage}>
                {l.items.slice(0, 3).map((m) => (
                  <View key={m.key} style={styles.collageItem}>
                    {m.posterUrl && (
                      <Image source={{ uri: sized(m.posterUrl, "w154") ?? m.posterUrl }} style={styles.fill} contentFit="cover" />
                    )}
                  </View>
                ))}
                {l.items.length === 0 && (
                  <Ionicons name="albums-outline" size={28} color={colors.textTertiary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title">{l.name}</AppText>
                <AppText variant="caption">{l.items.length} başlık</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <FlatList
          key={grid ? "grid" : "list"}
          data={visible}
          numColumns={grid ? 3 : 1}
          keyExtractor={(e) => e.ref.key}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={
            <EmptyState
              icon="bookmark-outline"
              title="Burada henüz bir şey yok"
              message="Keşfet'ten bir film ya da dizi ekleyerek başla."
              actionLabel="Ara"
              onAction={openSearch}
            />
          }
          contentContainerStyle={styles.content}
          columnWrapperStyle={grid ? styles.column : undefined}
          renderItem={({ item: e }) =>
            grid ? (
              <PosterCard
                item={e.ref}
                width={cardWidth}
                rating={e.rating}
                watched={e.watched || hasEpisodes(e)}
                favorite={e.favorite}
                subtitle={subtitleOf(e)}
              />
            ) : (
              <Pressable style={styles.row} onPress={() => openMedia(e.ref.type, e.ref.id)}>
                <View style={styles.rowPoster}>
                  {e.ref.posterUrl && (
                    <Image source={{ uri: sized(e.ref.posterUrl, "w154") ?? e.ref.posterUrl }} style={styles.fill} contentFit="cover" />
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="title" numberOfLines={1}>
                    {e.ref.title}
                  </AppText>
                  <AppText variant="caption">{subtitleOf(e)}</AppText>
                </View>
                {e.rating ? (
                  <View style={styles.rowRating}>
                    <Ionicons name="star" size={12} color={colors.primary} />
                    <AppText variant="label">{e.rating.toFixed(1)}</AppText>
                  </View>
                ) : null}
                {e.favorite && <Ionicons name="heart" size={16} color={colors.primary} />}
              </Pressable>
            )
          }
        />
      )}

      <Pressable style={styles.fab} onPress={openSearch}>
        <Ionicons name="add" size={22} color={colors.onPrimary} />
        <AppText variant="label" color={colors.onPrimary}>
          Listeye Ekle
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { gap: spacing.md, marginBottom: spacing.md },
  chips: { gap: spacing.sm },
  toolbar: { flexDirection: "row", alignItems: "center" },
  sortRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sortBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  toggleBtn: { padding: spacing.sm - 2, borderRadius: radius.sm },
  toggleOn: { backgroundColor: colors.surfaceHigh },
  content: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: 140, gap: spacing.md },
  column: { gap: spacing.md },
  fill: { width: "100%", height: "100%" },
  footer: { marginTop: spacing.lg },
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  logIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
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
  rowPoster: {
    width: 44,
    height: 66,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  rowRating: { flexDirection: "row", alignItems: "center", gap: 3 },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    height: 50,
    ...glow,
  },
  listsContent: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: 140 },
  newList: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
  },
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  collage: {
    width: 96,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  collageItem: {
    width: 42,
    height: 63,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    marginRight: -14,
    borderWidth: 1,
    borderColor: colors.surface,
  },
});
