import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Href, router, useFocusEffect } from "expo-router";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { Chip } from "@/components/chip";
import { SpoilerMask } from "@/components/review-card";
import { StarRating } from "@/components/star-rating";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-store";
import { formatCount, formatEpisodeCode, timeAgo } from "@/lib/format";
import { openMedia, openPost, openSearch } from "@/lib/nav";
import {
  FeedActivity,
  FeedItem,
  FeedReview,
  FeedScope,
  fetchFeed,
  setReviewLike,
  useSocial,
} from "@/lib/social";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { MediaRef } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

const openUser = (handle: string) => handle && router.push(`/user/${handle}` as Href);

const ACTIVITY_LABEL: Record<FeedActivity["kind"], string> = {
  watched: "izledi",
  episode: "bölüm izledi",
  rated: "puan verdi",
};

export default function ActivityScreen() {
  const [picked, setPicked] = useState<FeedScope | null>(null);
  const followingIds = useSocial((s) => s.following);
  const followingKey = Object.keys(followingIds).sort().join(",");
  const followingCount = followingKey ? followingKey.split(",").length : 0;

  // Kimseyi takip etmiyorsan, boş bir akış yerine herkesin paylaşımları açılır.
  const scope: FeedScope = picked ?? (followingCount > 0 ? "following" : "all");

  const feed = useAsync(() => fetchFeed(scope), [scope, followingKey]);
  const [refreshing, setRefreshing] = useState(false);

  // Sekmeye dönünce akışı tazele
  const reload = feed.reload;
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const items = useMemo(() => feed.data ?? [], [feed.data]);

  // "Şu an izleyenler": takip ettiklerinin en son aktiviteleri (kişi başına bir tane)
  const live = useMemo(() => {
    if (scope !== "following") return [];
    const seen = new Set<string>();
    const out: FeedActivity[] = [];
    for (const it of items) {
      if (it.type !== "activity" || seen.has(it.author.userId)) continue;
      seen.add(it.author.userId);
      out.push(it);
    }
    return out.slice(0, 12);
  }, [items, scope]);

  const onRefresh = () => {
    setRefreshing(true);
    reload();
    setTimeout(() => setRefreshing(false), 700);
  };

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.titleRow}>
          <AppText variant="display">Akış</AppText>
          <Pressable style={styles.findBtn} onPress={openSearch} accessibilityLabel="Kişi bul">
            <Ionicons name="person-add-outline" size={18} color={colors.primary} />
            <AppText variant="label" color={colors.primary}>
              Kişi bul
            </AppText>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Takip ettiklerim" active={scope === "following"} onPress={() => setPicked("following")} />
          <Chip label="Herkes" active={scope === "all"} onPress={() => setPicked("all")} />
          <Chip label="Benimkiler" active={scope === "mine"} onPress={() => setPicked("mine")} />
        </ScrollView>

        {live.length > 0 && (
          <View style={styles.live}>
            <AppText variant="overline">Son zamanlarda izleyenler</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
              {live.map((a) => (
                <Pressable key={a.id} style={styles.story} onPress={() => openMedia(a.ref.type, a.ref.id)}>
                  <View style={styles.ring}>
                    <View style={styles.storyAvatar}>
                      {a.ref.posterUrl ? (
                        <Image
                          source={{ uri: sized(a.ref.posterUrl, "w154") ?? a.ref.posterUrl }}
                          style={styles.fill}
                          contentFit="cover"
                        />
                      ) : (
                        <AppText variant="label">{a.author.name.slice(0, 1)}</AppText>
                      )}
                    </View>
                  </View>
                  <AppText variant="caption" numberOfLines={1}>
                    {a.author.name}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {feed.loading && !feed.data && <Loading />}
        {feed.error && <ErrorState message={feed.error} onRetry={feed.reload} />}

        {!feed.loading && !feed.error && items.length === 0 && (
          <EmptyState
            icon={scope === "mine" ? "create-outline" : "people-outline"}
            title={
              scope === "following"
                ? followingCount === 0
                  ? "Henüz kimseyi takip etmiyorsun"
                  : "Takip ettiklerin henüz bir şey paylaşmadı"
                : scope === "mine"
                  ? "Henüz paylaşımın yok"
                  : "Henüz paylaşım yok"
            }
            message={
              scope === "following" && followingCount === 0
                ? "Arkadaşlarını bul ve takip et, izledikleri ve yazdıkları burada görünsün."
                : scope === "mine"
                  ? "Bir film ya da diziye inceleme yazdığında burada görünür."
                  : "Bir film ya da diziye inceleme yazan ilk kişi sen olabilirsin."
            }
            actionLabel={scope === "following" ? "Kişi bul" : "Bir şey bul"}
            onAction={openSearch}
          />
        )}

        {items.map((it: FeedItem) =>
          it.type === "review" ? (
            <ReviewPost key={`${it.id}:${it.likes}:${it.liked}:${it.comments}`} item={it} />
          ) : (
            <ActivityPost key={it.id} item={it} />
          ),
        )}
      </ScrollView>
    </View>
  );
}

function ReviewPost({ item }: { item: FeedReview }) {
  const r = item.review;
  const me = useAuth((s) => s.session?.user.id);
  const profile = useStore((s) => s.profile);
  const mine = r.userId === me;
  const name = mine ? profile.name : (r.authorName ?? "Kullanıcı");
  const handle = mine ? profile.handle : (r.authorHandle ?? "");
  const avatar = mine ? profile.avatarUri : (r.authorAvatar ?? null);

  const [liked, setLiked] = useState(item.liked);
  const [count, setCount] = useState(item.likes);
  const [revealed, setRevealed] = useState(false);
  const isEp = r.season !== null && r.episode !== null;

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    const err = await setReviewLike(r.id, next);
    if (err) {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  };

  return (
    <Shell
      name={name}
      avatar={avatar}
      label={isEp ? "bölüm günlüğü yazdı" : "inceleme yazdı"}
      time={timeAgo(item.at)}
      onAuthor={() => openUser(handle)}
      onPress={() => openPost(item.id)}
    >
      <MediaHeader
        ref_={r.ref}
        rating={r.rating ?? undefined}
        sub={isEp ? formatEpisodeCode(r.season as number, r.episode as number) : undefined}
      />
      {r.spoiler && !revealed ? (
        <SpoilerMask text={r.text} onReveal={() => setRevealed(true)} />
      ) : (
        !!r.text && (
          <AppText variant="body" numberOfLines={6}>
            {r.text}
          </AppText>
        )
      )}
      <View style={styles.actions}>
        <Pressable style={styles.act} onPress={toggleLike} hitSlop={8}>
          <Ionicons
            name={liked ? "heart" : "heart-outline"}
            size={20}
            color={liked ? colors.primary : colors.textSecondary}
          />
          <AppText variant="caption">{formatCount(count)}</AppText>
        </Pressable>
        <Pressable style={styles.act} onPress={() => openPost(item.id)} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
          <AppText variant="caption">{item.comments}</AppText>
        </Pressable>
      </View>
    </Shell>
  );
}

function ActivityPost({ item }: { item: FeedActivity }) {
  const a = item.author;
  return (
    <Shell
      name={a.name}
      avatar={a.avatar}
      label={ACTIVITY_LABEL[item.kind]}
      time={timeAgo(item.at)}
      onAuthor={() => openUser(a.handle)}
      onPress={() => openMedia(item.ref.type, item.ref.id)}
    >
      <MediaHeader
        ref_={item.ref}
        rating={item.kind === "rated" ? (item.rating ?? undefined) : undefined}
        sub={item.kind === "episode" ? (item.detail ?? undefined) : undefined}
      />
    </Shell>
  );
}

function Shell({
  name,
  avatar,
  label,
  time,
  onAuthor,
  onPress,
  children,
}: {
  name: string;
  avatar: string | null;
  label: string;
  time: string;
  onAuthor: () => void;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable style={styles.post} onPress={onPress} accessibilityRole="button">
      <Pressable style={styles.postTop} onPress={onAuthor}>
        <Avatar name={name} uri={avatar} size={38} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">
            {name} <AppText variant="caption">{label}</AppText>
          </AppText>
          <AppText variant="caption">{time}</AppText>
        </View>
      </Pressable>
      {children}
    </Pressable>
  );
}

function MediaHeader({ ref_, rating, sub }: { ref_: MediaRef; rating?: number; sub?: string }) {
  return (
    <Pressable style={styles.media} onPress={() => openMedia(ref_.type, ref_.id)}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="headline" numberOfLines={2}>
          {ref_.title}
          {ref_.year ? <AppText variant="caption">  {ref_.year}</AppText> : null}
        </AppText>
        {!!sub && (
          <AppText variant="caption" color={colors.primaryLight}>
            {sub}
          </AppText>
        )}
        {!!rating && <StarRating value={rating} size={15} />}
      </View>
      <View style={styles.mediaPoster}>
        {ref_.posterUrl && (
          <Image
            source={{ uri: sized(ref_.posterUrl, "w154") ?? ref_.posterUrl }}
            style={styles.fill}
            contentFit="cover"
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  findBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
  },
  chips: { gap: spacing.sm },
  live: { gap: spacing.sm },
  stories: { gap: spacing.lg },
  story: { alignItems: "center", gap: 4, width: 64 },
  ring: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: 2,
  },
  storyAvatar: {
    flex: 1,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fill: { width: "100%", height: "100%" },
  post: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  postTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  media: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  mediaPoster: {
    width: 56,
    height: 84,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  act: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
});
