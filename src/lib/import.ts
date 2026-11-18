import * as DocumentPicker from "expo-document-picker";

import { searchMovieByTitle } from "./tmdb";
import { MediaRef } from "./types";

export type PickedFile = { name: string; text: string };

export type ImportRow = {
  name: string;
  year: string;
  rating: number | null;
  watchedAt: number;
};

export type MatchedMovie = {
  ref: MediaRef;
  rating: number | null;
  watchedAt: number;
};

/** Kullanıcıdan bir ya da birden çok CSV dosyası seçtirir ve metnini okur. */
export async function pickCsvFiles(): Promise<PickedFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel", "text/plain"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  const files: PickedFile[] = [];
  for (const asset of result.assets) {
    const text = asset.file
      ? await asset.file.text()
      : await (await fetch(asset.uri)).text();
    files.push({ name: asset.name, text });
  }
  return files;
}

/** Tırnaklı alanları destekleyen küçük CSV ayrıştırıcı. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c !== "")) rows.push(row);

  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = r[i] ?? ""));
    return obj;
  });
}

/** Letterboxd'ın watched / ratings / diary CSV'lerini ortak satırlara çevirir. */
export function rowsFromFiles(files: PickedFile[]): ImportRow[] {
  const merged = new Map<string, ImportRow>();

  for (const file of files) {
    for (const r of parseCsv(file.text)) {
      const name = (r["Name"] ?? "").trim();
      if (!name) continue;
      const year = (r["Year"] ?? "").trim();
      const key = `${name.toLowerCase()}|${year}`;

      const ratingRaw = parseFloat(r["Rating"] ?? "");
      const rating = Number.isFinite(ratingRaw) && ratingRaw > 0 ? ratingRaw : null;
      const dateStr = (r["Watched Date"] || r["Date"] || "").trim();
      const parsed = dateStr ? new Date(dateStr).getTime() : NaN;
      const watchedAt = Number.isFinite(parsed) ? parsed : Date.now();

      const prev = merged.get(key);
      merged.set(key, {
        name,
        year,
        rating: rating ?? prev?.rating ?? null,
        // Günlükteki tarih varsa onu, yoksa daha önceki değeri koru.
        watchedAt: r["Watched Date"] ? watchedAt : (prev?.watchedAt ?? watchedAt),
      });
    }
  }
  return [...merged.values()];
}

/** Satırları TMDB'de arayıp eşleştirir. Her 6 satırda bir ilerleme bildirir. */
export async function matchRows(
  rows: ImportRow[],
  onProgress: (done: number, total: number) => void,
  limit = 600,
): Promise<{ matched: MatchedMovie[]; missed: number }> {
  const list = rows.slice(0, limit);
  const matched: MatchedMovie[] = [];
  let missed = 0;
  let done = 0;

  const BATCH = 6;
  for (let i = 0; i < list.length; i += BATCH) {
    const slice = list.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (row) => {
        try {
          return await searchMovieByTitle(row.name, row.year || undefined);
        } catch {
          return null;
        }
      }),
    );
    results.forEach((ref, idx) => {
      if (ref) matched.push({ ref, rating: slice[idx].rating, watchedAt: slice[idx].watchedAt });
      else missed += 1;
    });
    done += slice.length;
    onProgress(done, list.length);
  }
  return { matched, missed };
}
