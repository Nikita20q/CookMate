import type { RecipeDetail } from "./recipes";

export interface RecipeEditorStep {
  stepTitle: string;
  stepInstruction: string;
  imageUrl: string;
  imageFile: File | null;
}

export type RecipeEditorValues = Omit<RecipeDetail, "components"> & {
  components: { title: string }[];
  steps: RecipeEditorStep[];
};
