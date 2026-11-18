import { StyleSheet, Text, TextProps } from "react-native";

import { colors, fonts } from "@/constants/theme";

type Variant =
  | "display"
  | "headline"
  | "title"
  | "body"
  | "bodySmall"
  | "label"
  | "caption"
  | "overline";

type AppTextProps = TextProps & {
  variant?: Variant;
  color?: string;
};

export function AppText({
  variant = "body",
  color,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      style={[styles[variant], color ? { color } : null, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  display: {
    fontFamily: fonts.displayExtra,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: colors.text,
  },
  headline: {
    fontFamily: fonts.display,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: colors.text,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  label: {
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    lineHeight: 18,
    color: colors.text,
  },
  caption: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  overline: {
    fontFamily: fonts.display,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textTertiary,
  },
});
