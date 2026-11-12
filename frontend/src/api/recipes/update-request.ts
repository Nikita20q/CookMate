import type { RecipeEditorValues } from "@/types/recipe-editor";

export type RecipeImageInput = { url: string } | { fileKey: string } | null;

export interface RecipeUpdatePayload {
  title: string;
  description: string;
  prepTimeMinutes: number | null;
  calories: number | null;
  protein: number;
  fat: number;
  carbohydrates: number;
  components: string[];
  image: RecipeImageInput;
  steps: {
    num: number;
    stepTitle: string;
    stepInstruction: string;
    image: RecipeImageInput;
  }[];
}

export function buildRecipeUpdateRequest(values: RecipeEditorValues) {
  const files: Record<string, File> = {};
  const imageInput = (url: string, file: File | null, fileKey: string): RecipeImageInput => {
    if (file) {
      files[fileKey] = file;
      return { fileKey };
    }
    return url ? { url } : null;
  };

  const payload: RecipeUpdatePayload = {
    title: values.title,
    description: values.description,
    prepTimeMinutes: values.prepTimeMinutes ?? null,
    calories: values.calories ?? null,
    protein: values.protein,
    fat: values.fat,
    carbohydrates: values.carbohydrates,
    components: values.components.map(({ title }) => title),
    image: imageInput(values.image, values.imageFile, "recipeImage"),
    steps: values.steps.map((step, index) => ({
      num: index + 1,
      stepTitle: step.stepTitle,
      stepInstruction: step.stepInstruction,
      image: imageInput(step.imageUrl, step.imageFile, `stepImage_${index + 1}`),
    })),
  };
  const formData = new FormData();
  formData.append("recipe", JSON.stringify(payload));
  Object.entries(files).forEach(([key, file]) => formData.append(key, file));

  return { payload, files, formData };
}
