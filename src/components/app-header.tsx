import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/constants/app";
import { colors, radius, spacing } from "@/constants/theme";
import { openProfile, openSearch } from "@/lib/nav";
import { useUnreadCount } from "@/lib/notifications";
import { useStore } from "@/lib/store";
import { Href, router } from "expo-router";

/** Ana sekmelerin üstündeki logo + arama + bildirim + avatar çubuğu. */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const name = useStore((s) => s.profile.name);
  const avatarUri = useStore((s) => s.profile.avatarUri);
  const unread = useUnreadCount();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.brand}>
        <Logo size={26} />
        <AppText variant="headline">{APP_NAME}</AppText>
      </View>
      <View style={styles.actions}>
        <Pressable onPress={openSearch} hitSlop={10} accessibilityLabel="Ara">
          <Ionicons name="search" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push("/notifications" as Href)}
          hitSlop={10}
          accessibilityLabel="Bildirimler"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {unread > 0 && (
            <View style={styles.badge}>
              <AppText variant="overline" color={colors.onPrimary} style={styles.badgeText}>
                {unread > 9 ? "9+" : unread}
              </AppText>
            </View>
          )}
        </Pressable>
        <Pressable onPress={openProfile} accessibilityLabel="Profil">
          <Avatar name={name} uri={avatarUri} size={34} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 9, lineHeight: 12 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
