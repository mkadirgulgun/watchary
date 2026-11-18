import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { PosterCard } from "@/components/poster-card";
import { ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { formatLongDate, parseISO } from "@/lib/format";
import { openMedia } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { getPerson } from "@/lib/tmdb";
import { PersonCredit, PersonDetails } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

/** TMDB tür kimlikleri: haber, reality, talk show */
const APPEARANCE_GENRES = [10763, 10764, 10767];

function ageOf(birthday: string, deathday: string | null): number {
  const born = parseISO(birthday);
  const end = deathday ? parseISO(deathday) : new Date();
  let age = end.getFullYear() - born.getFullYear();
  const beforeBirthday =
    end.getMonth() < born.getMonth() ||
    (end.getMonth() === born.getMonth() && end.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useAsync(() => getPerson(Number(id)), [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      {loading && !data && <Loading />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <PersonBody person={data} topInset={insets.top} onBack={back} />}
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

function PersonBody({
  person,
  topInset,
  onBack,
}: {
  person: PersonDetails;
  topInset: number;
  onBack: () => void;
}) {
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // "Bilinen yapımlar"dan talk show/haber/reality konukluklarını ayıkla.
  const known = useMemo(
    () =>
      person.credits
        .filter(
          (c) =>
            !/\b(self|himself|herself|guest|archive footage)\b/i.test(c.role) &&
            !c.genreIds.some((g) => APPEARANCE_GENRES.includes(g)),
        )
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 14),
    [person.credits],
  );
  const filmography = useMemo(
    () =>
      [...person.credits].sort((a, b) =>
        (b.releaseDate || "0").localeCompare(a.releaseDate || "0"),
      ),
    [person.credits],
  );
  const directed = useMemo(
    () => [...person.directed].sort((a, b) => b.popularity - a.popularity).slice(0, 14),
    [person.directed],
  );

  const seenCount = useMemo(() => {
    const all = [...person.credits, ...person.directed];
    const seen = new Set(
      all
        .filter((c) => {
          const e = entries[c.key];
          return !!e && (e.watched || Object.keys(episodes[c.key] ?? {}).length > 0);
        })
        .map((c) => c.key),
    );
    return seen.size;
  }, [person.credits, person.directed, entries, episodes]);
  const totalCount = new Set([...person.credits, ...person.directed].map((c) => c.key)).size;

  const shownFilmography = showAll ? filmography : filmography.slice(0, 12);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.top, { paddingTop: topInset + spacing.sm }]}>
        <Pressable onPress={onBack} style={styles.backInline} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.head}>
        <View style={styles.photo}>
          {person.photoUrl ? (
            <Image
              source={{ uri: person.photoUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons name="person" size={48} color={colors.textTertiary} />
          )}
        </View>
        <View style={styles.headInfo}>
          {!!person.department && (
            <View style={styles.badge}>
              <AppText variant="caption" color={colors.primaryLight}>
                {person.department}
              </AppText>
            </View>
          )}
          <AppText variant="display">{person.name}</AppText>
          {!!person.birthday && (
            <AppText variant="caption">
              {formatLongDate(person.birthday)}
              {person.deathday
                ? ` – ${formatLongDate(person.deathday)}`
                : ""}{" "}
              ({ageOf(person.birthday, person.deathday)} yaş{person.deathday ? "ında hayatını kaybetti" : ""})
            </AppText>
          )}
          {!!person.placeOfBirth && (
            <View style={styles.inline}>
              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
              <AppText variant="caption" style={{ flex: 1 }}>
                {person.placeOfBirth}
              </AppText>
            </View>
          )}
        </View>
      </View>

      {totalCount > 0 && (
        <View style={styles.seen}>
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />
          <AppText variant="label" style={{ flex: 1 }}>
            {totalCount} yapımın {seenCount} tanesini izledin
          </AppText>
        </View>
      )}

      {!!person.biography && (
        <View style={styles.section}>
          <AppText variant="headline">Hakkında</AppText>
          <AppText
            variant="body"
            color={colors.textSecondary}
            numberOfLines={expanded ? undefined : 6}
          >
            {person.biography}
          </AppText>
          {person.biography.length > 320 && (
            <Pressable onPress={() => setExpanded((v) => !v)}>
              <AppText variant="label" color={colors.primary}>
                {expanded ? "Daha az göster" : "Devamını oku"}
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {known.length > 0 && (
        <CreditRow title="Bilinen Yapımlar" icon="star-outline" credits={known} />
      )}
      {directed.length > 0 && (
        <CreditRow title="Yönettiği Yapımlar" icon="videocam-outline" credits={directed} />
      )}

      {filmography.length > 0 && (
        <View style={styles.section}>
          <AppText variant="headline">Filmografi</AppText>
          {shownFilmography.map((c) => (
            <Pressable key={c.key} style={styles.row} onPress={() => openMedia(c.type, c.id)}>
              <AppText variant="caption" style={styles.year}>
                {c.year || "—"}
              </AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="title" numberOfLines={1}>
                  {c.title}
                </AppText>
                <AppText variant="caption" numberOfLines={1}>
                  {c.type === "tv" ? "Dizi" : "Film"}
                  {c.role ? ` • ${c.role}` : ""}
                </AppText>
              </View>
              {entries[c.key]?.watched && (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
              )}
            </Pressable>
          ))}
          {filmography.length > 12 && (
            <Button
              variant="secondary"
              size="sm"
              label={showAll ? "Daha az göster" : `Tümünü göster (${filmography.length})`}
              onPress={() => setShowAll((v) => !v)}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function CreditRow({
  title,
  icon,
  credits,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  credits: PersonCredit[];
}) {
  const entries = useStore((s) => s.entries);
  return (
    <View style={styles.rail}>
      <View style={[styles.inline, styles.railHead]}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <AppText variant="headline">{title}</AppText>
      </View>
      <FlatList
        data={credits}
        keyExtractor={(c) => c.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railList}
        initialNumToRender={4}
        windowSize={5}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            width={120}
            subtitle={item.role || item.year}
            watched={entries[item.key]?.watched}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl * 2, gap: spacing.lg },
  top: { paddingHorizontal: spacing.lg },
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
  backInline: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  head: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg },
  photo: {
    width: 130,
    aspectRatio: 2 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headInfo: { flex: 1, gap: spacing.xs + 2, justifyContent: "flex-end" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
  },
  inline: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  seen: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  section: { gap: spacing.md, paddingHorizontal: spacing.lg },
  rail: { gap: spacing.md },
  railHead: { paddingHorizontal: spacing.lg },
  railList: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  year: { width: 38 },
});
