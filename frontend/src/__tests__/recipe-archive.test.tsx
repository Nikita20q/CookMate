import { act, screen, waitFor, within } from "@testing-library/react";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { archivedRecipesKey, managedRecipeKey, type ManagedRecipeResponse } from "@/api/recipes/management";
import { useAuthStore } from "@/store/auth";
import { useIngredientsStore } from "@/store/ingredients";
import { detail, managedFixture, recipe, secondRecipe, token } from "./fixtures";
import { deferred, renderApp } from "./helpers";

const archivedRecipe = { ...managedFixture(), version: 8, archived: true };

beforeEach(() => {
  useAuthStore.getState().setAccessToken(token());
  vi.spyOn(authApi, "me").mockResolvedValue({ userId: 1, email: "admin@example.com", isStaff: true });
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 1, recipes: [recipe] });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
  vi.spyOn(recipesApi, "getManagedRecipe").mockResolvedValue(managedFixture());
  vi.spyOn(recipesApi, "getArchivedRecipes").mockResolvedValue({ recipes: [archivedRecipe], page: 0, size: 20, total: 1 });
});

describe("Архивирование рецепта", () => {
  it("запрашивает подтверждение, передаёт версию и обновляет списки только после успеха", async () => {
    const response = deferred<ManagedRecipeResponse>();
    const archive = vi.spyOn(recipesApi, "setRecipeStatus").mockReturnValue(response.promise);
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    const archiveButton = await screen.findByRole("button", { name: "Архивировать рецепт" });
    await waitFor(() => expect(archiveButton).toBeEnabled());
    client.setQueryData(["recipes", "яйцо"], { recipeCount: 2, recipes: [recipe, secondRecipe], recognizedIngredients: ["яйцо"] });
    act(() => useIngredientsStore.getState().setRecognitionResult({ recipeCount: 2, recipes: [recipe, secondRecipe], recognizedIngredients: ["яйцо"] }));
    await user.click(archiveButton);
    const confirmation = screen.getByRole("alertdialog", { name: "Архивировать рецепт?" });
    expect(archive).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole("button", { name: "Отмена" }));
    expect(archive).not.toHaveBeenCalled();
    await user.click(archiveButton);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith(42, { version: 7, archived: true }));
    expect(screen.getByRole("button", { name: "Архивируем…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Редактировать рецепт" })).toBeDisabled();
    expect(client.getQueryData(["recipes", "яйцо"])).toMatchObject({ recipeCount: 2 });
    await act(async () => response.resolve(archivedRecipe));
    expect(await screen.findByText("Рецепт в архиве")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Архивировать рецепт" })).not.toBeInTheDocument();
    expect(client.getQueryData(["recipes", "яйцо"])).toMatchObject({ recipeCount: 1, recipes: [secondRecipe] });
    expect(useIngredientsStore.getState().recognitionResult).toMatchObject({ recipeCount: 1, recipes: [secondRecipe] });
    expect(client.getQueryData(managedRecipeKey(token(), 42))).toEqual(archivedRecipe);
    expect(client.getQueryData(["favorites", token()])).toMatchObject({ recipes: [recipe] });
    expect(archive).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("link", { name: "Архив рецептов" }));
    expect(await screen.findByRole("heading", { name: recipe.title })).toBeVisible();
    expect(recipesApi.getArchivedRecipes).toHaveBeenCalledWith(0, 20);
  });

  it.each(["guest", "user"])("скрывает кнопку и ссылку на архив для %s", async (role) => {
    if (role === "guest") useAuthStore.getState().clearAuth();
    else vi.mocked(authApi.me).mockResolvedValue({ userId: 1, email: "user@example.com", isStaff: false });
    await renderApp(`/recipes/${recipe.slug}`);
    await screen.findByRole("heading", { name: recipe.title });
    expect(screen.queryByRole("button", { name: "Архивировать рецепт" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Архив рецептов" })).not.toBeInTheDocument();
    expect(recipesApi.getManagedRecipe).not.toHaveBeenCalled();
  });

  it("показывает ошибку 409, обновляет версию для повтора и сохраняет рецепт в списках", async () => {
    const archive = vi.spyOn(recipesApi, "setRecipeStatus").mockRejectedValue(new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 409, statusText: "Conflict", headers: {}, config: {} as never, data: { message: "Рецепт уже изменён" },
    }));
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    const button = await screen.findByRole("button", { name: "Архивировать рецепт" });
    await waitFor(() => expect(button).toBeEnabled());
    client.setQueryData(["recipes", "яйцо"], { recipeCount: 1, recipes: [recipe] });
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue({ ...managedFixture(), version: 9 });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Рецепт уже изменён");
    await waitFor(() => expect(client.getQueryData(managedRecipeKey(token(), 42))).toMatchObject({ version: 9 }));
    expect(client.getQueryData(["recipes", "яйцо"])).toMatchObject({ recipeCount: 1, recipes: [recipe] });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => expect(archive).toHaveBeenLastCalledWith(42, { version: 9, archived: true }));
  });

  it("не архивирует рецепт во время редактирования и использует версию после сохранения", async () => {
    const archive = vi.spyOn(recipesApi, "setRecipeStatus").mockResolvedValue({ ...archivedRecipe, version: 9 });
    vi.spyOn(recipesApi, "updateRecipe").mockResolvedValue({ ...managedFixture(), version: 8 });
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByRole("button", { name: "Архивировать рецепт" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    const button = await screen.findByRole("button", { name: "Архивировать рецепт" });
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith(42, { version: 8, archived: true }));
  });

  it("очищает административный кеш при смене аккаунта и не восстанавливает его поздним ответом", async () => {
    const response = deferred<ManagedRecipeResponse>();
    vi.spyOn(recipesApi, "setRecipeStatus").mockReturnValue(response.promise);
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    const button = await screen.findByRole("button", { name: "Архивировать рецепт" });
    await waitFor(() => expect(button).toBeEnabled());
    client.setQueryData([...archivedRecipesKey(token()), 0], { recipes: [], page: 0, size: 20, total: 0 });
    await user.click(button);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => expect(recipesApi.setRecipeStatus).toHaveBeenCalled());
    vi.mocked(authApi.me).mockResolvedValue({ userId: 2, email: "user@example.com", isStaff: false });
    act(() => useAuthStore.getState().setAccessToken(token("2")));
    await waitFor(() => expect(client.getQueryData(managedRecipeKey(token(), 42))).toBeUndefined());
    await act(async () => response.resolve(archivedRecipe));
    expect(client.getQueryCache().findAll({ queryKey: ["admin-recipes", token()] })).toHaveLength(0);
    expect(screen.queryByText("Рецепт в архиве")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Архив рецептов" })).not.toBeInTheDocument();
  });
});

