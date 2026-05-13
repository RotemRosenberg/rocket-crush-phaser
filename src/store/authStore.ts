import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthStore {
  user: User | null;
  username: string | null;
  isLoading: boolean;
  needsUsername: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveUsername: (name: string) => Promise<void>;
  init: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  username: null,
  isLoading: true,
  needsUsername: false,

  init() {
    // Restore session on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await resolveUser(session.user, set);
      } else {
        set({ isLoading: false });
      }
    });

    // Keep state in sync with Supabase auth events
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await resolveUser(session.user, set);
      } else {
        set({ user: null, username: null, needsUsername: false, isLoading: false });
      }
    });
  },

  async signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  },

  async signOut() {
    await supabase.auth.signOut();
  },

  async saveUsername(name: string) {
    const user = get().user;
    if (!user) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const { error } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, username: trimmed });

    if (error) throw new Error(error.message);

    set({ username: trimmed, needsUsername: false });
  },
}));

async function resolveUser(
  user: User,
  set: (partial: Partial<AuthStore>) => void,
): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .single();

  if (data?.username) {
    set({ user, username: data.username, needsUsername: false, isLoading: false });
  } else {
    set({ user, username: null, needsUsername: true, isLoading: false });
  }
}
