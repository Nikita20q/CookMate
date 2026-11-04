import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isSessionValid, readSession } from "@/lib/session";

type SessionStatus = "anonymous" | "authenticated" | "expired";

function sessionState(token: string | null): { accessToken: string | null; status: SessionStatus } {
  if (!token) return { accessToken: null, status: "anonymous" };
  return isSessionValid(token)
    ? { accessToken: token, status: "authenticated" }
    : { accessToken: null, status: "expired" };
}

interface AuthState {
  accessToken: string | null;
  status: SessionStatus;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
  expireSession: (token: string) => void;
  isAuthenticated: () => boolean;
  getUserId: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...sessionState(null),
      setAccessToken: (token) => set(sessionState(token)),
      clearAuth: () => set(sessionState(null)),
      expireSession: (token) => {
        if (get().accessToken === token) set({ accessToken: null, status: "expired" });
      },
      isAuthenticated: () => isSessionValid(get().accessToken),
      getUserId: () => isSessionValid(get().accessToken)
        ? readSession(get().accessToken)!.userId : null,
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ accessToken: state.accessToken }),
      merge: (persisted, current) => {
        const token = (persisted as { accessToken?: unknown } | undefined)?.accessToken;
        return { ...current, ...sessionState(typeof token === "string" ? token : null) };
      },
    },
  ),
);

let expiryTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleExpiry() {
  clearTimeout(expiryTimer);
  const token = useAuthStore.getState().accessToken;
  const session = readSession(token);
  if (!token || !session) return;
  const remaining = session.expiresAt - Date.now();
  if (remaining <= 0) {
    useAuthStore.getState().expireSession(token);
  } else {
    expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining, 2_147_483_647));
  }
}
useAuthStore.subscribe(scheduleExpiry);
scheduleExpiry();

export const getAccessToken = (): string | null => {
  const token = useAuthStore.getState().accessToken;
  return isSessionValid(token) ? token : null;
};