describe("Список архивов", () => {
  it("загружает архив с пагинацией и открывает рецепт", async () => {
    vi.mocked(recipesApi.getArchivedRecipes)
      .mockResolvedValueOnce({ recipes: [archivedRecipe], page: 0, size: 20, total: 21 })
      .mockResolvedValue({ recipes: [{ ...archivedRecipe, id: 43, recipe: { ...archivedRecipe.recipe, title: secondRecipe.title, slug: secondRecipe.slug } }], page: 1, size: 20, total: 21 });
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(archivedRecipe);
    const { user, router } = await renderApp("/recipes/archive");
    expect(await screen.findByRole("heading", { name: recipe.title })).toBeVisible();
    expect(screen.getByText("Страница 1 из 2")).toBeVisible();
    expect(screen.getByRole("button", { name: "Назад" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Далее" }));
    expect(await screen.findByRole("heading", { name: secondRecipe.title })).toBeVisible();
    expect(recipesApi.getArchivedRecipes).toHaveBeenLastCalledWith(1, 20);
    expect(screen.getByRole("button", { name: "Далее" })).toBeDisabled();
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({ ...detail, ...secondRecipe, image: detail.image });
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue({ ...archivedRecipe, id: 43, recipe: { ...archivedRecipe.recipe, title: secondRecipe.title, slug: secondRecipe.slug } });
    await user.click(screen.getByRole("link", { name: `Открыть рецепт ${secondRecipe.title}` }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/recipes/${secondRecipe.slug}`));
    expect(await screen.findByText("Рецепт в архиве")).toBeVisible();
  });

  it.each(["guest", "user"])("не запрашивает архив при прямом переходе для %s", async (role) => {
    if (role === "guest") useAuthStore.getState().clearAuth();
    else vi.mocked(authApi.me).mockResolvedValue({ userId: 1, email: "user@example.com", isStaff: false });
    await renderApp("/recipes/archive");
    if (role === "guest") expect(await screen.findByRole("link", { name: "Войти в аккаунт" })).toBeVisible();
    else expect(await screen.findByRole("alert")).toHaveTextContent("Архив доступен только администраторам");
    expect(recipesApi.getArchivedRecipes).not.toHaveBeenCalled();
  });

  it("показывает пустой архив и позволяет повторить запрос после ошибки", async () => {
    vi.mocked(recipesApi.getArchivedRecipes).mockRejectedValueOnce(new Error("Нет связи с сервером"))
      .mockResolvedValue({ recipes: [], page: 0, size: 20, total: 0 });
    const { user } = await renderApp("/recipes/archive");
    expect(await screen.findByRole("alert")).toHaveTextContent("Нет связи с сервером");
    await user.click(screen.getByRole("button", { name: "Повторить загрузку" }));
    expect(await screen.findByText("В архиве пока нет рецептов.")).toBeVisible();
  });
});
