import { describe, expect, it } from "vitest";
import { buildRecipeUpdateRequest, RECIPE_UPLOAD_UNAVAILABLE } from "@/api/recipes/update-request";
import { managedRecipeToEditor, managedRecipeToDetail } from "@/api/recipes/management";
import { managedFixture } from "./fixtures";

const original = managedFixture();

describe("Обновление рецепта по контракту admin API", () => {
  it("передаёт версию, slug, реальные количества и единицы в новом порядке ингредиентов и шагов", () => {
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
        ingredients: [...original.recipe.ingredients].reverse(),
        steps: [{ ...original.recipe.steps[1], imageUrl: null }, original.recipe.steps[0]],
      },
    });
    expect(request.recipe).not.toHaveProperty("contentJson");
    expect(request.recipe).not.toHaveProperty("components");
    expect(request.recipe).not.toHaveProperty("imageFile");
  });

  it("сохраняет нулевое количество и отправляет null для пустого без заглушки 1", () => {
    const values = managedRecipeToEditor(original);
    values.components[0].quantity = 0;
    values.components[0].measurement = "  г  ";
    values.components[1].quantity = null;
    values.components[1].measurement = "";
    expect(buildRecipeUpdateRequest(values, original).recipe.ingredients).toEqual([
      { name: "яйцо", count: 0, measurement: "г" },
      { name: "сыр", count: null, measurement: "по вкусу" },
    ]);
    delete values.components[1].quantity;
    expect(buildRecipeUpdateRequest(values, original).recipe.ingredients[1].count).toBeNull();
  });

  it("загружает null и отсутствующие поля ответа в пустые поля редактора", () => {
    const managed = { ...original, recipe: { ...original.recipe, ingredients: [
      { name: "соль", count: null, measurement: null },
      { name: "перец" },
    ] } };
    expect(managedRecipeToEditor(managed).components).toEqual([
      { title: "соль", quantity: null, measurement: "" },
      { title: "перец", quantity: null, measurement: "" },
    ]);
  });

  it("сохраняет исходный slug и фото, передаёт необязательные БЖУ и заголовок из формы", () => {
    const values = managedRecipeToEditor(original);
    values.slug = "other-slug";
    values.protein = 0;
    values.fat = null;
    values.carbohydrates = null;
    values.steps[0].stepTitle = "  Подготовим продукты  ";
    const request = buildRecipeUpdateRequest(values, original);
    expect(request.recipe).toMatchObject({
      slug: original.recipe.slug, protein: 0, fat: null, carbohydrates: null,
      imageUrl: original.recipe.imageUrl,
    });
    expect(request.recipe.steps[0]).toMatchObject({ title: "Подготовим продукты", imageUrl: original.recipe.steps[0].imageUrl });
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
    expect(updated.ingredients).toEqual(original.recipe.ingredients.map((ingredient, position) => ({ ...ingredient, position })));
    expect(JSON.parse(updated.contentJson)).toEqual({ description: "Новое описание", steps: [{ num: 1, stepTitle: "Шаг 1", stepInstruction: "Новая инструкция", imageUrl: "https://s3.example/step.jpg" }] });
  });
});
