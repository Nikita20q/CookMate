export interface RecipeIngredient {
  name: string;
  count?: number | null;
  measurement?: string | null;
  position?: number;
}

export interface Recipe {
  id: number | string;
  title: string;
  slug: string;
  description: string;
  image?: string;
  calories?: number;
  protein?: number | null;
  fat?: number | null;
  carbohydrates?: number | null;
  approximateTime: string;
  components: string[];
  ingredients?: RecipeIngredient[];
}

export interface RecipeDetail {
  id: number | string;
  slug?: string;
  title: string;
  image: string;
  components: string[];
  ingredients?: RecipeIngredient[];
  description: string;
  calories?: number;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  approximateTime: string;
  contentJson: string;
}

export interface RecipeComponent {
  title: string;
  quantity: string;
  measurement: string;
  available: boolean;
}
