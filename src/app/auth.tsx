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
import { Logo } from "@/components/logo";
import { APP_NAME } from "@/constants/app";
import { colors, fonts, radius, spacing, noOutline } from "@/constants/theme";
import { signIn, signUp } from "@/lib/auth";
import { supabaseConfigured } from "@/lib/supabase";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const isRegister = mode === "register";
  const canSubmit = email.includes("@") && password.length >= 6 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const result = isRegister ? await signUp(email, password) : await signIn(email, password);
    setBusy(false);
    if (result === "confirm") setConfirmSent(true);
    else if (result) setError(result);
    // Başarılı girişte oturum değişir, yönlendirmeyi kök düzen yapar.
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setError(null);
    setConfirmSent(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Logo size={84} />
          <AppText variant="display">{APP_NAME}</AppText>
          <AppText variant="body" color={colors.textSecondary} style={styles.center}>
            Film ve dizi günlüğün, her cihazında seninle.
          </AppText>
        </View>

        {!supabaseConfigured && (
          <View style={styles.notice}>
            <AppText variant="bodySmall" color={colors.danger}>
              Supabase ayarları bulunamadı. .env dosyasındaki EXPO_PUBLIC_SUPABASE_URL ve
              EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY değerlerini kontrol et, sonra sunucuyu yeniden
              başlat.
            </AppText>
          </View>
        )}

        <View style={styles.form}>
          <AppText variant="headline">{isRegister ? "Hesap oluştur" : "Giriş yap"}</AppText>

          <View style={styles.field}>
            <AppText variant="overline">E-posta</AppText>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="ornek@mail.com"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <AppText variant="overline">Şifre</AppText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="En az 6 karakter"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              textContentType={isRegister ? "newPassword" : "password"}
              onSubmitEditing={submit}
              style={styles.input}
            />
          </View>

          {!!error && (
            <AppText variant="bodySmall" color={colors.danger}>
              {error}
            </AppText>
          )}
          {confirmSent && (
            <View style={styles.notice}>
              <AppText variant="bodySmall" color={colors.primaryLight}>
                Hesabın oluşturuldu. E-postana bir onay bağlantısı gönderdik. Onayladıktan sonra
                giriş yapabilirsin.
              </AppText>
            </View>
          )}

          <Button
            label={busy ? "Bekle..." : isRegister ? "Kayıt ol" : "Giriş yap"}
            onPress={submit}
            disabled={!canSubmit}
          />

          <Pressable onPress={switchMode} hitSlop={8} style={styles.switch}>
            <AppText variant="bodySmall">
              {isRegister ? "Zaten hesabın var mı? " : "Hesabın yok mu? "}
              <AppText variant="label" color={colors.primary}>
                {isRegister ? "Giriş yap" : "Kayıt ol"}
              </AppText>
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
  hero: { alignItems: "center", gap: spacing.md },
  center: { textAlign: "center" },
  form: { gap: spacing.md },
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
  notice: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  switch: { alignItems: "center", paddingVertical: spacing.sm },
});
