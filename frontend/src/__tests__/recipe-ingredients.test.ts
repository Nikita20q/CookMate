import { describe, expect, it } from "vitest";
import { getRecipeIngredients } from "@/lib/recipe-ingredients";

describe("Подробные ингредиенты из API", () => {
  it("использует position и сохраняет повторяющиеся названия и отсутствующие количества", () => {
    const ingredients = [
      { name: "соль", count: null, measurement: null, position: 2 },
      { name: "мука", count: 200, measurement: "г", position: 0 },
      { name: "мука", count: 50, measurement: "г", position: 1 },
    ];
    expect(getRecipeIngredients({ components: ["соль", "мука"], ingredients })).toEqual([
      ingredients[1], ingredients[2], ingredients[0],
    ]);
    expect(ingredients[0].name).toBe("соль");
  });

  it("поддерживает прежний ответ с одними названиями", () => {
    expect(getRecipeIngredients({ components: ["  Соль  ", "соль", "Мука"] })).toEqual([
      { name: "Соль", count: null, measurement: null },
      { name: "Мука", count: null, measurement: null },
    ]);
  });
});
