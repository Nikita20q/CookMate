import { act, screen, waitFor, within } from "@testing-library/react";
import apiClient from "@/api/apiClient";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { authResponse } from "./fixtures";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { useAuthStore } from "@/store/auth";
import { recipe, secondRecipe, token } from "./fixtures";
import { deferred, renderApp } from "./helpers";
import type { GetFavoritesResponse } from "@/api/favorites/types";

beforeEach(() => {
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({
    recipeNumber: 0,
    recipes: [],
  });
  vi.spyOn(favoritesApi, "add").mockResolvedValue();
  vi.spyOn(favoritesApi, "remove").mockResolvedValue();
});

describe("Страница избранного", () => {
  it("предлагает гостю войти и не запрашивает личные рецепты", async () => {
    await renderApp("/favorites");
    expect(screen.getByText("Сохраняйте любимые рецепты")).toBeVisible();
    expect(favoritesApi.getAll).not.toHaveBeenCalled();
  });

  it("показывает загрузку до получения списка", async () => {
    useAuthStore.getState().setAccessToken(token());
    const response = deferred<GetFavoritesResponse>();
    vi.mocked(favoritesApi.getAll).mockReturnValue(response.promise);
    await renderApp("/favorites");
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем избранное");
    await act(async () => response.resolve({ recipeNumber: 0, recipes: [] }));
    expect(
      await screen.findByText("Здесь будут ваши любимые рецепты"),
    ).toBeVisible();
  });

  it("отображает пустую коллекцию и ссылку на подбор", async () => {
    useAuthStore.getState().setAccessToken(token());
    await renderApp("/favorites");
    expect(
      await screen.findByText("Здесь будут ваши любимые рецепты"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Подобрать рецепты" }),
    ).toHaveAttribute("href", "/recipes");
  });

  it("отображает карточки, количество и ссылки на детали", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(favoritesApi.getAll).mockResolvedValue({
      recipeNumber: 2,
      recipes: [recipe, secondRecipe],
    });
    await renderApp("/favorites");
    expect(await screen.findByText(recipe.title)).toBeVisible();
    expect(screen.getByText("Сохранено: 2")).toBeVisible();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(
      screen.getByRole("link", { name: new RegExp(recipe.title) }),
    ).toHaveAttribute("href", `/recipes/${recipe.slug}`);
  });

  it("удаляет выбранный рецепт после ответа сервера", async () => {
    useAuthStore.getState().setAccessToken(token());
    let saved = [recipe, secondRecipe];
    vi.mocked(favoritesApi.getAll).mockImplementation(async () => ({
      recipeNumber: saved.length,
      recipes: saved,
    }));
    vi.mocked(favoritesApi.remove).mockImplementation(async (_userId, id) => {
      saved = saved.filter((item) => item.id !== id);
    });
    const { user } = await renderApp("/favorites");
    await screen.findByText(recipe.title);
    const card = screen.getByText(recipe.title).closest("article")!;
    await user.click(
      within(card).getByRole("button", { name: "Удалить из избранного" }),
    );
    await waitFor(() =>
      expect(screen.queryByText(recipe.title)).not.toBeInTheDocument(),
    );
    expect(screen.getByText(secondRecipe.title)).toBeVisible();
    expect(screen.getByText("Сохранено: 1")).toBeVisible();
    expect(favoritesApi.remove).toHaveBeenCalledWith("1", recipe.id);
  });

  it("сохраняет карточку при ошибке удаления и предлагает повторить", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(favoritesApi.getAll).mockResolvedValue({
      recipeNumber: 1,
      recipes: [recipe],
    });
    vi.mocked(favoritesApi.remove).mockRejectedValue(new Error("Нет сети"));
    const { user } = await renderApp("/favorites");
    await user.click(
      await screen.findByRole("button", { name: "Удалить из избранного" }),
    );
    expect(
      await screen.findByRole("button", {
        name: "Не удалось изменить избранное. Повторить",
      }),
    ).toBeVisible();
    expect(screen.getByText(recipe.title)).toBeVisible();
  });

  it("повторяет загрузку после сетевой ошибки", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(favoritesApi.getAll)
      .mockRejectedValueOnce(new Error("Нет сети"))
      .mockResolvedValue({ recipeNumber: 1, recipes: [recipe] });
    const { user } = await renderApp("/favorites");
    await user.click(await screen.findByRole("button", { name: "Повторить" }));
    expect(await screen.findByText(recipe.title)).toBeVisible();
  });

  it("предлагает повторный вход при ответе 401", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(favoritesApi.getAll).mockRestore();
    const adapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = async (config) => {
      throw new AxiosError("Сессия истекла", "ERR_BAD_REQUEST", config, undefined,
        { status: 401, statusText: "Unauthorized", data: {}, headers: {}, config });
    };
    try {
      await renderApp("/favorites");
      expect(await screen.findByRole("link", { name: "Войти в аккаунт" })).toBeVisible();
      expect(useAuthStore.getState().status).toBe("expired");
      expect(screen.queryByRole("button", { name: "Выйти" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Войти снова" })).toBeVisible();
    } finally {
      apiClient.defaults.adapter = adapter;
    }
  });

  it("при 403 показывает отказ в доступе и сохраняет сессию", async () => {
    useAuthStore.getState().setAccessToken(token());
    const error = new AxiosError("Доступ запрещён");
    error.response = { status: 403 } as AxiosError["response"];
    vi.mocked(favoritesApi.getAll).mockRejectedValue(error);
    await renderApp("/favorites");
    expect(await screen.findByText("Нет доступа к избранному")).toBeVisible();
    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(screen.getByRole("button", { name: "Выйти" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Войти в аккаунт" })).not.toBeInTheDocument();
  });

  it("не показывает коллекцию предыдущего пользователя после смены аккаунта", async () => {
    useAuthStore.getState().setAccessToken(token("1"));
    vi.mocked(favoritesApi.getAll).mockImplementation(async (id) => ({
      recipeNumber: 1,
      recipes: [id === "1" ? recipe : secondRecipe],
    }));
    await renderApp("/favorites");
    await screen.findByText(recipe.title);
    await act(async () => useAuthStore.getState().setAccessToken(token("2")));
    expect(await screen.findByText(secondRecipe.title)).toBeVisible();
    expect(screen.queryByText(recipe.title)).not.toBeInTheDocument();
    expect(favoritesApi.getAll).toHaveBeenCalledWith("2");
  });
});

describe("Лайки в списке рецептов", () => {
  it("отправляет гостя на страницу входа", async () => {
    vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
      recipeCount: 1,
      recipes: [recipe],
      recognizedIngredients: ["яйцо"],
    });
    const { useIngredientsStore } = await import("@/store/ingredients");
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const { user, router } = await renderApp("/recipes");
    await user.click(
      await screen.findByRole("button", {
        name: "Войдите, чтобы сохранить рецепт",
      }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/auth/login"),
    );
    expect(favoritesApi.add).not.toHaveBeenCalled();
    expect(router.state.location.search).toMatchObject({ returnTo: "/recipes" });
    vi.spyOn(authApi, "login").mockResolvedValue(authResponse);
    await user.type(screen.getByPlaceholderText("Электронная почта"), "cook@example.com");
    await user.type(screen.getByPlaceholderText("Пароль"), "password");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/recipes"));
    const save = await screen.findByRole("button", { name: "Сохранить рецепт" });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    await waitFor(() => expect(favoritesApi.add).toHaveBeenCalledWith("1", recipe.id));
  });

  it("добавляет рецепт одним запросом и синхронизирует страницу избранного", async () => {
    useAuthStore.getState().setAccessToken(token());
    const { useIngredientsStore } = await import("@/store/ingredients");
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
      recipeCount: 1,
      recipes: [recipe],
      recognizedIngredients: ["яйцо"],
    });
    let saved = false;
    const response = deferred<void>();
    vi.mocked(favoritesApi.getAll).mockImplementation(async () => ({
      recipeNumber: saved ? 1 : 0,
      recipes: saved ? [recipe] : [],
    }));
    vi.mocked(favoritesApi.add).mockImplementation(async () => {
      await response.promise;
      saved = true;
    });
    const { user } = await renderApp("/recipes");
    const button = await screen.findByRole("button", {
      name: "Сохранить рецепт",
    });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    expect(button).toBeDisabled();
    await user.click(button);
    expect(favoritesApi.add).toHaveBeenCalledTimes(1);
    await act(async () => response.resolve());
    expect(
      await screen.findByRole("button", { name: "Удалить из избранного" }),
    ).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("link", { name: "Избранное" }));
    expect(await screen.findByRole("article")).toHaveTextContent(recipe.title);
  });
});
