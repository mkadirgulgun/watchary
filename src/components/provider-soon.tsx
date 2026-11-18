import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, radius, spacing } from "@/constants/theme";

type Props = {
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

/** Henüz bağlanmamış servisler için "yakında" kartı. */
export function ProviderSoon({ name, description, icon }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={22} color={colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="title">{name}</AppText>
        <AppText variant="caption">{description}</AppText>
      </View>
      <View style={styles.badge}>
        <AppText variant="caption" color={colors.textSecondary}>
          Yakında
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    opacity: 0.75,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
});
