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
    await favoritesApi.getAll();
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
    const response = await favoritesApi.getAll();
    await favoritesApi.add(42);
    await favoritesApi.remove(42);
    expect(response).toEqual({ recipeNumber: 1, recipes: [recipe] });
    expect(
      requests.map((request) => [request.method, request.url, request.params]),
    ).toEqual([
      ["get", "/favorites", undefined],
      ["post", "/favorites/42", undefined],
      ["delete", "/favorites/42", undefined],
    ]);
  });

  it("передаёт истёкший токен серверу и завершает сессию после 401", async () => {
    const expiredToken = token("1", 1);
    useAuthStore.getState().setAccessToken(expiredToken);
    apiClient.defaults.adapter = async (config) => {
      requests.push(config);
      throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, undefined,
        { status: 401, statusText: "Unauthorized", data: {}, headers: {}, config });
    };
    expect(useAuthStore.getState().status).toBe("authenticated");
    await expect(favoritesApi.add(42)).rejects.toMatchObject({ response: { status: 401 } });
    expect(requests).toHaveLength(1);
    expect(requests[0].headers.Authorization).toBe(`Bearer ${expiredToken}`);
    expect(useAuthStore.getState().status).toBe("expired");
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(JSON.parse(localStorage.getItem("auth-storage")!).state.accessToken).toBeNull();
  });

  it.each([401, 403, 500])("обрабатывает HTTP %s централизованно", async (status) => {
    useAuthStore.getState().setAccessToken(token());
        apiClient.defaults.adapter = async (config) => {
      const rejected = new AxiosError("HTTP error", "ERR_BAD_REQUEST", config, undefined,
        { status, statusText: "Error", data: {}, headers: {}, config });
      throw rejected;
    };
    await expect(favoritesApi.add(42)).rejects.toMatchObject({ response: { status } });
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
    await expect(favoritesApi.getAll()).rejects.toBeInstanceOf(AxiosError);
    expect(useAuthStore.getState().accessToken).toBe(token("2"));
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
