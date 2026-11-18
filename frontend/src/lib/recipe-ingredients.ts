import type { RecipeDetail } from "@/types/recipes";
import { matchRecipe } from "@/lib/ingredients";

export function getRecipeIngredients(recipe: Pick<RecipeDetail, "components" | "ingredients">) {
  if (recipe.ingredients == null) {
    return matchRecipe(recipe, []).ingredients.map(({ title }) => ({ name: title, count: null, measurement: null }));
  }
  return recipe.ingredients
    .map((ingredient, index) => ({ ...ingredient, position: ingredient.position ?? index }))
    .sort((a, b) => a.position - b.position);
}
