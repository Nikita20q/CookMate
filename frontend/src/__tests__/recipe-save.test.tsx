import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { managedRecipeToDetail, type ManagedRecipeResponse } from "@/api/recipes/management";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";
import { detail, managedFixture, recipe, secondRecipe, token } from "./fixtures";
import { deferred, renderApp } from "./helpers";

beforeEach(() => {
  useAuthStore.getState().setAccessToken(token());
  vi.spyOn(authApi, "me").mockResolvedValue({ userId: 1, email: "admin@example.com", isStaff: true });
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 0, recipes: [] });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
  vi.spyOn(recipesApi, "getManagedRecipe").mockResolvedValue(managedFixture());
});

describe("Сохранение рецепта", () => {
  it("показывает серверный ответ без перезагрузки, обновляет кеши и получает новую версию при повторном редактировании", async () => {
    const parsedRecipe = managedFixture();
    parsedRecipe.recipe.ingredients = parsedRecipe.recipe.ingredients.map(({ name }) => ({ name, count: 0, measurement: "" }));
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(parsedRecipe);
    const response = deferred<ManagedRecipeResponse>();
    const save = vi.spyOn(recipesApi, "updateRecipe").mockReturnValue(response.promise);
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    fireEvent.error(await screen.findByRole("img", { name: detail.title }));
    await user.click(await screen.findByRole("button", { name: /Взбейте яйца/ }));
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(recipesApi.getManagedRecipe).toHaveBeenCalledWith(42);
    expect(screen.queryByLabelText(/Количество ингредиента/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Единица измерения ингредиента/)).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Название рецепта"));
    await user.type(screen.getByLabelText("Название рецепта"), "Название из формы");
    client.setQueryData(["recipes", "яйцо"], { recipes: [recipe, secondRecipe], recipeCount: 2 });
    client.setQueryData(["favorites", token()], { recipes: [recipe], recipeNumber: 1 });
    act(() => useIngredientsStore.getState().setRecognitionResult({ recognizedIngredients: ["яйцо"], recipes: [recipe], recipeCount: 1 }));

    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(42, expect.objectContaining({
      version: 7, recipe: expect.objectContaining({ title: "Название из формы", slug: recipe.slug, ingredients: recipe.components.map((name) => ({ name, count: 1, measurement: "шт" })) }),
    })));
    expect(screen.getByRole("button", { name: "Сохраняем…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Отменить" })).toBeDisabled();
    expect(screen.getByLabelText("Название рецепта")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Сохраняем…" }));
    expect(save).toHaveBeenCalledTimes(1);

    const saved: ManagedRecipeResponse = {
      ...managedFixture(), version: 8,
      recipe: { ...managedFixture().recipe, title: "Название от сервера", description: "Описание от сервера", prepTimeMinutes: 45,
        imageUrl: "https://s3.example/main.jpg", steps: [{ text: "Инструкция от сервера", title: "Готовим", imageUrl: "https://s3.example/step.jpg" }] },
    };
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(saved);
    await act(async () => response.resolve(saved));
    expect(await screen.findByRole("heading", { name: "Название от сервера" })).toBeVisible();
    expect(screen.getByText("Описание от сервера")).toBeVisible();
    expect(screen.getByText("45 мин")).toBeVisible();
    expect(screen.getByText("Инструкция от сервера")).toBeVisible();
    expect(screen.getByRole("img", { name: "Название от сервера" })).toHaveAttribute("src", saved.recipe.imageUrl);
    expect(screen.getByText("0/1 шагов выполнено")).toBeVisible();
    expect(screen.queryByRole("form", { name: "Черновик рецепта" })).not.toBeInTheDocument();
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(managedRecipeToDetail(saved));
    expect(client.getQueryData(["recipes", "яйцо"])).toMatchObject({ recipes: [{ title: saved.recipe.title }, secondRecipe] });
    expect(client.getQueryData(["favorites", token()])).toMatchObject({ recipes: [{ title: saved.recipe.title }] });
    expect(useIngredientsStore.getState().recognitionResult?.recipes[0].title).toBe(saved.recipe.title);
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByLabelText("Название рецепта")).toHaveValue(saved.recipe.title);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(42, expect.objectContaining({ version: 8 })));
  });

  it.each([409, 500])("оставляет черновик при ответе %s и показывает сообщение сервера", async (status) => {
    const save = vi.spyOn(recipesApi, "updateRecipe").mockRejectedValue(new AxiosError("Failure", "ERR_BAD_REQUEST", undefined, undefined, {
      status, statusText: "Failure", headers: {}, config: {} as never, data: { message: "Рецепт уже изменён. Получите актуальную версию." },
    }));
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    await user.clear(screen.getByLabelText("Название рецепта"));
    await user.type(screen.getByLabelText("Название рецепта"), "Мой черновик");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Рецепт уже изменён. Получите актуальную версию.");
    expect(screen.getByLabelText("Название рецепта")).toHaveValue("Мой черновик");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("не открывает редактор с выдуманной версией при ошибке административного GET", async () => {
    vi.mocked(recipesApi.getManagedRecipe).mockRejectedValue(new Error("Не удалось получить версию рецепта"));
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(await screen.findByText("Не удалось получить версию рецепта", { exact: true })).toHaveAttribute("role", "alert");
    expect(screen.queryByRole("form", { name: "Черновик рецепта" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: detail.title })).toBeVisible();
  });
});
