import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { colors, fonts, radius, spacing, noOutline } from "@/constants/theme";
import { normalizeHandle, saveProfile } from "@/lib/community";
import { useStore } from "@/lib/store";

export default function ProfileEditModal() {
  const profile = useStore((s) => s.profile);
  const updateProfile = useStore((s) => s.updateProfile);

  const [name, setName] = useState(profile.name);
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const patch = {
      name: name.trim() || profile.name,
      handle: normalizeHandle(handle.trim() || profile.handle),
      bio: bio.trim(),
      location: location.trim(),
    };
    setBusy(true);
    setError(null);
    const err = await saveProfile({ ...profile, ...patch });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    updateProfile(patch);
    close();
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.top}>
        <Pressable onPress={close} hitSlop={10}>
          <AppText variant="body" color={colors.textSecondary}>
            İptal
          </AppText>
        </Pressable>
        <AppText variant="title">Profili Düzenle</AppText>
        <Button label={busy ? "..." : "Kaydet"} size="sm" onPress={save} disabled={busy} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Ad" value={name} onChangeText={setName} />
        <Field label="Kullanıcı adı" value={handle} onChangeText={setHandle} autoCapitalize="none" />
        <Field label="Konum" value={location} onChangeText={setLocation} />
        <Field label="Hakkında" value={bio} onChangeText={setBio} multiline />
        {!!error && (
          <AppText variant="bodySmall" color={colors.danger}>
            {error}
          </AppText>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  multiline,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  autoCapitalize?: "none";
}) {
  return (
    <View style={styles.field}>
      <AppText variant="overline">{label}</AppText>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, multiline && styles.multiline]}
      />
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
  content: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 15,
    ...noOutline,
  },
  multiline: { height: 110, paddingTop: spacing.md, textAlignVertical: "top" },
});
