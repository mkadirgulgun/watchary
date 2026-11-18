import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { StarRating } from "@/components/star-rating";
import { EmptyState, Loading } from "@/components/states";
import { colors, fonts, noOutline, radius, spacing } from "@/constants/theme";
import {
  allDemoIds,
  DEMO_COMMENTS,
  DEMO_POSTS,
  loadRefs,
} from "@/lib/demo-feed";
import { formatCount, formatEpisodeCode, timeAgo } from "@/lib/format";
import { openEpisode, openMedia } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { MediaRef, MediaType } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

type ThreadPost = {
  id: string;
  user: string;
  label: string;
  time: string;
  demo: boolean;
  kind: "review" | "episode" | "list";
  media: MediaRef | null;
  rating?: number | null;
  episodeCode?: string;
  episode?: { season: number; number: number };
  spoiler: boolean;
  text: string;
  title?: string;
  listItems: MediaRef[];
  likes: number;
};

export default function PostScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? "");
  const insets = useSafeAreaInsets();

  const reviews = useStore((s) => s.reviews);
  const profile = useStore((s) => s.profile);
  const myComments = useStore((s) => s.comments[id]);
  const likes = useStore((s) => s.likes);
  const toggleLike = useStore((s) => s.toggleLike);
  const addComment = useStore((s) => s.addComment);
  const deleteComment = useStore((s) => s.deleteComment);

  const refs = useAsync(() => loadRefs(allDemoIds), []);
  const refData = refs.data;

  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);

  const post: ThreadPost | null = useMemo(() => {
    const lookup = refData ?? {};
    if (id.startsWith("mine-")) {
      const r = reviews.find((x) => `mine-${x.id}` === id);
      if (!r) return null;
      const isEp = r.season !== null && r.episode !== null;
      return {
        id,
        user: profile.name,
        label: isEp ? "bölüm günlüğü yazdı" : "inceleme yazdı",
        time: timeAgo(r.createdAt),
        demo: false,
        kind: isEp ? "episode" : "review",
        media: r.ref,
        rating: r.rating,
        episodeCode: isEp ? formatEpisodeCode(r.season as number, r.episode as number) : undefined,
        episode: isEp ? { season: r.season as number, number: r.episode as number } : undefined,
        spoiler: r.spoiler,
        text: r.text,
        listItems: [],
        likes: 0,
      };
    }
    const p = DEMO_POSTS.find((x) => x.id === id);
    if (!p) return null;
    return {
      id,
      user: p.user,
      label: p.kind === "list" ? "liste yayınladı" : p.kind === "episode" ? "bölüm izledi" : "inceleme yazdı",
      time: `${p.hoursAgo} sa önce`,
      demo: true,
      kind: p.kind,
      media: lookup[`${p.media.type}:${p.media.id}`] ?? null,
      rating: p.rating,
      episodeCode: p.season ? formatEpisodeCode(p.season, p.episode ?? 1) : undefined,
      episode: p.season ? { season: p.season, number: p.episode ?? 1 } : undefined,
      spoiler: !!p.spoiler,
      text: p.text,
      title: p.title,
      listItems: (p.listItems ?? [])
        .map((m) => lookup[`${m.type}:${m.id}` as `${MediaType}:${number}`])
        .filter((m): m is MediaRef => !!m),
      likes: p.likes,
    };
  }, [id, reviews, profile.name, refData]);

  const demoComments = DEMO_COMMENTS[id] ?? [];
  const total = demoComments.length + (myComments?.length ?? 0);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const send = () => {
    if (!draft.trim()) return;
    addComment(id, draft);
    setDraft("");
  };

  const liked = !!likes[id];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={back} hitSlop={10} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="title">Gönderi</AppText>
        <View style={{ width: 24 }} />
      </View>

      {!post && refs.loading && <Loading />}
      {!post && !refs.loading && (
        <EmptyState icon="chatbubble-outline" title="Gönderi bulunamadı" />
      )}

      {post && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.post}>
            <View style={styles.authorRow}>
              <View style={styles.avatar}>
                <AppText variant="label" color={colors.onPrimary}>
                  {post.user.slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="title">
                  {post.user} <AppText variant="caption">{post.label}</AppText>
                </AppText>
                <AppText variant="caption">
                  {post.time}
                  {post.demo ? " • örnek" : ""}
                </AppText>
              </View>
            </View>

            {post.kind === "list" ? (
              <>
                <AppText variant="headline">{post.title}</AppText>
                <AppText variant="body" color={colors.textSecondary}>
                  {post.text}
                </AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.collage}>
                  {post.listItems.map((m) => (
                    <Pressable key={m.key} style={styles.collageItem} onPress={() => openMedia(m.type, m.id)}>
                      {m.posterUrl && (
                        <Image
                          source={{ uri: sized(m.posterUrl, "w185") ?? m.posterUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                {post.media && (
                  <Pressable
                    style={styles.media}
                    onPress={() =>
                      post.episode && post.media
                        ? openEpisode(post.media.id, post.episode.season, post.episode.number)
                        : post.media && openMedia(post.media.type, post.media.id)
                    }
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText variant="headline" numberOfLines={2}>
                        {post.media.title}
                      </AppText>
                      {!!post.episodeCode && (
                        <AppText variant="caption" color={colors.primaryLight}>
                          {post.episodeCode}
                        </AppText>
                      )}
                      {!!post.rating && <StarRating value={post.rating} size={16} />}
                      <View style={styles.inline}>
                        <AppText variant="caption" color={colors.primary}>
                          {post.episode ? "Bölüme git" : post.media.type === "tv" ? "Diziye git" : "Filme git"}
                        </AppText>
                        <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                      </View>
                    </View>
                    <View style={styles.mediaPoster}>
                      {post.media.posterUrl && (
                        <Image
                          source={{ uri: sized(post.media.posterUrl, "w154") ?? post.media.posterUrl }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                        />
                      )}
                    </View>
                  </Pressable>
                )}
                {post.spoiler && !revealed ? (
                  <Pressable style={styles.spoiler} onPress={() => setRevealed(true)}>
                    <Ionicons name="eye-off-outline" size={16} color={colors.primary} />
                    <AppText variant="label" color={colors.primary}>
                      Spoiler içeriyor, görmek için dokun
                    </AppText>
                  </Pressable>
                ) : (
                  !!post.text && <AppText variant="body">{post.text}</AppText>
                )}
              </>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.act} onPress={() => toggleLike(id)}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={20}
                  color={liked ? colors.primary : colors.textSecondary}
                />
                <AppText variant="caption">{formatCount(post.likes + (liked ? 1 : 0))}</AppText>
              </Pressable>
              <View style={styles.act}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                <AppText variant="caption">{total}</AppText>
              </View>
            </View>
          </View>

          <AppText variant="headline">Yorumlar ({total})</AppText>

          {total === 0 && (
            <AppText variant="bodySmall">Henüz yorum yok. İlk yorumu sen yaz.</AppText>
          )}

          {demoComments.map((c, i) => (
            <CommentRow
              key={`${id}-d${i}`}
              commentId={`c-${id}-${i}`}
              user={c.user}
              time={`${c.hoursAgo} sa önce`}
              text={c.text}
              baseLikes={c.likes}
              demo
            />
          ))}

          {(myComments ?? []).map((c) => (
            <CommentRow
              key={c.id}
              commentId={`c-${c.id}`}
              user={profile.name}
              time={timeAgo(c.createdAt)}
              text={c.text}
              baseLikes={0}
              onDelete={() => deleteComment(id, c.id)}
            />
          ))}
        </ScrollView>
      )}

      {post && (
        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Yorum yaz..."
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <Button icon="send" size="sm" onPress={send} disabled={!draft.trim()} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function CommentRow({
  commentId,
  user,
  time,
  text,
  baseLikes,
  demo,
  onDelete,
}: {
  commentId: string;
  user: string;
  time: string;
  text: string;
  baseLikes: number;
  demo?: boolean;
  onDelete?: () => void;
}) {
  const liked = useStore((s) => !!s.likes[commentId]);
  const toggleLike = useStore((s) => s.toggleLike);
  return (
    <View style={styles.comment}>
      <View style={styles.commentAvatar}>
        <AppText variant="caption" color={colors.onPrimary}>
          {user.slice(0, 1).toUpperCase()}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">
          {user} <AppText variant="caption">• {time}{demo ? " • örnek" : ""}</AppText>
        </AppText>
        <AppText variant="body">{text}</AppText>
        <View style={styles.commentActions}>
          <Pressable style={styles.act} onPress={() => toggleLike(commentId)} hitSlop={8}>
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={15}
              color={liked ? colors.primary : colors.textSecondary}
            />
            <AppText variant="caption">{baseLikes + (liked ? 1 : 0)}</AppText>
          </Pressable>
          {onDelete && (
            <Pressable onPress={onDelete} hitSlop={8}>
              <AppText variant="caption" color={colors.textTertiary}>
                Sil
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  post: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
    width: 64,
    height: 96,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    overflow: "hidden",
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 2 },
  spoiler: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  collage: { gap: spacing.sm },
  collageItem: {
    width: 90,
    height: 135,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  act: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  comment: {
    flexDirection: "row",
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    backgroundColor: colors.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  commentActions: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: 2 },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    ...noOutline,
  },
});
