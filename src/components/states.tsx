import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { colors, radius, spacing } from "@/constants/theme";

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

type EmptyProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = "film-outline",
  title,
  message,
  actionLabel,
  onAction,
}: EmptyProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.textSecondary} />
      </View>
      <AppText variant="title" style={styles.centerText}>
        {title}
      </AppText>
      {message && (
        <AppText variant="bodySmall" style={styles.centerText}>
          {message}
        </AppText>
      )}
      {actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} size="sm" variant="secondary" />
      )}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon="cloud-offline-outline"
      title="Bir şeyler ters gitti"
      message={message}
      actionLabel={onRetry ? "Tekrar dene" : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: "center", justifyContent: "center" },
  empty: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  centerText: { textAlign: "center" },
});
