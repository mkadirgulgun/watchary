import { useEffect } from "react";

import { useAuth } from "./auth-store";
import { ensureProfile, reviewToRow } from "./community";
import { supabase } from "./supabase";
import { Review, useStore } from "./store";

const PUSH_DELAY_MS = 1500;

/** Depodaki veriyi (fonksiyonlar ve cihaza özel alanlar hariç) buluta gidecek hâle getirir. */
function snapshot(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(useStore.getState())) {
    if (typeof v === "function" || k === "ownerId") continue;
    out[k] = v;
  }
  return out;
}

let pendingFlush: (() => Promise<void>) | null = null;
let suspended = false;

/** Bekleyen değişiklik varsa hemen buluta yazar (çıkış yapmadan önce çağrılır). */
export async function flushCloudSync(): Promise<void> {
  await pendingFlush?.();
}

/** Çıkış sırasında cihazı temizlerken buluttaki verinin silinmemesi için senkronu durdurur. */
export function suspendCloudSync(): void {
  suspended = true;
}

/** Yeni eklenen yorumları yazar, silinenleri buluttan kaldırır. */
async function syncReviewChanges(uid: string, prev: Review[], cur: Review[]) {
  const prevIds = new Set(prev.map((r) => r.id));
  const curIds = new Set(cur.map((r) => r.id));
  const added = cur.filter((r) => !prevIds.has(r.id));
  const removed = prev.filter((r) => !curIds.has(r.id)).map((r) => r.id);
  if (added.length > 0) {
    const { error } = await supabase.from("reviews").upsert(added.map((r) => reviewToRow(r, uid)));
    if (error) console.warn("Yorum yazılamadı:", error.message);
  }
  if (removed.length > 0) {
    const { error } = await supabase.from("reviews").delete().eq("user_id", uid).in("id", removed);
    if (error) console.warn("Yorum silinemedi:", error.message);
  }
}

/**
 * Giriş yapılınca buluttaki kütüphaneyi çeker, sonra yerel değişiklikleri
 * kısa bir gecikmeyle buluta yazar. Bulut okunamazsa yazma kapalı kalır,
 * böylece boş veri buluttakini ezmez.
 */
export function useCloudSync() {
  const uid = useAuth((s) => s.session?.user.id ?? null);

  useEffect(() => {
    if (!uid) {
      useAuth.setState({ synced: false });
      return;
    }
    suspended = false;
    let cancelled = false;
    let ready = false;
    let applying = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let dirty = false;

    const push = async () => {
      if (!ready || !dirty || suspended) return;
      dirty = false;
      clearTimeout(timer);
      const { error } = await supabase
        .from("library")
        .upsert({ user_id: uid, data: snapshot(), updated_at: new Date().toISOString() });
      if (error) {
        dirty = true;
        console.warn("Bulut kaydı başarısız:", error.message);
      }
    };
    pendingFlush = push;

    const unsubscribe = useStore.subscribe((state, prevState) => {
      if (!ready || applying || cancelled || suspended) return;
      if (state.reviews !== prevState.reviews) {
        void syncReviewChanges(uid, prevState.reviews, state.reviews);
      }
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(push, PUSH_DELAY_MS);
    });

    (async () => {
      useAuth.setState({ synced: false });
      const local = useStore.getState();
      // Cihazda başka bir hesabın verisi kaldıysa temizle.
      if (local.ownerId && local.ownerId !== uid) local.resetAll();

      const { data, error } = await supabase
        .from("library")
        .select("data")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled) return;

      if (error) {
        console.warn("Bulut okunamadı:", error.message);
        useAuth.setState({ synced: true });
        return;
      }

      applying = true;
      const remote = data?.data as Record<string, unknown> | undefined;
      if (remote && Object.keys(remote).length > 0) {
        useStore.setState({ ...remote, ownerId: uid });
      } else {
        // Bulutta kayıt yok: cihazdaki veri bu hesaba aittir ve yüklenir.
        useStore.setState({ ownerId: uid });
        ready = true;
        dirty = true;
        await push();
      }

      // Herkese açık profil ve yorumlar (eski kayıtlar dahil) yoksa oluşturulur.
      await ensureProfile(uid);
      const mine = useStore.getState().reviews;
      if (mine.length > 0) {
        const { error: backfillError } = await supabase
          .from("reviews")
          .upsert(mine.map((r) => reviewToRow(r, uid)), { onConflict: "id", ignoreDuplicates: true });
        if (backfillError) console.warn("Yorumlar yüklenemedi:", backfillError.message);
      }
      if (cancelled) return;

      applying = false;
      ready = true;
      useAuth.setState({ synced: true });
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe();
      pendingFlush = null;
    };
  }, [uid]);
}
