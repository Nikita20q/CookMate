import type { Recipe, RecipeDetail } from "@/types/recipes";
import type { ManagedRecipeResponse } from "@/api/recipes/management";

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

export function managedFixture(source: RecipeDetail = detail): ManagedRecipeResponse {
  const content = JSON.parse(source.contentJson || "{}");
  return {
    id: Number(source.id), version: 7, archived: false,
    recipe: {
      title: source.title, slug: source.slug ?? recipe.slug,
      description: content.description ?? source.description,
      imageUrl: source.image || null,
      prepTimeMinutes: Number.parseInt(source.approximateTime) || null,
      calories: source.calories ?? null,
      protein: source.protein, fat: source.fat, carbohydrates: source.carbohydrates,
      ingredients: source.components.map((name, index) => ({ name, count: index === 0 ? 2 : 50, measurement: index === 0 ? "шт." : "г" })),
      steps: (content.steps ?? []).map((step: { stepInstruction: string; stepTitle: string; imageUrl: string }) => ({
        text: step.stepInstruction, title: step.stepTitle, imageUrl: step.imageUrl || null,
      })),
    },
  };
}
