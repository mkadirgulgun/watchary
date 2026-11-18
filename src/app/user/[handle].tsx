import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { ReviewCard } from "@/components/review-card";
import { ErrorState, Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { fetchProfileByHandle, fetchUserReviews } from "@/lib/community";
import { openMedia } from "@/lib/nav";
import { useAsync } from "@/lib/use-async";

/** Başka bir kullanıcının herkese açık profili: bilgileri ve yazdığı incelemeler. */
export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const { handle } = useLocalSearchParams<{ handle: string }>();

  const profile = useAsync(() => fetchProfileByHandle(handle), [handle]);
  const profileId = profile.data?.id;
  const reviews = useAsync(
    () => (profileId ? fetchUserReviews(profileId) : Promise.resolve([])),
    [profileId],
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const p = profile.data;

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={back} hitSlop={10} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="title">@{handle}</AppText>
        <View style={{ width: 24 }} />
      </View>

      {profile.loading && !p && <Loading />}
      {profile.error && <ErrorState message={profile.error} onRetry={profile.reload} />}

      {!profile.loading && !profile.error && !p && (
        <View style={styles.empty}>
          <Ionicons name="person-outline" size={32} color={colors.textTertiary} />
          <AppText variant="headline">Kullanıcı bulunamadı</AppText>
          <AppText variant="bodySmall">@{handle} adında bir hesap yok.</AppText>
        </View>
      )}

      {p && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.head}>
            <Avatar name={p.name} uri={p.avatarUrl} size={92} />
            <AppText variant="display" style={styles.center}>
              {p.name}
            </AppText>
            <View style={styles.meta}>
              <AppText variant="bodySmall" color={colors.primaryLight}>
                @{p.handle}
              </AppText>
              {!!p.location && (
                <>
                  <AppText variant="bodySmall">•</AppText>
                  <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                  <AppText variant="bodySmall">{p.location}</AppText>
                </>
              )}
            </View>
            {!!p.bio && (
              <AppText variant="body" color={colors.textSecondary} style={styles.center}>
                {p.bio}
              </AppText>
            )}
            <View style={styles.count}>
              <AppText variant="headline">{reviews.data?.length ?? 0}</AppText>
              <AppText variant="caption">inceleme</AppText>
            </View>
          </View>

          <AppText variant="headline">İncelemeleri</AppText>
          {reviews.loading && !reviews.data && <Loading />}
          {reviews.data?.length === 0 && (
            <AppText variant="bodySmall">Henüz bir inceleme yazmamış.</AppText>
          )}
          {reviews.data?.map((r) => (
            <View key={r.id} style={styles.item}>
              <Pressable onPress={() => openMedia(r.ref.type, r.ref.id)}>
                <AppText variant="label" color={colors.primary}>
                  {r.ref.title}
                  {r.ref.year ? ` (${r.ref.year})` : ""} ›
                </AppText>
              </Pressable>
              <ReviewCard review={r} showAuthor={false} />
            </View>
          ))}
        </ScrollView>
      )}
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
  },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  head: { alignItems: "center", gap: spacing.sm, paddingBottom: spacing.md },
  center: { textAlign: "center" },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
  count: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  item: { gap: spacing.xs + 2 },
  empty: { alignItems: "center", gap: spacing.sm, padding: spacing.xxl },
});
