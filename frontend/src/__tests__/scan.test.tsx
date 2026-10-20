import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { useIngredientsStore } from "@/store/ingredients";
import type { RecognizeResponse } from "@/api/recipes/types";
import { recipe } from "./fixtures";
import { deferred, renderApp } from "./helpers";

beforeEach(() => {
  vi.spyOn(recipesApi, "recognize").mockResolvedValue({
    recognizedIngredients: ["ЯЙЦО", "Сыр"],
    recipes: [recipe],
    recipeCount: 1,
  });
  vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
    recognizedIngredients: [],
    recipes: [recipe],
    recipeCount: 1,
  });
});

describe("Сканирование продуктов", () => {
  it("показывает отсутствие предыдущего сканирования", async () => {
    await renderApp("/");
    expect(screen.getByText("Ингредиенты не найдены")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Найти рецепты с этими ингредиентами" }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("загружает фото, сохраняет распознанные продукты и открывает рецепты", async () => {
    const { user, router } = await renderApp("/");
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["photo"], "fridge.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/recipes"),
    );
    expect(recipesApi.recognize).toHaveBeenCalledWith(file, expect.anything());
    expect(useIngredientsStore.getState().currentIngredients).toEqual([
      "яйцо",
      "сыр",
    ]);
    expect(input.value).toBe("");
  });

  it("блокирует повторную загрузку во время распознавания", async () => {
    const response = deferred<RecognizeResponse>();
    vi.mocked(recipesApi.recognize).mockReturnValue(response.promise);
    const { user } = await renderApp("/");
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(
      input,
      new File(["photo"], "fridge.png", { type: "image/png" }),
    );
    expect(screen.getByRole("button", { name: "Загрузка..." })).toBeDisabled();
    await act(async () =>
      response.resolve({
        recognizedIngredients: [],
        recipeCount: 0,
        recipes: [],
      }),
    );
  });

  it("показывает ошибку распознавания и разрешает новую попытку", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(recipesApi.recognize).mockRejectedValue(
      new Error("ML недоступен"),
    );
    const { user, router } = await renderApp("/");
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(
      input,
      new File(["photo"], "fridge.jpg", { type: "image/jpeg" }),
    );
    expect(
      await screen.findByText(
        "Не удалось распознать продукты. Попробуйте загрузить фото ещё раз.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Загрузите изображение" }),
    ).toBeEnabled();
    expect(router.state.location.pathname).toBe("/");
  });

  it("не отправляет запрос при отмене выбора файла", async () => {
    await renderApp("/");
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [] },
    });
    expect(recipesApi.recognize).not.toHaveBeenCalled();
  });

  it.todo("снимает фотографию через камеру");
  it.todo("принимает изображение перетаскиванием");
});
