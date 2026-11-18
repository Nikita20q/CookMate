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

const archived = { ...managedFixture(), version: 8, archived: true };
const restored = { ...archived, version: 9, archived: false };

beforeEach(() => {
  useAuthStore.getState().setAccessToken(token());
  vi.spyOn(authApi, "me").mockResolvedValue({ userId: 1, email: "admin@example.com", isStaff: true });
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 1, recipes: [recipe] });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
  vi.spyOn(recipesApi, "getManagedRecipe").mockResolvedValue(archived);
  vi.spyOn(recipesApi, "getArchivedRecipes").mockResolvedValue({ recipes: [archived], page: 0, size: 20, total: 1 });
});

async function confirmRestoration(user: Awaited<ReturnType<typeof renderApp>>["user"]) {
  const button = await screen.findByRole("button", { name: "Вернуть из архива" });
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
  await user.click(screen.getByRole("button", { name: "Вернуть рецепт" }));
}

describe("Возврат рецептов из архива", () => {
  it("подтверждает возврат, отправляет archived: false и обновляет кеши после ответа", async () => {
    const response = deferred<ManagedRecipeResponse>();
    const changeStatus = vi.spyOn(recipesApi, "setRecipeStatus").mockReturnValue(response.promise);
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    const button = await screen.findByRole("button", { name: "Вернуть из архива" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(screen.queryByText("Рецепт в архиве")).not.toBeInTheDocument();
    const archiveKey = [...archivedRecipesKey(token()), 0];
    client.setQueryData(archiveKey, { recipes: [archived], total: 1, page: 0, size: 20 });
    client.setQueryData(["recipes", "яйцо"], { recipes: [secondRecipe], recipeCount: 1 });
    act(() => useIngredientsStore.getState().setRecognitionResult({ recognizedIngredients: ["яйцо"], recipes: [secondRecipe], recipeCount: 1 }));
    await user.click(button);
    const confirmation = screen.getByRole("alertdialog", { name: "Вернуть рецепт из архива?" });
    expect(changeStatus).not.toHaveBeenCalled();
    await user.click(within(confirmation).getByRole("button", { name: "Отмена" }));
    expect(changeStatus).not.toHaveBeenCalled();
    await confirmRestoration(user);
    await waitFor(() => expect(changeStatus).toHaveBeenCalledWith(42, { version: 8, archived: false }));
    expect(screen.getByRole("button", { name: "Возвращаем…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Редактировать рецепт" })).toBeDisabled();
    expect(client.getQueryData(archiveKey)).toMatchObject({ total: 1, recipes: [archived] });
    await act(async () => response.resolve(restored));
    const archiveButton = await screen.findByRole("button", { name: "Архивировать рецепт" });
    await waitFor(() => expect(archiveButton).toBeEnabled());
    expect(screen.queryByText("Рецепт в архиве")).not.toBeInTheDocument();
    expect(client.getQueryData(managedRecipeKey(token(), 42))).toEqual(restored);
    expect(client.getQueryData(archiveKey)).toMatchObject({ total: 0, recipes: [] });
    expect(client.getQueryState(["recipes", "яйцо"])?.isInvalidated).toBe(true);
    expect(useIngredientsStore.getState().recognitionResult).toBeNull();
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(client.getQueryData(["favorites", token()])).toMatchObject({ recipeNumber: 1, recipes: [{ id: recipe.id }] });
    expect(changeStatus).toHaveBeenCalledTimes(1);
    changeStatus.mockResolvedValueOnce({ ...restored, archived: true, version: 10 });
    await user.click(archiveButton);
    await user.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => expect(changeStatus).toHaveBeenLastCalledWith(42, { version: 9, archived: true }));
  });

  it.each([409, 500])("оставляет карточку в архиве при ошибке %s", async (status) => {
    vi.spyOn(recipesApi, "setRecipeStatus").mockRejectedValue(new AxiosError("Failure", "ERR_BAD_REQUEST", undefined, undefined, {
      status, statusText: "Failure", headers: {}, config: {} as never, data: { message: "Не удалось вернуть рецепт" },
    }));
    const { user } = await renderApp("/recipes/archive");
    await confirmRestoration(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось вернуть рецепт");
    expect(screen.getByRole("heading", { name: recipe.title })).toBeVisible();
    expect(screen.getByText("В архиве: 1")).toBeVisible();
    await waitFor(() => expect(screen.getByRole("button", { name: "Вернуть из архива" })).toBeEnabled());
  });

  it("получает актуальную версию после 409 и позволяет повторить возврат", async () => {
    const changeStatus = vi.spyOn(recipesApi, "setRecipeStatus")
      .mockRejectedValueOnce(new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
        status: 409, statusText: "Conflict", headers: {}, config: {} as never, data: { message: "Рецепт уже изменён" },
      }))
      .mockResolvedValue({ ...restored, version: 11 });
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue({ ...archived, version: 10 });
    await confirmRestoration(user);
    expect(await screen.findByRole("alert")).toHaveTextContent("Рецепт уже изменён");
    await waitFor(() => expect(client.getQueryData(managedRecipeKey(token(), 42))).toMatchObject({ version: 10 }));
    await confirmRestoration(user);
    await waitFor(() => expect(changeStatus).toHaveBeenLastCalledWith(42, { version: 10, archived: false }));
    expect(await screen.findByRole("button", { name: "Архивировать рецепт" })).toBeVisible();
  });

  it("возвращает из списка архивов и переходит с опустевшей последней страницы на предыдущую", async () => {
    let completed = false;
    const second = { ...archived, id: 43, recipe: { ...archived.recipe, title: secondRecipe.title, slug: secondRecipe.slug } };
    vi.mocked(recipesApi.getArchivedRecipes).mockImplementation(async (page = 0) => ({
      recipes: page === 0 ? [archived] : completed ? [] : [second], page, size: 20, total: completed ? 20 : 21,
    }));
    const changeStatus = vi.spyOn(recipesApi, "setRecipeStatus").mockImplementation(async () => {
      completed = true;
      return { ...second, version: 9, archived: false };
    });
    const { user } = await renderApp("/recipes/archive");
    await screen.findByRole("heading", { name: recipe.title });
    expect(screen.queryByText("Рецепт в архиве")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await screen.findByRole("heading", { name: secondRecipe.title });
    await confirmRestoration(user);
    await waitFor(() => expect(changeStatus).toHaveBeenCalledWith(43, { version: 8, archived: false }));
    expect(await screen.findByRole("heading", { name: recipe.title })).toBeVisible();
    expect(screen.getByText("В архиве: 20")).toBeVisible();
    expect(screen.queryByText("Страница 2 из 2")).not.toBeInTheDocument();
    expect(recipesApi.getArchivedRecipes).toHaveBeenLastCalledWith(0, 20);
    expect(recipesApi.getManagedRecipe).not.toHaveBeenCalled();
  });

  it("не восстанавливает приватный кеш поздним ответом после смены аккаунта", async () => {
    const response = deferred<ManagedRecipeResponse>();
    vi.spyOn(recipesApi, "setRecipeStatus").mockReturnValue(response.promise);
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    await confirmRestoration(user);
    vi.mocked(authApi.me).mockResolvedValue({ userId: 2, email: "user@example.com", isStaff: false });
    act(() => useAuthStore.getState().setAccessToken(token("2")));
    await waitFor(() => expect(client.getQueryData(managedRecipeKey(token(), 42))).toBeUndefined());
    await act(async () => response.resolve(restored));
    expect(client.getQueryCache().findAll({ queryKey: ["admin-recipes", token()] })).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Вернуть из архива" })).not.toBeInTheDocument();
  });
});
