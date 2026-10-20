import { describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
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

  it("очищает список ингредиентов", () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    useIngredientsStore.getState().clearIngredients();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
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
