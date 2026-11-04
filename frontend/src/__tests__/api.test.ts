import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import apiClient from "@/api/apiClient";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { useAuthStore } from "@/store/auth";
import { recipe, token } from "./fixtures";

const originalAdapter = apiClient.defaults.adapter;
let requests: InternalAxiosRequestConfig[];

beforeEach(() => {
  requests = [];
  apiClient.defaults.adapter = async (config) => {
    requests.push(config);
    return {
      data: { recipeNumber: 1, recipes: [recipe] },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.useRealTimers();
});

describe("Запросы к API", () => {
  it("передаёт Bearer-токен авторизованного пользователя", async () => {
    useAuthStore.getState().setAccessToken(token());
    await favoritesApi.getAll("1");
    expect(requests[0].headers.Authorization).toBe(`Bearer ${token()}`);
  });

  it("не передаёт авторизацию гостя", async () => {
    await recipesApi.getBySlug(recipe.slug);
    expect(requests[0].headers.Authorization).toBeUndefined();
  });

  it("отправляет email и пароль при входе", async () => {
    await authApi.login("cook@example.com", "password");
    expect(requests[0].url).toBe("/auth/login");
    expect(JSON.parse(requests[0].data)).toEqual({
      email: "cook@example.com",
      password: "password",
    });
  });

  it("отправляет код подтверждения почты", async () => {
    await authApi.verifyEmail("cook@example.com", "123456");
    expect(JSON.parse(requests[0].data)).toEqual({
      email: "cook@example.com",
      code: "123456",
    });
  });

  it("отправляет ингредиенты для поиска рецептов", async () => {
    await recipesApi.findByIngredients(["яйцо", "сыр"]);
    expect(requests[0].url).toBe("/recipes/search");
    expect(JSON.parse(requests[0].data)).toEqual({
      ingredients: ["яйцо", "сыр"],
    });
  });

  it("передаёт фотографию как multipart с полем file", async () => {
    const file = new File(["photo"], "fridge.jpg", { type: "image/jpeg" });
    await recipesApi.recognize(file);
    expect(requests[0].url).toBe("/recipes/recognize");
    expect(requests[0].data).toBeInstanceOf(FormData);
    expect(requests[0].data.get("file")).toBe(file);
  });

  it("запрашивает детальный рецепт по slug", async () => {
    await recipesApi.getBySlug(recipe.slug);
    expect(requests[0].url).toBe(`/recipes/recipe/${recipe.slug}`);
  });

  it("получает, добавляет и удаляет избранное по контракту Swagger", async () => {
    const response = await favoritesApi.getAll("1");
    await favoritesApi.add("1", 42);
    await favoritesApi.remove("1", 42);
    expect(response).toEqual({ recipeNumber: 1, recipes: [recipe] });
    expect(
      requests.map((request) => [request.method, request.url, request.params]),
    ).toEqual([
      ["get", "/favorites", { userId: "1" }],
      ["post", "/favorites/42", { userId: "1" }],
      ["delete", "/favorites/42", { userId: "1" }],
    ]);
  });

  it("не отправляет запрос с истёкшим токеном и завершает сессию", async () => {
    vi.useFakeTimers();
    const exp = Math.floor(Date.now() / 1000) + 5;
    useAuthStore.getState().setAccessToken(token("1", exp));
    vi.setSystemTime(exp * 1000);
    await expect(favoritesApi.add("1", 42)).rejects.toMatchObject({ code: "ERR_SESSION_EXPIRED" });
    expect(requests).toHaveLength(0);
    expect(useAuthStore.getState().status).toBe("expired");
  });

  it.each([401, 403, 500])("обрабатывает HTTP %s централизованно", async (status) => {
    useAuthStore.getState().setAccessToken(token());
        apiClient.defaults.adapter = async (config) => {
      const rejected = new AxiosError("HTTP error", "ERR_BAD_REQUEST", config, undefined,
        { status, statusText: "Error", data: {}, headers: {}, config });
      throw rejected;
    };
    await expect(favoritesApi.add("1", 42)).rejects.toMatchObject({ response: { status } });
    expect(useAuthStore.getState().status).toBe(status === 401 ? "expired" : "authenticated");
    expect(useAuthStore.getState().accessToken).toBe(status === 401 ? null : token());
  });

  it("401 от старого запроса не завершает новую сессию", async () => {
    useAuthStore.getState().setAccessToken(token("1"));
    apiClient.defaults.adapter = async (config) => {
      useAuthStore.getState().setAccessToken(token("2"));
      throw new AxiosError("Old session", "ERR_BAD_REQUEST", config, undefined,
        { status: 401, statusText: "Unauthorized", data: {}, headers: {}, config });
    };
    await expect(favoritesApi.getAll("1")).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore.getState().getUserId()).toBe("2");
  });

  it("401 при входе не сбрасывает сессию и не добавляет Bearer", async () => {
    useAuthStore.getState().setAccessToken(token());
    apiClient.defaults.adapter = async (config) => {
      expect(config.headers.Authorization).toBeUndefined();
      throw new AxiosError("Bad credentials", "ERR_BAD_REQUEST", config, undefined,
        { status: 401, statusText: "Unauthorized", data: {}, headers: {}, config });
    };
    await expect(authApi.login("cook@example.com", "wrong")).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore.getState().status).toBe("authenticated");
  });

  it("передаёт сетевую ошибку вызывающему коду", async () => {
    const error = new AxiosError("Нет сети");
    apiClient.defaults.adapter = vi.fn().mockRejectedValue(error);
    await expect(recipesApi.findByIngredients(["яйцо"])).rejects.toBe(error);
  });
});
