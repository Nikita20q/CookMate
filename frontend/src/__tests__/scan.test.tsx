import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { useIngredientsStore } from "@/store/ingredients";
import type { RecognizeResponse } from "@/api/recipes/types";
import { recipe, secondRecipe } from "./fixtures";
import { deferred, renderApp } from "./helpers";

beforeEach(() => {
  vi.spyOn(recipesApi, "recognize").mockResolvedValue({
    recognizedIngredients: ["ЯЙЦО", "Сыр"],
    recipes: [recipe],
    recipeCount: 1,
  });
  vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
    recognizedIngredients: [],
    recipes: [recipe],
    recipeCount: 1,
  });
});

describe("Сканирование продуктов", () => {
  it("показывает отсутствие предыдущего сканирования", async () => {
    await renderApp("/");
    expect(screen.getByText("Ингредиенты не найдены")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Найти подходящие рецепты" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("загружает фото, сохраняет распознанные продукты и открывает рецепты", async () => {
    vi.mocked(recipesApi.findByIngredients).mockRejectedValue(new Error("Поиск недоступен"));
    const { user, router, client } = await renderApp("/");
    client.setQueryData(["recipes", "сыр,яйцо"], {
      recognizedIngredients: ["сыр", "яйцо"], recipes: [secondRecipe], recipeCount: 1,
    });
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["photo"], "fridge.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/recipes"),
    );
    expect(recipesApi.recognize).toHaveBeenCalledWith(file, expect.anything());
    expect(useIngredientsStore.getState().currentIngredients).toEqual([
      "яйцо",
      "сыр",
    ]);
    expect(input.value).toBe("");
    expect(await screen.findByText(recipe.title)).toBeVisible();
    expect(screen.queryByText(secondRecipe.title)).not.toBeInTheDocument();
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();

    await act(async () => { await router.navigate({ to: "/" }); });
    client.clear();
    await user.click(screen.getByRole("link", { name: "Найти подходящие рецепты" }));
    expect(await screen.findByText(recipe.title)).toBeVisible();
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
  });

  it.each([{ ingredients: [] }, { ingredients: ["ЯЙЦО"] }])("показывает пустой результат распознавания %j без поиска", async ({ ingredients }) => {
    vi.mocked(recipesApi.recognize).mockResolvedValue({
      recognizedIngredients: ingredients, recipes: [], recipeCount: 0,
    });
    const { user } = await renderApp("/");
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!,
      new File(["photo"], "fridge.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText("Рецепты не найдены")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
  });

  it("ищет рецепты после ручного изменения распознанных ингредиентов", async () => {
    const { user } = await renderApp("/");
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!,
      new File(["photo"], "fridge.jpg", { type: "image/jpeg" }));
    await screen.findByText(recipe.title);
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    await user.click(screen.getByText("+"));
    await user.type(screen.getByPlaceholderText("Введите ингредиент"), "рис");
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    await waitFor(() => expect(recipesApi.findByIngredients).toHaveBeenCalledWith(["яйцо", "сыр", "рис"]));
    expect(useIngredientsStore.getState().recognitionResult).toBeNull();
  });

  it("заменяет рецепты при повторном сканировании тех же ингредиентов", async () => {
    const { user, router } = await renderApp("/");
    const file = new File(["photo"], "fridge.jpg", { type: "image/jpeg" });
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
    expect(await screen.findByText(recipe.title)).toBeVisible();
    await act(async () => { await router.navigate({ to: "/" }); });
    vi.mocked(recipesApi.recognize).mockResolvedValue({
      recognizedIngredients: ["ЯЙЦО", "Сыр"], recipes: [secondRecipe], recipeCount: 1,
    });
    await user.upload(document.querySelector<HTMLInputElement>('input[type="file"]')!, file);
    expect(await screen.findByText(secondRecipe.title)).toBeVisible();
    expect(screen.queryByText(recipe.title)).not.toBeInTheDocument();
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
  });

  it("отклоняет фото больше 10 МБ без запроса и позволяет выбрать другое", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["рис"]);
    const { user, router } = await renderApp("/");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const largeFile = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await user.upload(input, largeFile);
    expect(screen.getByRole("alert")).toHaveTextContent("Размер изображения не должен превышать 10 МБ");
    expect(recipesApi.recognize).not.toHaveBeenCalled();
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    expect(router.state.location.pathname).toBe("/");
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["рис"]);
    expect(input.value).toBe("");
    expect(screen.getByRole("button", { name: "Загрузите изображение" })).toBeEnabled();

    await user.upload(input, largeFile);
    expect(recipesApi.recognize).not.toHaveBeenCalled();
    await user.upload(input, new File(["photo"], "small.jpg", { type: "image/jpeg" }));
    expect(await screen.findByText(recipe.title)).toBeVisible();
    expect(recipesApi.recognize).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([10 * 1024 * 1024 - 1, 10 * 1024 * 1024])("принимает фото размером %i байт", async (size) => {
    const { user } = await renderApp("/");
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([new Uint8Array(size)], "fridge.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    expect(await screen.findByText(recipe.title)).toBeVisible();
    expect(recipesApi.recognize).toHaveBeenCalledExactlyOnceWith(file, expect.anything());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("блокирует повторную загрузку во время распознавания", async () => {
    const response = deferred<RecognizeResponse>();
    vi.mocked(recipesApi.recognize).mockReturnValue(response.promise);
    const { user } = await renderApp("/");
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(
      input,
      new File(["photo"], "fridge.png", { type: "image/png" }),
    );
    expect(screen.getByRole("button", { name: "Загрузка..." })).toBeDisabled();
    await act(async () =>
      response.resolve({
        recognizedIngredients: [],
        recipeCount: 0,
        recipes: [],
      }),
    );
  });

  it("показывает ошибку распознавания и разрешает новую попытку", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(recipesApi.recognize).mockRejectedValue(
      new Error("ML недоступен"),
    );
    const { user, router } = await renderApp("/");
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(
      input,
      new File(["photo"], "fridge.jpg", { type: "image/jpeg" }),
    );
    expect(
      await screen.findByText(
        "Не удалось распознать продукты. Попробуйте загрузить фото ещё раз.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Загрузите изображение" }),
    ).toBeEnabled();
    expect(router.state.location.pathname).toBe("/");
  });

  it("не отправляет запрос при отмене выбора файла", async () => {
    await renderApp("/");
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [] },
    });
    expect(recipesApi.recognize).not.toHaveBeenCalled();
  });

  it.todo("снимает фотографию через камеру");
  it.todo("принимает изображение перетаскиванием");
});
