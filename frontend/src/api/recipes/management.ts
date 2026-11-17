import type { RecipeDetail } from "@/types/recipes";
import type { RecipeEditorValues } from "@/types/recipe-editor";

export interface RecipeWriteRequest {
  title: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  prepTimeMinutes: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  ingredients: { name: string; count: number; measurement: string }[];
  steps: { text: string; title: string | null; imageUrl: string | null }[];
}

export interface ManagedRecipeResponse {
  id: number;
  version: number;
  archived: boolean;
  recipe: RecipeWriteRequest;
}

export interface RecipeUpdateRequest {
  version: number;
  recipe: RecipeWriteRequest;
}

export function managedRecipeToDetail({
  id,
  recipe,
}: ManagedRecipeResponse): RecipeDetail {
  return {
    id,
    slug: recipe.slug,
    title: recipe.title,
    description: recipe.description ?? "",
    image: recipe.imageUrl ?? "",
    approximateTime:
      recipe.prepTimeMinutes === null
        ? "Не указано"
        : `${recipe.prepTimeMinutes} мин`,
    calories: recipe.calories ?? undefined,
    protein: recipe.protein,
    fat: recipe.fat,
    carbohydrates: recipe.carbohydrates,
    components: recipe.ingredients.map(({ name }) => name),
    contentJson: JSON.stringify({
      description: recipe.description ?? "",
      steps: recipe.steps.map((step, index) => ({
        num: index + 1,
        stepTitle: step.title ?? `Шаг ${index + 1}`,
        stepInstruction: step.text,
        imageUrl: step.imageUrl ?? "",
      })),
    }),
  };
}

export function managedRecipeToEditor(
  managed: ManagedRecipeResponse,
): RecipeEditorValues {
  return {
    ...managedRecipeToDetail(managed),
    prepTimeMinutes: managed.recipe.prepTimeMinutes ?? undefined,
    imageFile: null,
    components: managed.recipe.ingredients.map(({ name }) => ({ title: name })),
    steps: managed.recipe.steps.map((step) => ({
      stepTitle: step.title ?? "",
      stepInstruction: step.text,
      imageUrl: step.imageUrl ?? "",
      imageFile: null,
    })),
  };
}
