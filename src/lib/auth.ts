import { useAuth } from "./auth-store";
import { useStore } from "./store";
import { supabase } from "./supabase";
import { clearNotifications } from "./notifications";
import { clearSocial } from "./social";
import { flushCloudSync, suspendCloudSync } from "./sync";

export { useAuth };

/** Supabase hata mesajlarını Türkçeye çevirir. */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "E-posta ya da şifre hatalı.";
  if (m.includes("already registered")) return "Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.";
  if (m.includes("at least")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("not confirmed")) return "E-postanı onaylaman gerekiyor. Gelen kutunu kontrol et.";
  if (m.includes("rate limit")) return "Çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.";
  if (m.includes("valid email") || m.includes("invalid email")) return "Geçerli bir e-posta gir.";
  if (m.includes("network") || m.includes("fetch")) return "Bağlantı kurulamadı. İnternetini kontrol et.";
  return message;
}

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  return error ? friendly(error.message) : null;
}

/** Hata mesajı ya da, e-posta onayı gerekiyorsa "confirm" döner; başarılıysa null. */
export async function signUp(email: string, password: string): Promise<string | null> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) return friendly(error.message);
  // E-posta onayı açıksa Supabase, kayıtlı bir adres için hata vermez; kimlik listesi boş döner.
  if (data.user && data.user.identities?.length === 0) {
    return "Bu e-posta ile zaten bir hesap var. “Giriş yap” ile devam et.";
  }
  return data.session ? null : "confirm";
}

export async function signOut(): Promise<void> {
  await flushCloudSync();
  suspendCloudSync();
  await supabase.auth.signOut();
  // Başka hesaba geçilirse eski verinin kalmaması için cihazdaki kopyayı temizle.
  useStore.getState().resetAll();
  useStore.setState({ ownerId: null });
  clearSocial();
  clearNotifications();
}
