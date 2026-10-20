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
  components: string[];
  description: string;
  calories?: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  approximateTime: string;
  contentJson: string;
}

export interface RecipeComponent {
  title: string;
  quantity: string;
  measurement: string;
  available: boolean;
}
