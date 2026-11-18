import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipe } from "./fixtures";
import { renderApp } from "./helpers";

beforeEach(() => {
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 0, recipes: [] });
  vi.spyOn(recipesApi, "getBySlug");
});

describe("БЖУ в раскрытом рецепте списка", () => {
  it("показывает БЖУ из ответа списка без дополнительного запроса за деталями", async () => {
    vi.mocked(recipesApi.getSuggestions).mockResolvedValue({
      recognizedIngredients: [], recipeCount: 1, recipes: [{ ...recipe, protein: 15, fat: 0, carbohydrates: 3 }],
    });
    const { user } = await renderApp("/recipes");
    await screen.findByText(recipe.title);
    expect(screen.queryByRole("group", { name: "Пищевая ценность" })).not.toBeInTheDocument();
    await user.click(screen.getByText("Подробнее"));
    const nutrition = within(screen.getByRole("group", { name: "Пищевая ценность" }));
    expect(nutrition.getByText("Белки")).toBeVisible();
    expect(nutrition.getByText("15 г")).toBeVisible();
    expect(nutrition.getByText("0 г")).toBeVisible();
    expect(nutrition.getByText("3 г")).toBeVisible();
    expect(recipesApi.getBySlug).not.toHaveBeenCalled();
    await user.click(screen.getByText("Скрыть"));
    expect(screen.queryByRole("group", { name: "Пищевая ценность" })).not.toBeInTheDocument();
  });

  it.each([{}, { protein: null, fat: null, carbohydrates: null }])("не показывает БЖУ при отсутствии значений %j", async (values) => {
    vi.mocked(recipesApi.getSuggestions).mockResolvedValue({
      recognizedIngredients: [], recipeCount: 1, recipes: [{ ...recipe, ...values }],
    });
    const { user } = await renderApp("/recipes");
    await screen.findByText(recipe.title);
    await user.click(screen.getByText("Подробнее"));
    expect(screen.queryByRole("group", { name: "Пищевая ценность" })).not.toBeInTheDocument();
    expect(recipesApi.getBySlug).not.toHaveBeenCalled();
  });

  it("при частичном ответе показывает только известное значение", async () => {
    vi.mocked(recipesApi.getSuggestions).mockResolvedValue({
      recognizedIngredients: [], recipeCount: 1, recipes: [{ ...recipe, protein: null, fat: 0 }],
    });
    const { user } = await renderApp("/recipes");
    await screen.findByText(recipe.title);
    await user.click(screen.getByText("Подробнее"));
    const nutrition = within(screen.getByRole("group", { name: "Пищевая ценность" }));
    expect(nutrition.getByText("Жиры")).toBeVisible();
    expect(nutrition.getByText("0 г")).toBeVisible();
    expect(nutrition.queryByText("Белки")).not.toBeInTheDocument();
    expect(nutrition.queryByText("Углеводы")).not.toBeInTheDocument();
  });
});
