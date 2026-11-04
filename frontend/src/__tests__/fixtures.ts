import type { Recipe, RecipeDetail } from "@/types/recipes";

export const token = (id = "1", exp = 4_000_000_000) =>
  `header.${btoa(JSON.stringify({ sub: id, exp }))}.signature`;

export const recipe: Recipe = {
  id: 42,
  title: "Омлет с сыром",
  slug: "omlet-s-syrom",
  description: "Простой завтрак из яиц и сыра",
  image: "/omlet.jpg",
  calories: 240,
  approximateTime: "15 минут",
  components: ["яйцо", "сыр"],
};

export const secondRecipe: Recipe = {
  ...recipe,
  id: 43,
  title: "Салат из овощей",
  slug: "salat",
};

export const detail: RecipeDetail = {
  ...recipe,
  image: "/omlet.jpg",
  protein: 15,
  fat: 20,
  carbohydrates: 3,
  contentJson: JSON.stringify({
    description: recipe.description,
    steps: [
      {
        num: 1,
        imageUrl: "",
        stepTitle: "Подготовка",
        stepInstruction: "Взбейте яйца",
      },
      {
        num: 2,
        imageUrl: "/step.jpg",
        stepTitle: "Жарка",
        stepInstruction: "Добавьте сыр и обжарьте омлет",
      },
    ],
  }),
};

export const authResponse = {
  token: token(),
  userId: 1,
  email: "cook@example.com",
  message: "Успешно",
};
