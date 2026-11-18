import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/constants/app";
import { colors, radius, spacing } from "@/constants/theme";
import { openProfile, openSearch } from "@/lib/nav";
import { useStore } from "@/lib/store";
import { Href, router } from "expo-router";

/** Ana sekmelerin üstündeki logo + arama + bildirim + avatar çubuğu. */
export function AppHeader() {
  const insets = useSafeAreaInsets();
  const name = useStore((s) => s.profile.name);
  const avatarUri = useStore((s) => s.profile.avatarUri);
  const reminderCount = useStore((s) => Object.keys(s.reminders).length);

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
          onPress={() => router.navigate("/calendar" as Href)}
          hitSlop={10}
          accessibilityLabel="Hatırlatıcılar"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {reminderCount > 0 && <View style={styles.dot} />}
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
  dot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
