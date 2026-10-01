export interface Recipe {
  id: number;
  title: string;
  slug: string;
  description: string;
  image?: string;
  calories?: number;
  approximateTime: string;
  components: string[];
}

export interface RecipeDetail {
  id: string;
  title: string;
  image: string;
  components: RecipeComponent[];
  description: string;
  calories?: number;
  pfc?: PFCType;
  approximateTime: string;
  content: string;
}

export interface RecipeComponent {
  title: string;
  quantity: string;
  measurement: string;
  available: boolean;
}

export interface PFCType {
  protein: number;
  fat: number;
  carbohydrates: number;
}
