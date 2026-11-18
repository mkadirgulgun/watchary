import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/app-text";
import { Button } from "@/components/button";
import { ProgressBar } from "@/components/progress-bar";
import { colors, radius, spacing } from "@/constants/theme";
import {
  ImportRow,
  matchRows,
  pickCsvFiles,
  rowsFromFiles,
} from "@/lib/import";
import { useStore } from "@/lib/store";

type Props = { onDone?: (added: number) => void };

/** Letterboxd CSV dosyalarını seçtirip izlenen filmleri içe aktarır. */
export function ImportPanel({ onDone }: Props) {
  const importMovies = useStore((s) => s.importMovies);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ added: number; missed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async () => {
    setError(null);
    setResult(null);
    try {
      const files = await pickCsvFiles();
      if (files.length === 0) return;
      const parsed = rowsFromFiles(files);
      if (parsed.length === 0) {
        setError("Dosyada film bulunamadı. Letterboxd'dan indirdiğin watched.csv, ratings.csv ya da diary.csv dosyasını seç.");
        return;
      }
      setFileNames(files.map((f) => f.name));
      setRows(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dosya okunamadı.");
    }
  };

  const run = async () => {
    if (!rows) return;
    setError(null);
    setProgress({ done: 0, total: Math.min(rows.length, 600) });
    try {
      const { matched, missed } = await matchRows(rows, (done, total) =>
        setProgress({ done, total }),
      );
      const added = importMovies(matched);
      setResult({ added, missed });
      setRows(null);
      onDone?.(added);
    } catch (e) {
      setError(e instanceof Error ? e.message : "İçe aktarma başarısız.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="film-outline" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title">Letterboxd</AppText>
          <AppText variant="caption">
            Film günlüğünü ve puanlarını CSV dosyasından getir
          </AppText>
        </View>
      </View>

      <AppText variant="bodySmall">
        Letterboxd → Ayarlar → Veri → “Verilerini dışa aktar” ile indirdiğin ZIP dosyasını aç, içinden
        watched.csv, ratings.csv veya diary.csv dosyasını seç (birden fazla seçebilirsin).
      </AppText>

      {!progress && !rows && (
        <Button icon="document-attach-outline" label="CSV Dosyası Seç" variant="secondary" onPress={pick} />
      )}

      {rows && !progress && (
        <>
          <View style={styles.found}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <AppText variant="label" style={{ flex: 1 }}>
              {rows.length} film bulundu {fileNames.length ? `(${fileNames.join(", ")})` : ""}
            </AppText>
          </View>
          {rows.length > 600 && (
            <AppText variant="caption">
              İlk 600 film aktarılacak. Kalanı için içe aktarmayı tekrar çalıştırabilirsin.
            </AppText>
          )}
          <Button icon="cloud-download-outline" label={`${Math.min(rows.length, 600)} Filmi İçe Aktar`} onPress={run} />
        </>
      )}

      {progress && (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="label">
            Eşleştiriliyor... {progress.done}/{progress.total}
          </AppText>
          <ProgressBar progress={progress.total ? progress.done / progress.total : 0} />
        </View>
      )}

      {result && (
        <View style={styles.found}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <AppText variant="label" style={{ flex: 1 }}>
            {result.added} film eklendi
            {result.missed > 0 ? `, ${result.missed} film eşleşmedi` : ""}.
          </AppText>
        </View>
      )}
      {error && <AppText variant="bodySmall" color={colors.danger}>{error}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
  },
  found: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
