import type { Recipe, RecipeDetail } from "@/types/recipes";

export interface GetRecipesListResponse {
  recipesNumber: number;
  recipes: Recipe[];
}

export interface GetRecipeDetailResponse {
  recipe: RecipeDetail;
}

export interface RecognizeResponse {
  recognizedIngredients: string[];
  recipeCount: number;
  recipes: Recipe[];
}

export type SearchHistoryResponse = {
  id: number;
  ingredients: string[];
  createdAt: string;
}[];
