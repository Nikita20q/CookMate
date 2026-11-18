import type { RecipeDetail } from "./recipes";

export interface RecipeEditorStep {
  stepTitle: string;
  stepInstruction: string;
  imageUrl: string;
  imageFile: File | null;
}

export interface RecipeEditorIngredient {
  title: string;
  quantity?: number | null;
  measurement?: string;
}

export type RecipeEditorValues = Omit<RecipeDetail, "components" | "approximateTime"> & {
  prepTimeMinutes?: number;
  imageFile: File | null;
  components: RecipeEditorIngredient[];
  steps: RecipeEditorStep[];
};
