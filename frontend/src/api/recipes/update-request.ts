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
      protein: values.protein ?? null,
      fat: values.fat ?? null,
      carbohydrates: values.carbohydrates ?? null,
      ingredients: values.components.map(({ title, quantity, measurement }) => ({
        name: title,
        count: quantity ?? null,
        measurement: measurement?.trim() || "по вкусу",
      })),
      steps: values.steps.map((step) => ({
        title: step.stepTitle.trim() || null,
        text: step.stepInstruction,
        imageUrl: step.imageUrl || null,
      })),
    },
  };
}
