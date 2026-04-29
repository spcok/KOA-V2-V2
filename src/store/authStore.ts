import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  setSession: (session: Session | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false,
  setSession: (session) => set({ session, user: session?.user || null }),
  
  initialize: async () => {
    // Await the local storage session before allowing the app to boot
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, user: data.session?.user || null, isInitialized: true });

    // Listen for future login/logout events
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user || null });
    });
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  }
}));
