import "./local-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

// Adrese yanlışlıkla "/rest/v1/" gibi bir yol eklenmişse atıp yalnızca kök adresi kullanır.
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const url = /^https?:\/\//.test(rawUrl) ? new URL(rawUrl).origin : rawUrl;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = url.length > 0 && key.length > 0;

// Oturum cihazda saklanır (expo-sqlite localStorage), uygulama açılınca devam eder.
export const supabase = createClient(url || "http://localhost", key || "missing", {
  auth: {
    // Web sunucu tarafında (SSR) localStorage yoktur; orada oturum bellekte tutulur.
    storage: typeof localStorage === "undefined" ? undefined : localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
