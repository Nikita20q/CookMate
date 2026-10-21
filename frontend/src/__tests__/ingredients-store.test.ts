import { describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { deferred } from "./helpers";
import { recipe } from "./fixtures";
import type { SearchHistoryResponse } from "@/api/recipes/types";
import { useIngredientsStore } from "@/store/ingredients";

describe("Хранилище ингредиентов", () => {
  it("приводит добавленные ингредиенты к нижнему регистру", () => {
    useIngredientsStore.getState().setCurrentIngredients(["ЯЙЦО", "Сыр"]);
    expect(useIngredientsStore.getState().currentIngredients).toEqual([
      "яйцо",
      "сыр",
    ]);
    expect(useIngredientsStore.getState().isInitialized).toBe(true);
  });

  it.each(["manual", "recognition", "history"])(
    "нормализует пробелы и дубли из источника %s", async (source) => {
      const ingredients = [" ЯЙЦО ", "яйцо", " Зелёный  лук ", "ЗЕЛЁНЫЙ\tЛУК", " "];
      if (source === "manual") {
        useIngredientsStore.getState().setCurrentIngredients(ingredients);
      } else if (source === "recognition") {
        useIngredientsStore.getState().setRecognitionResult({
          recognizedIngredients: ingredients, recipes: [recipe], recipeCount: 1,
        });
      } else {
        vi.spyOn(recipesApi, "getSearchHistory").mockResolvedValue([
          { id: 1, ingredients, createdAt: "2026-10-21" },
        ]);
        await useIngredientsStore.getState().initIngredients();
      }
      expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо", "зелёный лук"]);
    },
  );

  it("не сбрасывает рецепты распознавания при добавлении дубля", () => {
    const result = { recognizedIngredients: ["Яйцо"], recipes: [recipe], recipeCount: 1 };
    useIngredientsStore.getState().setRecognitionResult(result);
    const original = useIngredientsStore.getState().currentIngredients;
    useIngredientsStore.getState().setCurrentIngredients(["яйцо", " ЯЙЦО ", ""]);
    expect(useIngredientsStore.getState().recognitionResult).toBe(result);
    expect(useIngredientsStore.getState().currentIngredients).toBe(original);
  });

  it("очищает список ингредиентов", () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    useIngredientsStore.getState().clearIngredients();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
  });

  it("сбрасывает результат распознавания при изменении и очистке ингредиентов", () => {
    const result = { recognizedIngredients: ["ЯЙЦО"], recipes: [recipe], recipeCount: 1 };
    useIngredientsStore.getState().setRecognitionResult(result);
    expect(useIngredientsStore.getState().recognitionResult).toEqual(result);
    useIngredientsStore.getState().setCurrentIngredients(["рис"]);
    expect(useIngredientsStore.getState().recognitionResult).toBeNull();
    useIngredientsStore.getState().setRecognitionResult(result);
    useIngredientsStore.getState().clearIngredients();
    expect(useIngredientsStore.getState().recognitionResult).toBeNull();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
  });

  it("не перезаписывает успешное распознавание запоздавшей историей", async () => {
    const history = deferred<SearchHistoryResponse>();
    vi.spyOn(recipesApi, "getSearchHistory").mockReturnValue(history.promise);
    const initialization = useIngredientsStore.getState().initIngredients();
    const result = { recognizedIngredients: ["ЯЙЦО"], recipes: [recipe], recipeCount: 1 };
    useIngredientsStore.getState().setRecognitionResult(result);
    history.resolve([{ id: 1, ingredients: ["рис"], createdAt: "2026-10-20" }]);
    await initialization;
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(useIngredientsStore.getState().recognitionResult).toEqual(result);
  });

  it("восстанавливает ингредиенты последнего поиска с единым регистром", async () => {
    vi.spyOn(recipesApi, "getSearchHistory").mockResolvedValue([
      { id: 2, ingredients: ["ЯЙЦО", "Сыр"], createdAt: "2026-10-20" },
      { id: 1, ingredients: ["рис"], createdAt: "2026-10-19" },
    ]);
    await useIngredientsStore.getState().initIngredients();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([
      "яйцо",
      "сыр",
    ]);
  });

  it("завершает инициализацию при пустой истории", async () => {
    vi.spyOn(recipesApi, "getSearchHistory").mockResolvedValue([]);
    await useIngredientsStore.getState().initIngredients();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
    expect(useIngredientsStore.getState().isInitialized).toBe(true);
  });

  it("не блокирует приложение при ошибке истории", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(recipesApi, "getSearchHistory").mockRejectedValue(
      new Error("Нет сети"),
    );
    await useIngredientsStore.getState().initIngredients();
    expect(useIngredientsStore.getState().isInitialized).toBe(true);
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
  });
});
