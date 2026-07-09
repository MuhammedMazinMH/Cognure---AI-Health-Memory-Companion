// Session context for the mobile app.
// The web app reads the Supabase session via cookies on every page; on native
// we hold it in a context fed by supabase.auth.onAuthStateChange so every
// screen can read auth state without re-fetching.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

interface SessionContextValue {
  session: Session | null;
  // True while the initial session is being restored from AsyncStorage.
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    // Restore any persisted session on launch.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Stay in sync with sign-in / sign-out / token refresh events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
