import type { Recipe } from "@/types/recipes";

const formatIngredient = (ingredient: string) => ingredient.trim().replace(/\s+/g, " ");

export const normalizeIngredient = (ingredient: string) =>
  formatIngredient(ingredient).toLowerCase();

export function normalizeIngredients(ingredients: readonly string[]): string[] {
  return [...new Set(ingredients.map(normalizeIngredient).filter(Boolean))];
}

export function matchRecipe(
  recipe: Pick<Recipe, "components">,
  currentIngredients: readonly string[],
) {
  const pantry = new Set(normalizeIngredients(currentIngredients));
  const uniqueIngredients = new Map<string, string>();
  for (const ingredient of recipe.components) {
    const key = normalizeIngredient(ingredient);
    if (key && !uniqueIngredients.has(key)) {
      uniqueIngredients.set(key, formatIngredient(ingredient));
    }
  }
  const ingredients = [...uniqueIngredients].map(([key, title]) => ({
    key,
    title,
    available: pantry.has(key),
  }));
  const matchedCount = ingredients.filter((ingredient) => ingredient.available).length;
  const totalCount = ingredients.length;
  return {
    ingredients,
    matchedCount,
    totalCount,
    matchScore: totalCount ? Math.round((matchedCount / totalCount) * 100) : 0,
  };
}
