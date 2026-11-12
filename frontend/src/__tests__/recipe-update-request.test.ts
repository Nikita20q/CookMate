import { describe, expect, it } from "vitest";
import { buildRecipeUpdateRequest } from "@/api/recipes/update-request";
import type { RecipeEditorValues } from "@/types/recipe-editor";
import { detail } from "./fixtures";

function draft(): RecipeEditorValues {
  return {
    ...detail,
    imageFile: null,
    prepTimeMinutes: 15,
    components: [{ title: "сыр" }, { title: "яйцо" }],
    steps: [
      { stepTitle: "Жарка", stepInstruction: "Новый текст", imageUrl: "/step.jpg", imageFile: null },
      { stepTitle: "Подготовка", stepInstruction: "Взбейте яйца", imageUrl: "", imageFile: null },
    ],
  };
}

describe("Тело обновления рецепта", () => {
  it("собирает актуальные поля и порядок массивов без старого contentJson и внутренних полей формы", () => {
    const values = draft();
    values.title = "Новый рецепт";
    values.calories = undefined;
    const { payload, files, formData } = buildRecipeUpdateRequest(values);
    expect(payload).toEqual({
      title: "Новый рецепт",
      description: detail.description,
      prepTimeMinutes: 15,
      calories: null,
      protein: detail.protein,
      fat: detail.fat,
      carbohydrates: detail.carbohydrates,
      components: ["сыр", "яйцо"],
      image: { url: detail.image },
      steps: [
        { num: 1, stepTitle: "Жарка", stepInstruction: "Новый текст", image: { url: "/step.jpg" } },
        { num: 2, stepTitle: "Подготовка", stepInstruction: "Взбейте яйца", image: null },
      ],
    });
    expect(files).toEqual({});
    expect(JSON.parse(formData.get("recipe") as string)).toEqual(payload);
    expect([...formData.keys()]).toEqual(["recipe"]);
  });

  it("привязывает новые файлы к шагам после перестановки и исключает удалённые фото и шаги", () => {
    const values = draft();
    const mainPhoto = new File(["main"], "main.jpg", { type: "image/jpeg" });
    const stepPhoto = new File(["step"], "step.png", { type: "image/png" });
    values.imageFile = mainPhoto;
    values.steps[0].imageFile = stepPhoto;
    values.steps.reverse();
    let request = buildRecipeUpdateRequest(values);
    expect(request.payload.image).toEqual({ fileKey: "recipeImage" });
    expect(request.payload.steps[1].image).toEqual({ fileKey: "stepImage_2" });
    expect(request.files).toEqual({ recipeImage: mainPhoto, stepImage_2: stepPhoto });
    expect(request.formData.get("recipeImage")).toBe(mainPhoto);
    expect(request.formData.get("stepImage_2")).toBe(stepPhoto);

    values.image = "";
    values.imageFile = null;
    values.steps.pop();
    request = buildRecipeUpdateRequest(values);
    expect(request.payload.image).toBeNull();
    expect(request.payload.steps).toHaveLength(1);
    expect(request.files).toEqual({});
    expect([...request.formData.keys()]).toEqual(["recipe"]);
  });
});
