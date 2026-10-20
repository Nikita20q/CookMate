import { describe, expect, it } from "vitest";
import { getAccessToken, useAuthStore } from "@/store/auth";
import { token } from "./fixtures";

describe("Хранилище авторизации", () => {
  it("считает гостя неавторизованным", () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    expect(useAuthStore.getState().getUserId()).toBeNull();
  });

  it("сохраняет токен и извлекает ID пользователя", () => {
    useAuthStore.getState().setAccessToken(token("27"));
    expect(getAccessToken()).toBe(token("27"));
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    expect(useAuthStore.getState().getUserId()).toBe("27");
  });

  it("сохраняет авторизацию между перезагрузками", async () => {
    useAuthStore.getState().setAccessToken(token());
    useAuthStore.setState({ accessToken: null });
    localStorage.setItem(
      "auth-storage",
      JSON.stringify({ state: { accessToken: token() }, version: 0 }),
    );
    await useAuthStore.persist.rehydrate();
    expect(getAccessToken()).toBe(token());
  });

  it("удаляет токен при выходе", () => {
    useAuthStore.getState().setAccessToken(token());
    useAuthStore.getState().clearAuth();
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().getUserId()).toBeNull();
  });

  it.each([
    "сломанный-токен",
    "header.%%%%.signature",
    token("abc"),
    token("0"),
  ])("отклоняет некорректный токен: %s", (value) => {
    useAuthStore.getState().setAccessToken(value);
    expect(useAuthStore.getState().getUserId()).toBeNull();
  });
});
