import { describe, expect, it } from "vitest";
import { matchRecipe, normalizeIngredient, normalizeIngredients } from "@/lib/ingredients";

describe("Нормализация ингредиентов", () => {
  it.each([
    ["  ЯЙЦО  ", "яйцо"],
    [" Зелёный\t  Лук\n", "зелёный лук"],
    [" \t\n", ""],
  ])("нормализует %j", (value, expected) => {
    expect(normalizeIngredient(value)).toBe(expected);
  });

  it("удаляет пустые значения и дубли, сохраняя порядок", () => {
    const original = ["Сыр", " яйцо ", "СЫР ", "", " \n", "ЯЙЦО"];
    expect(normalizeIngredients(original)).toEqual(["сыр", "яйцо"]);
    expect(original).toHaveLength(6);
  });
});

describe("Совпадение рецепта с продуктами", () => {
  it("одинаково считает и отмечает уникальные ингредиенты, сохраняя названия", () => {
    const result = matchRecipe(
      { components: [" Яйцо ", "яйцо", "Сыр", "СЫР ", " Зелёный  лук ", " "] },
      [" ЯЙЦО ", "яйцо", " зелёный\tлук", ""],
    );
    expect(result).toEqual({
      ingredients: [
        { key: "яйцо", title: "Яйцо", available: true },
        { key: "сыр", title: "Сыр", available: false },
        { key: "зелёный лук", title: "Зелёный лук", available: true },
      ],
      matchedCount: 2,
      totalCount: 3,
      matchScore: 67,
    });
  });

  it.each([{ components: [] }, { components: ["", " \t"] }])("возвращает 0 для пустого состава %j", (recipe) => {
    const result = matchRecipe(recipe, ["яйцо"]);
    expect(result.totalCount).toBe(0);
    expect(result.matchScore).toBe(0);
  });

  it("не ищет подстроки и не отождествляет разные названия", () => {
    const result = matchRecipe({ components: ["сыр", "лук", "яйцо"] }, ["сырок", "зелёный лук", "яйца"]);
    expect(result.matchedCount).toBe(0);
  });

  it("не завышает совпадение при дублях в кладовой или составе", () => {
    const result = matchRecipe({ components: ["Яйцо", "яйцо", "сыр"] }, ["ЯЙЦО", "яйцо", "яйцо"]);
    expect(result.matchedCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.matchScore).toBe(50);
  });
});
