import type { RecipeDetail } from "./recipes";

export interface RecipeEditorStep {
  stepTitle: string;
  stepInstruction: string;
  imageUrl: string;
  imageFile: File | null;
}

export type RecipeEditorValues = Omit<RecipeDetail, "components" | "approximateTime"> & {
  prepTimeMinutes?: number;
  imageFile: File | null;
  components: { title: string }[];
  steps: RecipeEditorStep[];
};
