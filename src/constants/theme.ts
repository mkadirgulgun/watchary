import { Platform } from "react-native";

export const colors = {
  background: "#090A0F",
  surface: "#12131A",
  surfaceHigh: "#1A1C24",
  border: "#262934",
  primary: "#F59E0B",
  primaryLight: "#FBBF24",
  primaryDeep: "#D97706",
  primarySoft: "rgba(245, 158, 11, 0.12)",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",
  onPrimary: "#090A0F",
  danger: "#F87171",
  success: "#4ADE80",
  glass: "rgba(9, 10, 15, 0.85)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fonts = {
  display: "PlusJakartaSans_700Bold",
  displayExtra: "PlusJakartaSans_800ExtraBold",
  displaySemi: "PlusJakartaSans_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
};

export const glow = {
  shadowColor: colors.primary,
  shadowOpacity: 0.35,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 0 },
  elevation: 6,
};

/** Web'de input odak halkasını gizler; mobilde etkisizdir. */
export const noOutline: object =
  Platform.OS === "web" ? { outlineStyle: "none" } : {};
