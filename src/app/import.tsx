import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { ImportPanel } from "@/components/import-panel";
import { ProviderSoon } from "@/components/provider-soon";
import { colors, spacing } from "@/constants/theme";

export default function ImportModal() {
  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <View style={{ width: 60 }} />
        <AppText variant="title">Geçmişi İçe Aktar</AppText>
        <Pressable onPress={close} hitSlop={10} style={{ width: 60, alignItems: "flex-end" }}>
          <AppText variant="body" color={colors.primary}>
            Bitti
          </AppText>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <ImportPanel />
        <ProviderSoon name="TV Time" description="Dizi ilerlemeni ve izlenen bölümleri senkronla" icon="tv-outline" />
        <ProviderSoon name="Trakt" description="Tam izleme geçmişi ve puanlar" icon="sync-outline" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.lg, gap: spacing.md },
});
