import { describe, expect, it } from "vitest";
import { buildRecipeUpdateRequest, RECIPE_UPLOAD_UNAVAILABLE } from "@/api/recipes/update-request";
import { managedRecipeToEditor, managedRecipeToDetail } from "@/api/recipes/management";
import { managedFixture } from "./fixtures";

const original = managedFixture();

describe("Обновление рецепта по контракту admin API", () => {
  it("передаёт версию, slug, заглушку 1 шт для всех ингредиентов и новый порядок шагов", () => {
    const values = managedRecipeToEditor(original);
    values.title = "Новый рецепт";
    values.calories = undefined;
    values.components.reverse();
    values.steps.reverse();
    values.steps[0].imageUrl = "";
    const request = buildRecipeUpdateRequest(values, original);
    expect(request).toEqual({
      version: 7,
      recipe: {
        ...original.recipe, title: "Новый рецепт", calories: null,
        ingredients: [...original.recipe.ingredients].reverse().map(({ name }) => ({ name, count: 1, measurement: "шт" })),
        steps: [{ ...original.recipe.steps[1], imageUrl: null }, original.recipe.steps[0]],
      },
    });
    expect(request.recipe).not.toHaveProperty("contentJson");
    expect(request.recipe).not.toHaveProperty("components");
    expect(request.recipe).not.toHaveProperty("imageFile");
  });

  it.each(["main", "step"])("не теряет новый файл %s и не отправляет blob URL вместо фото", (target) => {
    const values = managedRecipeToEditor(original);
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    if (target === "main") values.imageFile = file;
    else values.steps[0].imageFile = file;
    expect(() => buildRecipeUpdateRequest(values, original)).toThrow(RECIPE_UPLOAD_UNAVAILABLE);
  });

  it("преобразует серверный ответ в видимые поля и contentJson без старых значений", () => {
    const saved = { ...original, version: 8, recipe: { ...original.recipe, title: "Сохранено сервером", description: "Новое описание", prepTimeMinutes: 40, steps: [{ text: "Новая инструкция", title: null, imageUrl: "https://s3.example/step.jpg" }] } };
    const updated = managedRecipeToDetail(saved);
    expect(updated.title).toBe("Сохранено сервером");
    expect(updated.approximateTime).toBe("40 мин");
    expect(JSON.parse(updated.contentJson)).toEqual({ description: "Новое описание", steps: [{ num: 1, stepTitle: "Шаг 1", stepInstruction: "Новая инструкция", imageUrl: "https://s3.example/step.jpg" }] });
  });
});
