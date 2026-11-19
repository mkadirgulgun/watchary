import { Ionicons } from "@expo/vector-icons";
import { Href, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { PersonRow } from "@/components/person-row";
import { EmptyState, ErrorState, Loading } from "@/components/states";
import { colors, spacing } from "@/constants/theme";
import { fetchProfileByHandle } from "@/lib/community";
import { fetchFollowList } from "@/lib/social";
import { useAsync } from "@/lib/use-async";

/** Bir kullanıcının takipçileri ya da takip ettikleri. */
export default function PeopleScreen() {
  const insets = useSafeAreaInsets();
  const { handle, type } = useLocalSearchParams<{ handle: string; type?: string }>();
  const kind = type === "following" ? "following" : "followers";

  const owner = useAsync(() => fetchProfileByHandle(handle), [handle]);
  const ownerId = owner.data?.id;
  const list = useAsync(
    () => (ownerId ? fetchFollowList(ownerId, kind) : Promise.resolve([])),
    [ownerId, kind],
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const open = (h: string) => router.push(`/user/${h}` as Href);

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={back} hitSlop={10} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="title">{kind === "followers" ? "Takipçiler" : "Takip Edilenler"}</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(owner.loading || list.loading) && !list.data && <Loading />}
        {owner.error && <ErrorState message={owner.error} onRetry={owner.reload} />}
        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {!list.loading && !list.error && list.data?.length === 0 && (
          <EmptyState
            icon="people-outline"
            title={kind === "followers" ? "Henüz takipçi yok" : "Henüz kimseyi takip etmiyor"}
          />
        )}
        {list.data?.map((p) => (
          <PersonRow key={p.id} person={p} onPress={() => open(p.handle)} />
        ))}
      </ScrollView>
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
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl * 2 },
});
