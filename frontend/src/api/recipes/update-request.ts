import type { RecipeEditorValues } from "@/types/recipe-editor";
import type { ManagedRecipeResponse, RecipeUpdateRequest } from "./management";

export const RECIPE_UPLOAD_UNAVAILABLE =
  "Сервер пока не поддерживает загрузку новых фотографий. Сохраните рецепт с существующими фото или отмените изменения.";

export function buildRecipeUpdateRequest(
  values: RecipeEditorValues,
  original: ManagedRecipeResponse,
): RecipeUpdateRequest {
  if (values.imageFile || values.steps.some((step) => step.imageFile)) {
    throw new Error(RECIPE_UPLOAD_UNAVAILABLE);
  }
  return {
    version: original.version,
    recipe: {
      title: values.title,
      slug: original.recipe.slug,
      description: values.description,
      imageUrl: values.image || null,
      prepTimeMinutes: values.prepTimeMinutes ?? null,
      calories: values.calories ?? null,
      protein: values.protein,
      fat: values.fat,
      carbohydrates: values.carbohydrates,
      // Temporary defaults while the parser does not supply quantities or units.
      ingredients: values.components.map(({ title }) => ({
        name: title,
        count: 1,
        measurement: "шт",
      })),
      steps: values.steps.map((step) => ({
        title: step.stepTitle || null,
        text: step.stepInstruction,
        imageUrl: step.imageUrl || null,
      })),
    },
  };
}
