import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  getUserId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,

      setAccessToken: (token) => set({ accessToken: token }),

      clearAuth: () => set({ accessToken: null }),

      isAuthenticated: () => get().accessToken !== null,

      getUserId: () => {
        const token = get().accessToken;
        if (!token) return null;

        try {
          const payload = token.split(".")[1];
          const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
          const { sub } = JSON.parse(atob(base64));
          return typeof sub === "string" && /^[1-9]\d*$/.test(sub) ? sub : null;
        } catch {
          return null;
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ accessToken: state.accessToken }),
    },
  ),
);

export const getAccessToken = (): string | null => {
  return useAuthStore.getState().accessToken;
};
