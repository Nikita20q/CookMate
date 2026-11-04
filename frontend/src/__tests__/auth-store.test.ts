import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessToken, useAuthStore } from "@/store/auth";
import { token } from "./fixtures";

afterEach(() => vi.useRealTimers());

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

  it("завершает сессию по exp без HTTP-запросов", () => {
    vi.useFakeTimers();
    const exp = Math.floor(Date.now() / 1000) + 5;
    useAuthStore.getState().setAccessToken(token("1", exp));
    vi.advanceTimersByTime(5000);
    expect(useAuthStore.getState().status).toBe("expired");
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().getUserId()).toBeNull();
    expect(JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken).toBeNull();
  });

  it("отклоняет истёкший токен из localStorage", async () => {
    localStorage.setItem("auth-storage", JSON.stringify({
      state: { accessToken: token("1", 1) }, version: 0,
    }));
    await useAuthStore.persist.rehydrate();
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().status).toBe("expired");
  });

  it.each([undefined, "4000000000", null, 0])("отклоняет отсутствующий или неверный exp: %s", (exp) => {
    const value = `header.${btoa(JSON.stringify({ sub: "1", exp }))}.signature`;
    useAuthStore.getState().setAccessToken(value);
    expect(getAccessToken()).toBeNull();
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
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
