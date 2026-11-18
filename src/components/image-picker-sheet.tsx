import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { Loading } from "@/components/states";
import { colors, radius, spacing } from "@/constants/theme";
import { useStore } from "@/lib/store";
import { getBackdrops, getDetails, sized } from "@/lib/tmdb";
import { Cast, MediaRef } from "@/lib/types";
import { useAsync } from "@/lib/use-async";

type Mode = "avatar" | "cover";

type Props = {
  mode: Mode | null;
  hasCurrent: boolean;
  onClose: () => void;
  onPick: (uri: string | null) => void;
};

type Source = { ref: MediaRef; cast: Cast[]; backdrops: string[] };

const MAX_BASE64 = 1_000_000; // yaklaşık 750 KB; depoyu şişirmemek için

export function ImagePickerSheet({ mode, hasCurrent, onClose, onPick }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const entries = useStore((s) => s.entries);
  const episodes = useStore((s) => s.episodes);
  const [error, setError] = useState<string | null>(null);

  // İzlediğin yapımlar: önce takip edilen/izlenen diziler, sonra izlenen filmler.
  const titles = useMemo(() => {
    const all = Object.values(entries);
    const recency = (a: (typeof all)[number], b: (typeof all)[number]) =>
      (b.watchedAt ?? b.addedAt) - (a.watchedAt ?? a.addedAt);
    const shows = all
      .filter(
        (e) =>
          e.ref.type === "tv" &&
          (e.watchlist || e.favorite || Object.keys(episodes[e.ref.key] ?? {}).length > 0),
      )
      .sort(recency);
    const movies = all.filter((e) => e.ref.type === "movie" && (e.watched || e.favorite)).sort(recency);
    return [...shows, ...movies].slice(0, 8).map((e) => e.ref);
  }, [entries, episodes]);

  const signature = `${mode}:${titles.map((t) => t.key).join("|")}`;
  const sources = useAsync<Source[]>(
    async () => {
      if (!mode) return [];
      const list = await Promise.all(
        titles.map(async (ref): Promise<Source | null> => {
          try {
            const d = await getDetails(ref.type, ref.id);
            const backdrops = mode === "cover" ? await getBackdrops(ref.type, ref.id) : [];
            return {
              ref,
              cast: d.cast.filter((c) => !!c.photoUrl).slice(0, 10),
              backdrops,
            };
          } catch {
            return null;
          }
        }),
      );
      return list.filter((s): s is Source => s !== null);
    },
    [signature],
  );

  const pickFromGallery = async () => {
    setError(null);
    try {
      if (mode === null) return;
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && perm.canAskAgain === false) {
        setError("Galeri izni verilmemiş. Ayarlardan izin verebilirsin.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: mode === "avatar" ? [1, 1] : [16, 9],
        quality: 0.4,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        setError("Resim okunamadı, başka bir resim dene.");
        return;
      }
      if (asset.base64.length > MAX_BASE64) {
        setError("Resim çok büyük, daha küçük bir resim seç.");
        return;
      }
      onPick(`data:image/jpeg;base64,${asset.base64}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Galeri açılamadı.");
    }
  };

  const visible = mode !== null;
  const isAvatar = mode === "avatar";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { maxHeight: height * 0.85, paddingBottom: insets.bottom + spacing.md }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <AppText variant="headline">{isAvatar ? "Profil Resmi Seç" : "Kapak Resmi Seç"}</AppText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Button
              style={styles.flex}
              variant="secondary"
              icon="images-outline"
              label="Galeriden Seç"
              onPress={pickFromGallery}
            />
            {hasCurrent && (
              <Button
                variant="secondary"
                icon="trash-outline"
                label="Kaldır"
                onPress={() => onPick(null)}
              />
            )}
          </View>
          {!!error && (
            <AppText variant="bodySmall" color={colors.danger}>
              {error}
            </AppText>
          )}

          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <AppText variant="overline">İzlediklerinden</AppText>

            {titles.length === 0 && (
              <AppText variant="bodySmall">
                Henüz izlediğin bir yapım yok. Birkaç film ya da dizi izlediğinde karakterlerini ve
                sahnelerini buradan seçebilirsin.
              </AppText>
            )}
            {titles.length > 0 && sources.loading && !sources.data && <Loading />}

            {(sources.data ?? []).map((s) => (
              <View key={s.ref.key} style={styles.source}>
                <AppText variant="title" numberOfLines={1}>
                  {s.ref.title}
                </AppText>

                {isAvatar ? (
                  <FlatList
                    data={s.cast}
                    keyExtractor={(c) => String(c.id)}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.row}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.character}
                        onPress={() =>
                          onPick(item.photoUrl ? item.photoUrl.replace("/w185/", "/h632/") : null)
                        }
                      >
                        <View style={styles.characterPhoto}>
                          <Image
                            source={{ uri: item.photoUrl as string }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                          />
                        </View>
                        <AppText variant="label" numberOfLines={1} style={styles.center}>
                          {item.character || item.name}
                        </AppText>
                        <AppText variant="caption" numberOfLines={1} style={styles.center}>
                          {item.name}
                        </AppText>
                      </Pressable>
                    )}
                  />
                ) : (
                  <FlatList
                    data={s.backdrops}
                    keyExtractor={(u) => u}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.row}
                    renderItem={({ item }) => (
                      <Pressable style={styles.backdropThumb} onPress={() => onPick(item)}>
                        <Image
                          source={{ uri: sized(item, "w300") ?? item }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      </Pressable>
                    )}
                  />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
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
    gap: spacing.md,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  list: { gap: spacing.lg, paddingBottom: spacing.md },
  source: { gap: spacing.sm },
  row: { gap: spacing.md },
  character: { width: 78, alignItems: "center", gap: 2 },
  characterPhoto: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
    marginBottom: 4,
  },
  center: { textAlign: "center" },
  backdropThumb: {
    width: 176,
    height: 99,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    overflow: "hidden",
  },
});
