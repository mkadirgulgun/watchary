import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ImportPanel } from "@/components/import-panel";
import { Logo } from "@/components/logo";
import { ProgressBar } from "@/components/progress-bar";
import { ProviderSoon } from "@/components/provider-soon";
import { APP_NAME } from "@/constants/app";
import { colors, fonts, radius, spacing, noOutline } from "@/constants/theme";
import { normalizeHandle, saveProfile } from "@/lib/community";
import { useStore } from "@/lib/store";

const STEPS = 3;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);
  const setOnboarded = useStore((s) => s.setOnboarded);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => setOnboarded(true);

  // 2. adımdan geçerken ad ve kullanıcı adı buluta kaydedilir; kullanıcı adı alınmışsa uyarılır.
  const next = async () => {
    if (step === 2) {
      const merged = {
        ...profile,
        name: name.trim() || profile.name,
        handle: normalizeHandle(handle.trim() || profile.handle),
      };
      setBusy(true);
      setError(null);
      const err = await saveProfile(merged);
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      updateProfile({ name: merged.name, handle: merged.handle });
    }
    setStep(step + 1);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.md }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.top}>
        <View style={styles.brand}>
          <Logo size={26} />
          <AppText variant="headline">{APP_NAME}</AppText>
        </View>
        <Pressable onPress={finish} hitSlop={10}>
          <AppText variant="label" color={colors.textSecondary}>
            Atla
          </AppText>
        </Pressable>
      </View>

      <View style={styles.progress}>
        <View style={styles.progressTop}>
          <AppText variant="overline" color={colors.primary}>
            Adım {step} / {STEPS}
          </AppText>
          <AppText variant="overline">{Math.round((step / STEPS) * 100)}%</AppText>
        </View>
        <ProgressBar progress={step / STEPS} height={4} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && (
          <>
            <View style={styles.hero}>
              <Logo size={84} />
              <AppText variant="overline" color={colors.primary}>
                {APP_NAME}&apos;e hoş geldin
              </AppText>
            </View>
            <AppText variant="display">Film ve dizi evrenini tek yerde topla.</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              Daha önce başka bir yerde tuttuğun izleme geçmişini içeri aktarabilirsin. İstersen
              boş başla, sonra Profil sekmesinden de yapabilirsin.
            </AppText>
            <ImportPanel />
            <ProviderSoon name="TV Time" description="Dizi ilerlemeni ve izlenen bölümleri senkronla" icon="tv-outline" />
            <ProviderSoon name="Trakt" description="Tam izleme geçmişi ve puanlar" icon="sync-outline" />
          </>
        )}

        {step === 2 && (
          <>
            <AppText variant="display">Kendini tanıt.</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              Profilinde ve incelemelerinde görünecek ad. Sonra değiştirebilirsin.
            </AppText>
            <View style={styles.field}>
              <AppText variant="overline">Adın</AppText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={profile.name}
                placeholderTextColor={colors.textTertiary}
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <AppText variant="overline">Kullanıcı adı</AppText>
              <TextInput
                value={handle}
                onChangeText={setHandle}
                placeholder={profile.handle}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                style={styles.input}
              />
              <AppText variant="caption">
                Küçük harf, rakam ve alt çizgi kullanılır. Herkese açık profil adresin olur.
              </AppText>
            </View>
            {!!error && (
              <AppText variant="bodySmall" color={colors.danger}>
                {error}
              </AppText>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <AppText variant="display">Hazırsın.</AppText>
            <View style={styles.tips}>
              <Tip icon="search" title="Ara ve ekle" text="Keşfet'ten bir film ya da dizi bul, izleme listene ekle." />
              <Tip icon="play-forward" title="Bölümleri işaretle" text="Takip ettiğin dizilerin sıradaki bölümü “Sıradaki” sekmesinde." />
              <Tip icon="create" title="Günlüğünü tut" text="Puan ver, inceleme yaz, spoiler'ları gizle." />
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        {step > 1 && (
          <Button variant="secondary" icon="arrow-back" onPress={() => setStep(step - 1)} />
        )}
        <Button
          style={{ flex: 1 }}
          label={step === STEPS ? "Başla" : busy ? "Kontrol ediliyor..." : "Devam"}
          icon={step === STEPS ? "checkmark" : "arrow-forward"}
          disabled={busy}
          onPress={() => (step === STEPS ? finish() : next())}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Tip({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.tip}>
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="bodySmall">{text}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  hero: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  progress: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  field: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 50,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    ...noOutline,
  },
  tips: { gap: spacing.md },
  tip: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
