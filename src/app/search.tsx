import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Href, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { PersonRow } from "@/components/person-row";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { colors, fonts, radius, spacing, noOutline } from "@/constants/theme";
import { openMedia } from "@/lib/nav";
import { searchUsers } from "@/lib/social";
import { useStore } from "@/lib/store";
import { GENRES, getTrending, searchMulti, sized } from "@/lib/tmdb";
import { MediaRef, MediaType } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

type TypeFilter = "all" | MediaType;
type Sort = "relevance" | "rating" | "year";

const YEAR_PRESETS: { label: string; from: number; to: number }[] = [
  { label: "Tüm yıllar", from: 0, to: 9999 },
  { label: "2020+", from: 2020, to: 9999 },
  { label: "2010-2019", from: 2010, to: 2019 },
  { label: "2000-2009", from: 2000, to: 2009 },
  { label: "Klasikler", from: 0, to: 1999 },
];
const SCORES = [0, 3, 3.5, 4, 4.5];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [type, setType] = useState<TypeFilter>("all");
  const [yearIdx, setYearIdx] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<Sort>("relevance");

  const recent = useStore((s) => s.recentSearches);
  const addRecent = useStore((s) => s.addRecentSearch);
  const clearRecent = useStore((s) => s.clearRecentSearches);

  // Yazmayı bırakınca 350 ms sonra ara.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(t);
  }, [text]);

  const results = useAsync(() => searchMulti(query), [query]);
  const users = useAsync(() => searchUsers(query), [query]);
  const trending = useAsync(() => getTrending("all"), []);

  const activeFilters =
    (type !== "all" ? 1 : 0) + (yearIdx !== 0 ? 1 : 0) + (minScore !== 0 ? 1 : 0);

  const filtered = useMemo(() => {
    const list = (results.data ?? []).filter((m) => {
      if (type !== "all" && m.type !== type) return false;
      const y = Number(m.year) || 0;
      const range = YEAR_PRESETS[yearIdx];
      if (y < range.from || y > range.to) return false;
      if (m.rating < minScore) return false;
      return true;
    });
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sort === "year") list.sort((a, b) => Number(b.year) - Number(a.year));
    return list;
  }, [results.data, type, yearIdx, minScore, sort]);

  const reset = () => {
    setType("all");
    setYearIdx(0);
    setMinScore(0);
    setSort("relevance");
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={back} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Film, dizi ya da kişi ara..."
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => addRecent(text)}
          />
          {!!text && (
            <Pressable onPress={() => setText("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={() => setShowFilters((v) => !v)} hitSlop={10}>
          <Ionicons
            name="options"
            size={22}
            color={showFilters || activeFilters ? colors.primary : colors.textSecondary}
          />
          {activeFilters > 0 && (
            <View style={styles.filterBadge}>
              <AppText variant="overline" color={colors.onPrimary} style={styles.filterBadgeText}>
                {activeFilters}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        {showFilters && (
          <View style={styles.panel}>
            <View style={styles.panelTop}>
              <AppText variant="title">Hassas Ayar</AppText>
              <Pressable onPress={reset}>
                <AppText variant="label" color={colors.primary}>
                  Sıfırla
                </AppText>
              </Pressable>
            </View>

            <AppText variant="overline">Tür</AppText>
            <View style={styles.wrap}>
              <Chip label="Tümü" active={type === "all"} onPress={() => setType("all")} />
              <Chip label="Filmler" active={type === "movie"} onPress={() => setType("movie")} />
              <Chip label="Diziler" active={type === "tv"} onPress={() => setType("tv")} />
            </View>

            <AppText variant="overline">Yayın yılı</AppText>
            <View style={styles.wrap}>
              {YEAR_PRESETS.map((p, i) => (
                <Chip key={p.label} label={p.label} active={yearIdx === i} onPress={() => setYearIdx(i)} />
              ))}
            </View>

            <AppText variant="overline">En düşük puan</AppText>
            <View style={styles.wrap}>
              {SCORES.map((s) => (
                <Chip
                  key={s}
                  label={s === 0 ? "Hepsi" : `${s.toFixed(1)} ★`}
                  active={minScore === s}
                  onPress={() => setMinScore(s)}
                />
              ))}
            </View>

            <AppText variant="overline">Sırala</AppText>
            <View style={styles.wrap}>
              <Chip label="Alaka" active={sort === "relevance"} onPress={() => setSort("relevance")} />
              <Chip label="Puan" active={sort === "rating"} onPress={() => setSort("rating")} />
              <Chip label="Yıl" active={sort === "year"} onPress={() => setSort("year")} />
            </View>
          </View>
        )}

        {!query && (
          <>
            {recent.length > 0 && (
              <View style={styles.block}>
                <View style={styles.panelTop}>
                  <AppText variant="title">Son Aramalar</AppText>
                  <Pressable onPress={clearRecent}>
                    <AppText variant="caption">Temizle</AppText>
                  </Pressable>
                </View>
                <View style={styles.wrap}>
                  {recent.map((r) => (
                    <Chip key={r} label={r} onPress={() => setText(r)} />
                  ))}
                </View>
              </View>
            )}
            {trending.data && (
              <View style={styles.block}>
                <AppText variant="title">Şu An Trend</AppText>
                <View style={styles.wrap}>
                  {trending.data.slice(0, 8).map((m) => (
                    <Chip key={m.key} label={m.title} onPress={() => openMedia(m.type, m.id)} />
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {!!query && (users.data?.length ?? 0) > 0 && (
          <View style={styles.block}>
            <AppText variant="title">Kişiler</AppText>
            {users.data?.map((u) => (
              <PersonRow key={u.id} person={u} onPress={() => router.push(`/user/${u.handle}` as Href)} />
            ))}
          </View>
        )}

        {!!query && results.loading && <Loading />}
        {!!query && results.error && (
          <ErrorState message={results.error} onRetry={results.reload} />
        )}

        {!!query && !results.loading && !results.error && (
          <>
            <AppText variant="caption" style={styles.count}>
              {filtered.length} sonuç
            </AppText>
            {filtered.map((m) => (
              <ResultRow key={m.key} item={m} onOpen={() => addRecent(query)} />
            ))}
            {filtered.length === 0 && (
              <EmptyState
                icon="search-outline"
                title="Aradığını bulamadın mı?"
                message="Yıl aralığını genişletmeyi ya da filtreleri sıfırlamayı dene."
                actionLabel={activeFilters ? "Filtreleri sıfırla" : undefined}
                onAction={activeFilters ? reset : undefined}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ResultRow({ item, onOpen }: { item: MediaRef; onOpen: () => void }) {
  const entry = useStore((s) => s.entries[item.key]);
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const toggleWatched = useStore((s) => s.toggleWatched);
  const genres = item.genreIds.map((id) => GENRES[id]).filter(Boolean).slice(0, 2);

  return (
    <Pressable
      style={styles.row}
      onPress={() => {
        onOpen();
        openMedia(item.type, item.id);
      }}
    >
      <View style={styles.poster}>
        {item.posterUrl && (
          <Image source={{ uri: sized(item.posterUrl, "w154") ?? item.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        )}
        <View style={styles.rate}>
          <Ionicons name="star" size={10} color={colors.primary} />
          <AppText variant="caption" color={colors.text} style={styles.rateText}>
            {item.rating.toFixed(1)}
          </AppText>
        </View>
      </View>
      <View style={styles.info}>
        <AppText variant="title" numberOfLines={2}>
          {item.title}
        </AppText>
        <AppText variant="caption">
          {[item.year, item.type === "tv" ? "Dizi" : "Film"].filter(Boolean).join(" • ")}
        </AppText>
        <View style={styles.tags}>
          {genres.map((g) => (
            <View key={g} style={styles.tag}>
              <AppText variant="caption">{g}</AppText>
            </View>
          ))}
        </View>
        <View style={styles.rowActions}>
          {item.type === "movie" ? (
            <Button
              size="sm"
              variant={entry?.watched ? "secondary" : "primary"}
              icon={entry?.watched ? "checkmark" : "add"}
              label={entry?.watched ? "İzlendi" : "Günlüğe Ekle"}
              onPress={() => toggleWatched(item)}
            />
          ) : (
            <Button
              size="sm"
              variant={entry?.watchlist ? "secondary" : "primary"}
              icon={entry?.watchlist ? "checkmark" : "add"}
              label={entry?.watchlist ? "Takipte" : "Takip Et"}
              onPress={() => toggleWatchlist(item)}
            />
          )}
        </View>
      </View>
      {item.type === "movie" && (
        <Pressable onPress={() => toggleWatchlist(item)} hitSlop={10}>
          <Ionicons
            name={entry?.watchlist ? "bookmark" : "bookmark-outline"}
            size={22}
            color={entry?.watchlist ? colors.primary : colors.textSecondary}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    ...noOutline,
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: { fontSize: 9, lineHeight: 12 },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.xs },
  block: { gap: spacing.sm },
  count: { marginTop: spacing.xs },
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
  rate: {
    position: "absolute",
    top: 4,
    left: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.glass,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rateText: { fontSize: 10 },
  info: { flex: 1, gap: 4 },
  tags: { flexDirection: "row", gap: spacing.xs + 2, flexWrap: "wrap" },
  tag: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rowActions: { flexDirection: "row", marginTop: "auto" },
});
