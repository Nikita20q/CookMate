import { describe, expect, it } from "vitest";
import { getAccessToken, useAuthStore } from "@/store/auth";

describe("Хранилище авторизации", () => {
  it("считает гостя неавторизованным", () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    expect(getAccessToken()).toBeNull();
  });

  it("сохраняет токен без разбора его содержимого", () => {
    useAuthStore.getState().setAccessToken("opaque-access-token");
    expect(getAccessToken()).toBe("opaque-access-token");
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("сохраняет авторизацию между перезагрузками", async () => {
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { accessToken: "opaque-access-token" }, version: 0 }),
    );
    await useAuthStore.persist.rehydrate();
    expect(getAccessToken()).toBe("opaque-access-token");
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("игнорирует сохранённое значение неверного типа", async () => {
    localStorage.setItem("auth-storage", JSON.stringify({
      state: { accessToken: 42 }, version: 0,
    }));
    await useAuthStore.persist.rehydrate();
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe("anonymous");
  });

  it("удаляет токен при выходе", () => {
    useAuthStore.getState().setAccessToken("opaque-access-token");
    useAuthStore.getState().clearAuth();
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    expect(useAuthStore.getState().status).toBe("anonymous");
  });
});
