import {
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

import { EpisodeSheetHost } from "@/components/episode-sheet";
import { colors } from "@/constants/theme";
import { useAuth } from "@/lib/auth";
import { useHydrated, useStore } from "@/lib/store";
import { useCloudSync } from "@/lib/sync";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.onboarded);
  const session = useAuth((s) => s.session);
  const authReady = useAuth((s) => s.ready);
  const synced = useAuth((s) => s.synced);
  useCloudSync();

  const signedIn = !!session;
  // Giriş yapıldıysa, buluttaki veri gelene kadar bekle (yoksa onboarding bir an görünür).
  if (!fontsLoaded || !hydrated || !authReady || (signedIn && !synced)) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="media/[type]/[id]" />
          <Stack.Screen name="person/[id]" />
          <Stack.Screen name="user/[handle]" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="search" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="list/[id]" />
          <Stack.Screen
            name="review/[type]/[id]"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen
            name="profile-edit"
            options={{ presentation: "modal" }}
          />
          <Stack.Screen name="import" options={{ presentation: "modal" }} />
        </Stack.Protected>
      </Stack>
      {signedIn && onboarded && <EpisodeSheetHost />}
    </>
  );
}
