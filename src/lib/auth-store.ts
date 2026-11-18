import { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  /** Kayıtlı oturum okunana kadar false */
  ready: boolean;
  /** Giriş yapıldıysa, buluttaki veri çekilene kadar false */
  synced: boolean;
};

export const useAuth = create<AuthState>(() => ({ session: null, ready: false, synced: false }));

supabase.auth.getSession().then(({ data }) => {
  useAuth.setState({ session: data.session, ready: true });
});
supabase.auth.onAuthStateChange((_event, session) => {
  useAuth.setState({ session, ready: true });
});
