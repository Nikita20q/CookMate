import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionStatus = "anonymous" | "authenticated" | "expired";

function sessionState(token: string | null): {
  accessToken: string | null;
  status: SessionStatus;
} {
  return token
    ? { accessToken: token, status: "authenticated" }
    : { accessToken: null, status: "anonymous" };
}

interface AuthState {
  accessToken: string | null;
  status: SessionStatus;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  expireSession: (token: string) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...sessionState(null),
      setAccessToken: (token) => set(sessionState(token)),
      clearAuth: () => set(sessionState(null)),
      expireSession: (token) => {
        if (get().accessToken === token)
          set({ accessToken: null, status: "expired" });
      },
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ accessToken: state.accessToken }),
      merge: (persisted, current) => {
        const token = (persisted as { accessToken?: unknown } | undefined)
          ?.accessToken;
        return {
          ...current,
          ...sessionState(typeof token === "string" ? token : null),
        };
      },
    },
  ),
);

export const getAccessToken = (): string | null =>
  useAuthStore.getState().accessToken;
