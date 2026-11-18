import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { useStore } from "@/lib/store";
import { MediaRef } from "@/lib/types";

type Props = {
  visible: boolean;
  item: MediaRef;
  onClose: () => void;
};

export function AddToListSheet({ visible, item, onClose }: Props) {
  const lists = useStore((s) => s.lists);
  const addToList = useStore((s) => s.addToList);
  const removeFromList = useStore((s) => s.removeFromList);
  const createList = useStore((s) => s.createList);
  const [name, setName] = useState("");

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createList(trimmed, "");
    addToList(id, item);
    setName("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <AppText variant="headline">Listeye Ekle</AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <AppText variant="bodySmall" numberOfLines={1}>
            {item.title}
          </AppText>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.listWrap}>
            {lists.length === 0 && (
              <AppText variant="bodySmall">
                Henüz listen yok. Aşağıdan ilk listeni oluştur.
              </AppText>
            )}
            {lists.map((l) => {
              const has = l.items.some((i) => i.key === item.key);
              return (
                <Pressable
                  key={l.id}
                  style={styles.row}
                  onPress={() =>
                    has ? removeFromList(l.id, item.key) : addToList(l.id, item)
                  }
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="title">{l.name}</AppText>
                    <AppText variant="caption">{l.items.length} başlık</AppText>
                  </View>
                  <Ionicons
                    name={has ? "checkmark-circle" : "add-circle-outline"}
                    size={24}
                    color={has ? colors.primary : colors.textSecondary}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.newRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Yeni liste adı"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
              onSubmitEditing={create}
              returnKeyType="done"
            />
            <Button label="Oluştur" size="sm" onPress={create} disabled={!name.trim()} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    maxHeight: "80%",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scroll: { maxHeight: 280 },
  listWrap: { gap: spacing.sm, paddingVertical: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  newRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontFamily: fonts.body,
  },
});
