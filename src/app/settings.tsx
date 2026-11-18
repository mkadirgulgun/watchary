import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/constants/app";
import { colors, radius, spacing } from "@/constants/theme";
import { signOut, useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";

function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = "Evet, sıfırla",
) {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: "Vazgeç", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const resetAll = useStore((s) => s.resetAll);
  const email = useAuth((s) => s.session?.user.email);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/"));

  return (
    <View style={styles.screen}>
      <View style={[styles.nav, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={back} hitSlop={10} accessibilityLabel="Geri">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="title">Ayarlar</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="overline">Hesap</AppText>

        <View style={styles.row}>
          <View style={styles.icon}>
            <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" numberOfLines={1}>
              {email ?? "Giriş yapılmadı"}
            </AppText>
            <AppText variant="caption">Verilerin hesabınla bulutta yedeklenir</AppText>
          </View>
        </View>

        <Pressable
          style={styles.row}
          onPress={() => confirmAction("Çıkış yapılsın mı?", "Hesabından çıkış yapılır. Verilerin bulutta kalır.", signOut, "Çıkış yap")}
        >
          <View style={styles.icon}>
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title">Çıkış Yap</AppText>
          </View>
        </Pressable>

        <AppText variant="overline" style={styles.gap}>
          Veri
        </AppText>

        <Pressable style={styles.row} onPress={() => router.push("/import" as Href)}>
          <View style={styles.icon}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title">Geçmişi İçe Aktar</AppText>
            <AppText variant="caption">Letterboxd CSV dosyasından film günlüğünü getir</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        <Pressable
          style={styles.row}
          onPress={() =>
            confirmAction(
              "Tüm veriler silinsin mi?",
              "İzleme listen, puanların, yorumların ve listelerin hesabından da silinir.",
              resetAll,
            )
          }
        >
          <View style={[styles.icon, styles.iconDanger]}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title" color={colors.danger}>
              Verilerimi Sıfırla
            </AppText>
            <AppText variant="caption">Hesabındaki tüm kayıtları siler</AppText>
          </View>
        </Pressable>

        <AppText variant="overline" style={styles.gap}>
          Hakkında
        </AppText>
        <View style={styles.about}>
          <View style={styles.brand}>
            <Logo size={32} />
            <AppText variant="title">{APP_NAME}</AppText>
          </View>
          <AppText variant="bodySmall">
            Verilerin şimdilik yalnızca bu cihazda saklanır. Hesap sistemi eklendiğinde bulutla
            senkronlanacak.
          </AppText>
          <AppText variant="caption">
            {
              "Bu uygulama TMDB API'sini kullanır ancak TMDB tarafından onaylanmamış ya da sertifikalandırılmamıştır. Film ve dizi verileri ve görselleri TMDB'ye aittir."
            }
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  screen: { flex: 1, backgroundColor: colors.background },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  gap: { marginTop: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDanger: { backgroundColor: "rgba(248,113,113,0.12)" },
  about: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
