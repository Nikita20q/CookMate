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

  it("передаёт сетевую ошибку вызывающему коду", async () => {
    const error = new AxiosError("Нет сети");
    apiClient.defaults.adapter = vi.fn().mockRejectedValue(error);
    await expect(recipesApi.findByIngredients(["яйцо"])).rejects.toBe(error);
  });
});
