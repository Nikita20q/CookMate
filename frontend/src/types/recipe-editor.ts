import type { RecipeDetail } from "./recipes";

export type RecipeEditorValues = Omit<RecipeDetail, "components"> & {
  components: { title: string }[];
};
