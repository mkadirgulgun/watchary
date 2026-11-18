import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";

import { AppText } from "@/components/app-text";
import { colors, glow, radius, spacing } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  label?: string;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "sm";
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  children?: ReactNode;
};

export function Button({
  label,
  icon,
  variant = "primary",
  size = "md",
  active,
  disabled,
  onPress,
  style,
}: Props) {
  const isPrimary = variant === "primary";
  const fg = isPrimary
    ? colors.onPrimary
    : active
      ? colors.primary
      : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === "sm" && styles.sm,
        isPrimary && styles.primary,
        isPrimary && glow,
        variant === "secondary" && styles.secondary,
        variant === "secondary" && active && styles.secondaryActive,
        variant === "ghost" && styles.ghost,
        disabled && styles.disabled,
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <Ionicons name={icon} size={size === "sm" ? 16 : 18} color={fg} />}
        {label && (
          <AppText variant="label" color={fg}>
            {label}
          </AppText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  sm: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.md },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActive: { borderColor: colors.primary },
  ghost: { backgroundColor: "transparent" },
  disabled: { opacity: 0.4 },
});
