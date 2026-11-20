import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { EmptyState } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { formatEpisodeCode, timeAgo } from "@/lib/format";
import { openPost } from "@/lib/nav";
import { NotificationItem, refreshNotifications, useNotifications } from "@/lib/notifications";
import { useStore } from "@/lib/store";

const ICON: Record<NotificationItem["kind"], keyof typeof Ionicons.glyphMap> = {
  follow: "person-add",
  like: "heart",
  comment: "chatbubble",
};

const HEADLINE: Record<NotificationItem["kind"], string> = {
  follow: "seni takip etmeye başladı",
  like: "incelemeni beğendi",
  comment: "incelemene yorum yaptı",
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const items = useNotifications((s) => s.items);
  const markSeen = useStore((s) => s.markNotificationsSeen);
  // Açılış anındaki okunmuşluk durumu: yeni olanlar vurgulu gösterilir
  const [seenAt] = useState(() => useStore.getState().notifSeenAt);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void refreshNotifications();
    markSeen();
  }, [markSeen]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    markSeen();
    setRefreshing(false);
  };

  const open = (n: NotificationItem) => {
    if (n.kind === "follow") {
      if (n.actor.handle) router.push(`/user/${n.actor.handle}` as Href);
    } else if (n.reviewId) {
      openPost(`rv:${n.reviewId}`);
    }
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={back} hitSlop={10} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="title">Bildirimler</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {items.length === 0 && (
          <EmptyState
            icon="notifications-outline"
            title="Henüz bildirim yok"
            message="Biri seni takip ettiğinde ya da incelemene beğeni ve yorum geldiğinde burada görünür."
          />
        )}

        {items.map((n) => {
          const unread = n.at > seenAt;
          const ep =
            n.season !== null && n.season !== undefined && n.episode !== null && n.episode !== undefined
              ? formatEpisodeCode(n.season, n.episode)
              : null;
          return (
            <Pressable
              key={n.id}
              style={[styles.row, unread && styles.rowUnread]}
              onPress={() => open(n)}
            >
              <View>
                <Avatar name={n.actor.name} uri={n.actor.avatar} size={44} />
                <View style={styles.badge}>
                  <Ionicons name={ICON[n.kind]} size={11} color={colors.onPrimary} />
                </View>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body">
                  <AppText variant="title">{n.actor.name}</AppText> {HEADLINE[n.kind]}
                </AppText>
                {!!n.title && (
                  <AppText variant="caption" color={colors.primaryLight} numberOfLines={1}>
                    {n.title}
                    {ep ? ` • ${ep}` : ""}
                  </AppText>
                )}
                {!!n.text && (
                  <AppText variant="bodySmall" numberOfLines={2}>
                    “{n.text}”
                  </AppText>
                )}
                <AppText variant="caption">{timeAgo(n.at)}</AppText>
              </View>
              {unread && <View style={styles.dot} />}
            </Pressable>
          );
        })}
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
  rowUnread: { borderColor: colors.primaryDeep, backgroundColor: colors.primarySoft },
  badge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 9, height: 9, borderRadius: radius.full, backgroundColor: colors.primary },
});
