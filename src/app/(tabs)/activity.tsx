import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { ReactNode, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Chip } from "@/components/chip";
import { StarRating } from "@/components/star-rating";
import { EmptyState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import {
  allDemoIds,
  DEMO_COMMENTS,
  DEMO_FRIENDS,
  DEMO_POSTS,
  loadRefs,
} from "@/lib/demo-feed";
import { formatCount, formatEpisodeCode, timeAgo } from "@/lib/format";
import { openMedia, openPost, openSearch } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { MediaRef } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

type Tab = "all" | "popular" | "mine";

export default function ActivityScreen() {
  const [tab, setTab] = useState<Tab>("all");
  const reviews = useStore((s) => s.reviews);
  const profile = useStore((s) => s.profile);
  const likes = useStore((s) => s.likes);
  const comments = useStore((s) => s.comments);
  const toggleLike = useStore((s) => s.toggleLike);
  const toggleWatchlist = useStore((s) => s.toggleWatchlist);
  const entries = useStore((s) => s.entries);

  const refs = useAsync(() => loadRefs(allDemoIds), []);
  const lookup = refs.data ?? {};

  const mine = useMemo(
    () =>
      reviews.slice(0, 10).map((r) => ({
        id: `mine-${r.id}`,
        user: profile.name,
        at: r.createdAt,
        review: r,
      })),
    [reviews, profile.name],
  );

  const demo = [...DEMO_POSTS].sort((a, b) =>
    tab === "popular" ? b.likes - a.likes : a.hoursAgo - b.hoursAgo,
  );

  const commentCount = (postId: string) =>
    (DEMO_COMMENTS[postId]?.length ?? 0) + (comments[postId]?.length ?? 0);

  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="display">Akış</AppText>
        </View>

        <View style={styles.demoBanner}>
          <Ionicons name="flask-outline" size={18} color={colors.primary} />
          <AppText variant="bodySmall" style={{ flex: 1 }}>
            Bu akış örnek verilerle gösteriliyor. Arkadaş ve takip özellikleri hesap sistemi
            bağlandığında gerçek olacak. Kendi yazdıkların şimdiden burada.
          </AppText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="Herkes" active={tab === "all"} onPress={() => setTab("all")} />
          <Chip label="Popüler" active={tab === "popular"} onPress={() => setTab("popular")} />
          <Chip label="Benimkiler" active={tab === "mine"} onPress={() => setTab("mine")} />
        </ScrollView>

        {tab === "all" && (
          <View style={styles.live}>
            <AppText variant="overline">Şu an izleyenler</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stories}>
              {DEMO_FRIENDS.map((f) => {
                const m = lookup[`${f.watching.type}:${f.watching.id}`];
                return (
                  <Pressable key={f.name} style={styles.story} onPress={() => openMedia(f.watching.type, f.watching.id)}>
                    <View style={styles.ring}>
                      <View style={styles.storyAvatar}>
                        {m?.posterUrl ? (
                          <Image
                            source={{ uri: sized(m.posterUrl, "w154") ?? m.posterUrl }}
                            style={styles.fill}
                            contentFit="cover"
                          />
                        ) : (
                          <AppText variant="label">{f.name.slice(0, 1)}</AppText>
                        )}
                      </View>
                    </View>
                    <AppText variant="caption" numberOfLines={1}>
                      {f.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {refs.loading && !refs.data && <Loading />}

        {tab !== "popular" &&
          mine.map((m) => {
            const r = m.review;
            const isEp = r.season !== null && r.episode !== null;
            const liked = !!likes[m.id];
            return (
              <PostShell
                key={m.id}
                user={m.user}
                label={isEp ? "bölüm günlüğü yazdı" : "inceleme yazdı"}
                time={timeAgo(m.at)}
                onPress={() => openPost(m.id)}
              >
                <MediaHeader
                  ref_={r.ref}
                  rating={r.rating ?? undefined}
                  sub={isEp ? formatEpisodeCode(r.season as number, r.episode as number) : undefined}
                />
                {!!r.text && (
                  <AppText variant="body" numberOfLines={5}>
                    {r.text}
                  </AppText>
                )}
                <PostActions
                  liked={liked}
                  likeCount={liked ? 1 : 0}
                  commentCount={commentCount(m.id)}
                  onLike={() => toggleLike(m.id)}
                  onComments={() => openPost(m.id)}
                />
              </PostShell>
            );
          })}

        {tab === "mine" && mine.length === 0 && (
          <EmptyState
            icon="create-outline"
            title="Henüz yazın yok"
            message="Bir film ya da diziye inceleme yazdığında burada görünür."
            actionLabel="Bir şey bul"
            onAction={openSearch}
          />
        )}

        {tab !== "mine" &&
          demo.map((p) => {
            const media = lookup[`${p.media.type}:${p.media.id}`];
            const liked = !!likes[p.id];
            const inList = !!entries[`${p.media.type}:${p.media.id}`]?.watchlist;
            return (
              <PostShell
                key={p.id}
                user={p.user}
                label={p.kind === "list" ? "liste yayınladı" : p.kind === "episode" ? "bölüm izledi" : "inceleme yazdı"}
                time={`${p.hoursAgo} sa önce`}
                demo
                onPress={() => openPost(p.id)}
              >
                {p.kind === "list" ? (
                  <>
                    <AppText variant="headline">{p.title}</AppText>
                    <AppText variant="bodySmall">{p.text}</AppText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collage}>
                      {(p.listItems ?? []).map((m) => {
                        const ref = lookup[`${m.type}:${m.id}`];
                        return (
                          <Pressable key={m.id} style={styles.collageItem} onPress={() => openMedia(m.type, m.id)}>
                            {ref?.posterUrl && (
                              <Image
                                source={{ uri: sized(ref.posterUrl, "w154") ?? ref.posterUrl }}
                                style={styles.fill}
                                contentFit="cover"
                              />
                            )}
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : (
                  <>
                    {media && (
                      <MediaHeader
                        ref_={media}
                        rating={p.rating}
                        sub={p.season ? formatEpisodeCode(p.season, p.episode ?? 1) : undefined}
                      />
                    )}
                    {p.spoiler ? (
                      <View style={styles.spoiler}>
                        <Ionicons name="eye-off-outline" size={16} color={colors.primary} />
                        <AppText variant="label" color={colors.primary}>
                          Spoiler gizli
                        </AppText>
                      </View>
                    ) : (
                      <AppText variant="body">{p.text}</AppText>
                    )}
                  </>
                )}
                <PostActions
                  liked={liked}
                  likeCount={p.likes + (liked ? 1 : 0)}
                  commentCount={commentCount(p.id)}
                  onLike={() => toggleLike(p.id)}
                  onComments={() => openPost(p.id)}
                >
                  {media && p.kind !== "list" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={inList ? "bookmark" : "bookmark-outline"}
                      label={inList ? "Listemde" : "İzleme Listesi"}
                      onPress={() => toggleWatchlist(media)}
                    />
                  )}
                </PostActions>
              </PostShell>
            );
          })}
      </ScrollView>
    </View>
  );
}

function PostShell({
  user,
  label,
  time,
  demo,
  onPress,
  children,
}: {
  user: string;
  label: string;
  time: string;
  demo?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable style={styles.post} onPress={onPress} accessibilityRole="button">
      <View style={styles.postTop}>
        <View style={styles.avatar}>
          <AppText variant="label" color={colors.onPrimary}>
            {user.slice(0, 1).toUpperCase()}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title">
            {user} <AppText variant="caption">{label}</AppText>
          </AppText>
          <AppText variant="caption">
            {time}
            {demo ? " • örnek" : ""}
          </AppText>
        </View>
      </View>
      {children}
    </Pressable>
  );
}

function PostActions({
  liked,
  likeCount,
  commentCount,
  onLike,
  onComments,
  children,
}: {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onComments: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={styles.actions}>
      <Pressable style={styles.act} onPress={onLike} hitSlop={8}>
        <Ionicons name={liked ? "heart" : "heart-outline"} size={20} color={liked ? colors.primary : colors.textSecondary} />
        <AppText variant="caption">{formatCount(likeCount)}</AppText>
      </Pressable>
      <Pressable style={styles.act} onPress={onComments} hitSlop={8}>
        <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
        <AppText variant="caption">{commentCount}</AppText>
      </Pressable>
      <View style={{ flex: 1 }} />
      {children}
    </View>
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
        {sub && (
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
  titleRow: { flexDirection: "row", alignItems: "center" },
  demoBanner: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    padding: spacing.md,
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
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
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
  spoiler: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  act: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  collage: { gap: spacing.sm },
  collageItem: {
    width: 90,
    height: 135,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
});
