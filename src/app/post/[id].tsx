import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/button";
import { SpoilerMask } from "@/components/review-card";
import { StarRating } from "@/components/star-rating";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { colors, fonts, noOutline, radius, spacing } from "@/constants/theme";
import { useAuth } from "@/lib/auth-store";
import { formatCount, formatEpisodeCode, timeAgo } from "@/lib/format";
import { openEpisode, openMedia } from "@/lib/nav";
import {
  addReviewComment,
  deleteReviewComment,
  fetchThread,
  setReviewLike,
  ThreadComment,
} from "@/lib/social";
import { useStore } from "@/lib/store";
import { sized } from "@/lib/tmdb";
import { useAsync } from "@/lib/use-async";

const openUser = (handle?: string) => handle && router.push(`/user/${handle}` as Href);

/** Gönderi adresi "rv:<inceleme kimliği>" biçimindedir. */
export default function PostScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = decodeURIComponent(rawId ?? "");
  const reviewId = id.startsWith("rv:") ? id.slice(3) : "";
  const insets = useSafeAreaInsets();

  const me = useAuth((s) => s.session?.user.id);
  const profile = useStore((s) => s.profile);

  const thread = useAsync(() => (reviewId ? fetchThread(reviewId) : Promise.resolve(null)), [reviewId]);
  const data = thread.data;

  // Sunucudan gelen verinin üstüne, bu ekranda yapılan değişiklikler eklenir.
  const [likeFlipped, setLikeFlipped] = useState(false);
  const [added, setAdded] = useState<ThreadComment[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const review = data?.review;
  const baseLiked = data?.liked ?? false;
  const liked = baseLiked !== likeFlipped;
  const likes = (data?.likes ?? 0) + (likeFlipped ? (baseLiked ? -1 : 1) : 0);
  const comments = [...(data?.comments ?? []).filter((c) => !removed.includes(c.id)), ...added];

  const toggleLike = async () => {
    if (!review) return;
    const next = !liked;
    setLikeFlipped((f) => !f);
    const err = await setReviewLike(review.id, next);
    if (err) setLikeFlipped((f) => !f);
  };

  const send = async () => {
    if (!review || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    const { comment, error: err } = await addReviewComment(review.id, draft);
    setSending(false);
    if (err || !comment) {
      setError(err ?? "Yorum gönderilemedi.");
      return;
    }
    setAdded((list) => [...list, comment]);
    setDraft("");
  };

  const remove = async (commentId: string) => {
    setRemoved((r) => [...r, commentId]);
    setAdded((list) => list.filter((c) => c.id !== commentId));
    const err = await deleteReviewComment(commentId);
    if (err) setRemoved((r) => r.filter((x) => x !== commentId));
  };

  const mine = review?.userId === me;
  const author = review
    ? {
        name: mine ? profile.name : (review.authorName ?? "Kullanıcı"),
        handle: mine ? profile.handle : review.authorHandle,
        avatar: mine ? profile.avatarUri : (review.authorAvatar ?? null),
      }
    : null;
  const isEp = !!review && review.season !== null && review.episode !== null;

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

      {thread.loading && !data && <Loading />}
      {thread.error && <ErrorState message={thread.error} onRetry={thread.reload} />}
      {!thread.loading && !thread.error && !review && (
        <EmptyState icon="chatbubble-outline" title="Gönderi bulunamadı" message="Silinmiş olabilir." />
      )}

      {review && author && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.post}>
            <Pressable style={styles.authorRow} onPress={() => openUser(author.handle)}>
              <Avatar name={author.name} uri={author.avatar} size={38} />
              <View style={{ flex: 1 }}>
                <AppText variant="title">
                  {author.name}{" "}
                  <AppText variant="caption">{isEp ? "bölüm günlüğü yazdı" : "inceleme yazdı"}</AppText>
                </AppText>
                <AppText variant="caption">{timeAgo(review.createdAt)}</AppText>
              </View>
            </Pressable>

            <Pressable
              style={styles.media}
              onPress={() =>
                isEp
                  ? openEpisode(review.ref.id, review.season as number, review.episode as number)
                  : openMedia(review.ref.type, review.ref.id)
              }
            >
              <View style={{ flex: 1, gap: 4 }}>
                <AppText variant="headline" numberOfLines={2}>
                  {review.ref.title}
                </AppText>
                {isEp && (
                  <AppText variant="caption" color={colors.primaryLight}>
                    {formatEpisodeCode(review.season as number, review.episode as number)}
                  </AppText>
                )}
                {!!review.rating && <StarRating value={review.rating} size={16} />}
                <View style={styles.inline}>
                  <AppText variant="caption" color={colors.primary}>
                    {isEp ? "Bölüme git" : review.ref.type === "tv" ? "Diziye git" : "Filme git"}
                  </AppText>
                  <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                </View>
              </View>
              <View style={styles.mediaPoster}>
                {review.ref.posterUrl && (
                  <Image
                    source={{ uri: sized(review.ref.posterUrl, "w154") ?? review.ref.posterUrl }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />
                )}
              </View>
            </Pressable>

            {review.spoiler && !revealed ? (
              <SpoilerMask text={review.text} onReveal={() => setRevealed(true)} />
            ) : (
              !!review.text && <AppText variant="body">{review.text}</AppText>
            )}

            <View style={styles.actions}>
              <Pressable style={styles.act} onPress={toggleLike}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={20}
                  color={liked ? colors.primary : colors.textSecondary}
                />
                <AppText variant="caption">{formatCount(Math.max(likes, 0))}</AppText>
              </Pressable>
              <View style={styles.act}>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
                <AppText variant="caption">{comments.length}</AppText>
              </View>
            </View>
          </View>

          <AppText variant="headline">Yorumlar ({comments.length})</AppText>

          {comments.length === 0 && (
            <AppText variant="bodySmall">Henüz yorum yok. İlk yorumu sen yaz.</AppText>
          )}

          {comments.map((c) => {
            const own = c.userId === me;
            return (
              <View key={c.id} style={styles.comment}>
                <Pressable onPress={() => openUser(own ? profile.handle : c.authorHandle)}>
                  <Avatar
                    name={own ? profile.name : c.authorName}
                    uri={own ? profile.avatarUri : c.authorAvatar}
                    size={30}
                  />
                </Pressable>
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="label">
                    {own ? profile.name : c.authorName}{" "}
                    <AppText variant="caption">• {timeAgo(c.at)}</AppText>
                  </AppText>
                  <AppText variant="body">{c.text}</AppText>
                  {own && (
                    <Pressable onPress={() => remove(c.id)} hitSlop={8} style={styles.del}>
                      <AppText variant="caption" color={colors.textTertiary}>
                        Sil
                      </AppText>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {review && (
        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.sm }]}>
          {!!error && (
            <AppText variant="caption" color={colors.danger} style={styles.error}>
              {error}
            </AppText>
          )}
          <View style={styles.composerRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Yorum yaz..."
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              maxLength={1000}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Button icon="send" size="sm" onPress={send} disabled={!draft.trim() || sending} />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  del: { alignSelf: "flex-start", marginTop: 2 },
  composer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  composerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  error: { paddingHorizontal: spacing.xs },
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
