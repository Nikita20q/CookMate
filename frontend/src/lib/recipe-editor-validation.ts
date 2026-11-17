import type { FieldError, FieldErrors, Resolver } from "react-hook-form";
import type { RecipeEditorValues } from "@/types/recipe-editor";

const MAX_INTEGER = 2_147_483_647;
const error = (message: string): FieldError => ({ type: "validate", message });

export function parseRecipeMinutes(value: string): number | undefined {
  const match = value.match(/^\s*(\d+)\s*(?:мин(?:ут(?:а|ы)?)?\.?)?\s*$/iu);
  if (!match) return undefined;
  const minutes = Number(match[1]);
  return Number.isInteger(minutes) && minutes > 0 && minutes <= MAX_INTEGER ? minutes : undefined;
}

export const recipeEditorResolver: Resolver<RecipeEditorValues> = (values) => {
  const errors: FieldErrors<RecipeEditorValues> = {};
  const title = values.title?.trim() ?? "";
  const time = values.prepTimeMinutes;
  const calories = values.calories;

  if (!title) errors.title = error("Введите название рецепта");
  else if (title.length > 255) errors.title = error("Название не должно превышать 255 символов");

  if (time === undefined || time === null) errors.prepTimeMinutes = error("Укажите время приготовления");
  else if (!Number.isInteger(time) || time <= 0 || time > MAX_INTEGER) {
    errors.prepTimeMinutes = error("Укажите целое количество минут от 1 до 2147483647");
  }

  if (calories === undefined || calories === null) errors.calories = error("Укажите калорийность");
  else if (!Number.isInteger(calories) || calories < 0 || calories > MAX_INTEGER) {
    errors.calories = error("Калорийность должна быть целым неотрицательным числом до 2147483647");
  }

  if (!values.image?.trim() && !values.imageFile) errors.image = error("Добавьте главную фотографию рецепта");
  if ((values.description?.length ?? 0) > 20000) errors.description = error("Описание не должно превышать 20000 символов");

  if (!values.components?.length) errors.components = { root: error("Добавьте хотя бы один ингредиент") };
  else if (values.components.length > 100) errors.components = { root: error("Допустимо не более 100 ингредиентов") };
  const names = new Set<string>();
  values.components?.forEach((ingredient, index) => {
    const name = ingredient.title.trim().replace(/\s+/g, " ");
    const ingredientErrors: { title?: FieldError } = {};
    if (!name) ingredientErrors.title = error("Введите название ингредиента");
    else if (name.length > 100) ingredientErrors.title = error("Название ингредиента не должно превышать 100 символов");
    else if (names.has(name.toLowerCase())) ingredientErrors.title = error("Ингредиенты не должны повторяться");
    names.add(name.toLowerCase());
    if (Object.keys(ingredientErrors).length) {
      errors.components ??= {};
      errors.components[index] = ingredientErrors;
    }
  });

  if (!values.steps?.length) errors.steps = { root: error("Добавьте хотя бы один шаг инструкции") };
  else if (values.steps.length > 100) errors.steps = { root: error("Допустимо не более 100 шагов") };
  values.steps?.forEach((step, index) => {
    if (!step.stepInstruction.trim()) {
      errors.steps ??= {};
      errors.steps[index] = { stepInstruction: error("Введите текст инструкции") };
    }
    if (step.stepInstruction.length > 10000 || step.stepTitle.length > 255) {
      errors.steps ??= {};
      errors.steps[index] = { stepInstruction: error("Текст шага — до 10000 символов, заголовок — до 255") };
    }
  });

  if (Object.keys(errors).length) return { values: {}, errors };
  return {
    values: {
      ...values,
      title,
      components: values.components.map((ingredient) => ({ title: ingredient.title.trim().replace(/\s+/g, " ") })),
      steps: values.steps.map((step) => ({ ...step, stepInstruction: step.stepInstruction.trim() })),
    },
    errors: {},
  };
};
