import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Songwriter } from '@musicpub/types';

interface AuthState {
  user: User | null;
  songwriter: Songwriter | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, songwriter: Songwriter, accessToken: string, refreshToken: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      songwriter: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, songwriter, accessToken, refreshToken) =>
        set({
          user,
          songwriter,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        }),
      setAccessToken: (token) => set({ accessToken: token }),
      logout: () =>
        set({
          user: null,
          songwriter: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'songwriter-auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        songwriter: state.songwriter,
      }),
    }
  )
);
