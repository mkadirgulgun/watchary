import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, radius, spacing } from "@/constants/theme";

type Props = {
  label: string;
  count?: number;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, count, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.active]}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <AppText variant="label" color={active ? colors.primaryLight : colors.textSecondary}>
          {label}
        </AppText>
        {count !== undefined && (
          <AppText
            variant="caption"
            color={active ? colors.primaryLight : colors.textTertiary}
          >
            {count}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
});
