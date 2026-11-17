export interface Recipe {
  id: number | string;
  title: string;
  slug: string;
  description: string;
  image?: string;
  calories?: number;
  approximateTime: string;
  components: string[];
}

export interface RecipeDetail {
  id: number | string;
  slug?: string;
  title: string;
  image: string;
  components: string[];
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
