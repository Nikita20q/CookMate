import { useAuthStore } from "@/store/auth";
import { favoritesApi } from "@/api/favorites/api";
import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { useIngredientsStore } from "@/store/ingredients";
import { detail, recipe, token } from "./fixtures";
import { deferred, renderApp } from "./helpers";
import type { RecognizeResponse } from "@/api/recipes/types";
import type { RecipeDetail } from "@/types/recipes";

beforeEach(() => {
  vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
    recipeCount: 1,
    recipes: [recipe],
    recognizedIngredients: ["яйцо"],
  });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
});

describe("Подбор рецептов", () => {
  it("не отправляет поиск без ингредиентов и предлагает добавить их", async () => {
    await renderApp("/recipes");
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    expect(screen.getByText("Рецепты не найдены")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Добавить ингредиенты" }),
    ).toBeVisible();
  });

  it("показывает загрузку списка", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const response = deferred<RecognizeResponse>();
    vi.mocked(recipesApi.findByIngredients).mockReturnValue(response.promise);
    await renderApp("/recipes");
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем рецепты");
    await act(async () =>
      response.resolve({
        recipeCount: 0,
        recipes: [],
        recognizedIngredients: [],
      }),
    );
  });

  it("показывает ошибку запроса и повторяет поиск", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    vi.mocked(recipesApi.findByIngredients)
      .mockRejectedValueOnce(new Error("Нет сети"))
      .mockResolvedValue({
        recipeCount: 1,
        recipes: [recipe],
        recognizedIngredients: [],
      });
    const { user } = await renderApp("/recipes");
    await user.click(
      await screen.findByRole("button", { name: "Повторить поиск" }),
    );
    expect(await screen.findByText(recipe.title)).toBeVisible();
  });

  it("показывает пустой результат поиска", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["рис"]);
    vi.mocked(recipesApi.findByIngredients).mockResolvedValue({
      recipeCount: 0,
      recipes: [],
      recognizedIngredients: [],
    });
    await renderApp("/recipes");
    expect(
      await screen.findByText(
        "Для данных продуктов не получилось найти подходящие рецепты",
      ),
    ).toBeVisible();
  });

  it("повторяет поиск после добавления и удаления ингредиента", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const { user } = await renderApp("/recipes");
    await screen.findByText(recipe.title);
    await user.click(screen.getByText("+"));
    await user.type(screen.getByPlaceholderText("Введите ингредиент"), "Сыр");
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    await waitFor(() =>
      expect(recipesApi.findByIngredients).toHaveBeenCalledWith([
        "яйцо",
        "сыр",
      ]),
    );
    await user.click(screen.getByText("сыр", { selector: "span" }));
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
  });

  it("добавляет нормализованный ингредиент по Enter один раз", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"], recipes: [recipe], recipeCount: 1,
    });
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("+"));
    const input = screen.getByLabelText("Новый ингредиент");
    expect(input).toHaveFocus();
    await user.tab();
    expect(input).not.toHaveFocus();
    await user.click(screen.getByText("+"));
    expect(input).toHaveFocus();
    await user.keyboard("  Сыр  {Enter}");
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо", "сыр"]);
    await waitFor(() => expect(recipesApi.findByIngredients).toHaveBeenCalledExactlyOnceWith(["яйцо", "сыр"]));
    expect(screen.queryByLabelText("Новый ингредиент")).not.toBeInTheDocument();
  });

  it("показывает ошибку пустого ингредиента у поля формы", async () => {
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("+"));
    await user.type(screen.getByLabelText("Новый ингредиент"), "   {Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Введите ингредиент");
    expect(screen.getByLabelText("Новый ингредиент")).toHaveAccessibleDescription("Введите ингредиент");
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
  });

  it("отменяет добавление без отправки формы и поиска", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"], recipes: [recipe], recipeCount: 1,
    });
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("+"));
    await user.type(screen.getByLabelText("Новый ингредиент"), "сыр");
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Новый ингредиент")).not.toBeInTheDocument();
  });

  it("не добавляет дубли и пустые продукты, сохраняя результат сканирования", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"], recipes: [recipe], recipeCount: 1,
    });
    const { user } = await renderApp("/recipes");
    for (const value of [" ЯЙЦО ", "   "]) {
      await user.click(screen.getByText("+"));
      await user.type(screen.getByPlaceholderText("Введите ингредиент"), value);
      await user.click(screen.getByRole("button", { name: "Добавить" }));
      if (screen.queryByRole("button", { name: "Отмена" })) {
        await user.click(screen.getByRole("button", { name: "Отмена" }));
      }
    }
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    await user.click(screen.getByText("+"));
    await user.type(screen.getByPlaceholderText("Введите ингредиент"), " Зелёный  лук ");
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    await waitFor(() => expect(recipesApi.findByIngredients).toHaveBeenCalledWith(["яйцо", "зелёный лук"]));
  });

  it("показывает одинаковое совпадение в списке, деталях и избранном", async () => {
    const components = [" Яйцо ", "яйцо", "Сыр", "СЫР ", " Зелёный  лук ", " "];
    useAuthStore.getState().setAccessToken(token());
    useIngredientsStore.getState().setCurrentIngredients([" ЯЙЦО ", "яйцо", "ЗЕЛЁНЫЙ ЛУК"]);
    vi.spyOn(favoritesApi, "getAll").mockResolvedValue({
      recipeNumber: 1, recipes: [{ ...recipe, components }],
    });
    vi.mocked(recipesApi.findByIngredients).mockResolvedValue({
      recognizedIngredients: [], recipeCount: 1, recipes: [{ ...recipe, components }],
    });
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({ ...detail, components });
    const { user, router } = await renderApp("/recipes");
    await user.click(await screen.findByRole("button", { name: /Омлет с сыром/ }));
    expect(screen.getByText("67%")).toBeVisible();
    expect(screen.getByText(/ингредиентов в наличии/)).toHaveTextContent("2/3 ингредиентов в наличии");
    expect(screen.getByText("✓ Яйцо")).toHaveClass("text-primary");
    expect(screen.getByText("✓ Зелёный лук")).toHaveClass("text-primary");
    expect(screen.getByText("Сыр", { exact: true })).not.toHaveClass("text-primary");
    await user.click(screen.getByRole("link", { name: "Посмотреть полный рецепт" }));
    expect(await screen.findByText("67% совпадение")).toBeVisible();
    const overview = within(screen.getByRole("region", { name: "Информация о рецепте" }));
    expect(overview.getByText(/в кладовой/)).toHaveTextContent("2/3 в кладовой");
    expect(overview.getAllByText("купить")).toHaveLength(1);
    expect(overview.getByText("купить").parentElement).toHaveTextContent("Сыр");
    expect(overview.getAllByText("Яйцо", { exact: true })).toHaveLength(1);
    await act(async () => { await router.navigate({ to: "/favorites" }); });
    expect(await screen.findByText("67% совпадение")).toBeVisible();
    const card = within(screen.getByRole("article"));
    expect(card.getAllByText("Яйцо", { exact: true })).toHaveLength(1);
    expect(card.getByText("Зелёный лук")).toBeVisible();
  });

  it("раскрывает карточку и открывает полный рецепт", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const { user, router } = await renderApp("/recipes");
    await user.click(
      await screen.findByRole("button", { name: /Омлет с сыром/ }),
    );
    expect(screen.getByText(/ингредиентов в наличии/)).toHaveTextContent(
      "1/2 ингредиентов в наличии",
    );
    await user.click(
      screen.getByRole("link", { name: "Посмотреть полный рецепт" }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/recipes/${recipe.slug}`),
    );
    expect(
      await screen.findByRole("heading", { name: recipe.title }),
    ).toBeVisible();
  });
});

describe("Детальная страница рецепта", () => {
  it("отличает загрузку от отсутствующего рецепта", async () => {
    const response = deferred<RecipeDetail>();
    vi.mocked(recipesApi.getBySlug).mockReturnValue(response.promise);
    await renderApp(`/recipes/${recipe.slug}`);
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем рецепт");
    expect(screen.queryByText("Рецепт не найден.")).not.toBeInTheDocument();
    await act(async () => response.resolve(detail));
    expect(
      await screen.findByRole("heading", { name: recipe.title }),
    ).toBeVisible();
  });

  it("показывает ошибку загрузки и кнопку повтора", async () => {
    vi.mocked(recipesApi.getBySlug)
      .mockRejectedValueOnce(new Error("Нет сети"))
      .mockResolvedValue(detail);
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(
      await screen.findByRole("button", { name: "Повторить загрузку" }),
    );
    expect(
      await screen.findByRole("heading", { name: recipe.title }),
    ).toBeVisible();
  });

  it("показывает ингредиенты, калорийность и процент совпадения", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    await renderApp(`/recipes/${recipe.slug}`);
    expect(await screen.findByText("50% совпадение")).toBeVisible();
    expect(screen.getByText("240")).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Информация о рецепте" }),
    ).toHaveTextContent("сыр");
  });

  it("отмечает выполненные шаги и отменяет отметку", async () => {
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    const step = await screen.findByRole("button", { name: /Взбейте яйца/ });
    expect(screen.getByText("0/2 шагов выполнено")).toBeVisible();
    await user.click(step);
    expect(screen.getByText("1/2 шагов выполнено")).toBeVisible();
    await user.click(step);
    expect(screen.getByText("0/2 шагов выполнено")).toBeVisible();
  });

  it("не показывает NaN для рецепта без ингредиентов", async () => {
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({
      ...detail,
      components: [],
    });
    await renderApp(`/recipes/${recipe.slug}`);
    expect(await screen.findByText("0% совпадение")).toBeVisible();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
