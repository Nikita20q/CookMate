import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { managedRecipeToDetail } from "@/api/recipes/management";
import { useAuthStore } from "@/store/auth";
import { detail, managedFixture, recipe, token } from "./fixtures";
import { renderApp } from "./helpers";

beforeEach(() => {
  useAuthStore.getState().setAccessToken(token());
  vi.spyOn(authApi, "me").mockResolvedValue({ userId: 1, email: "admin@example.com", isStaff: true });
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 0, recipes: [] });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
  vi.spyOn(recipesApi, "getManagedRecipe").mockResolvedValue(managedFixture());
});

async function openEditor() {
  const app = await renderApp(`/recipes/${recipe.slug}`);
  await app.user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
  return app;
}

describe("Все поля рецепта", () => {
  it("сохраняет все поля БЖУ и черновик при смене ширины панели и повторном открытии редактора", async () => {
    let wide = false;
    const listeners = new Set<() => void>();
    const original = vi.mocked(window.matchMedia).getMockImplementation()!;
    vi.mocked(window.matchMedia).mockImplementation((query) => query !== "(min-width: 80rem)" ? original(query) : ({
      ...original(query),
      get matches() { return wide; },
      addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener as () => void),
      removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener as () => void),
    }));
    const parsed = managedFixture();
    parsed.recipe.protein = null;
    parsed.recipe.fat = 0;
    parsed.recipe.carbohydrates = null;
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(parsed);
    const { user } = await openEditor();
    await user.type(screen.getByLabelText("Белки"), "25");
    for (const width of [true, false, true, false]) {
      act(() => {
        wide = width;
        [...listeners].forEach((listener) => listener());
      });
      const nutrition = within(screen.getByRole("group", { name: "Пищевая ценность" }));
      expect(nutrition.getByLabelText("Белки")).toBeVisible();
      expect(nutrition.getByLabelText("Белки")).toHaveValue(25);
      expect(nutrition.getByLabelText("Жиры")).toHaveValue(0);
      expect(nutrition.getByLabelText("Углеводы")).toHaveValue(null);
    }
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    for (const width of [true, false]) {
      act(() => {
        wide = width;
        [...listeners].forEach((listener) => listener());
      });
      const nutrition = within(screen.getByRole("group", { name: "Пищевая ценность" }));
      expect(nutrition.getByText("Белки")).toBeVisible();
      expect(nutrition.getByText("Жиры")).toBeVisible();
      expect(nutrition.getByText("Углеводы")).toBeVisible();
      expect(nutrition.getByText("15 г")).toBeVisible();
    }
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByLabelText("Белки")).toHaveValue(null);
    expect(screen.getByLabelText("Жиры")).toHaveValue(0);
    expect(screen.getByLabelText("Углеводы")).toHaveValue(null);
  });

  it("показывает все поля при пустом БЖУ, фоновом обновлении и повторных переключениях режима", async () => {
    const parsed = managedFixture();
    parsed.recipe.protein = null;
    parsed.recipe.fat = null;
    parsed.recipe.carbohydrates = null;
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(parsed);
    const { user, client } = await openEditor();
    for (let iteration = 0; iteration < 3; iteration++) {
      act(() => client.setQueryData(["recipes", recipe.slug], { ...detail, protein: null, fat: null, carbohydrates: null }));
      const nutrition = within(screen.getByRole("group", { name: "Пищевая ценность" }));
      for (const label of ["Белки", "Жиры", "Углеводы"]) {
        expect(nutrition.getByLabelText(label)).toBeVisible();
        expect(nutrition.getByLabelText(label)).toHaveValue(null);
      }
      await user.click(screen.getByRole("button", { name: "Отменить" }));
      await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
      expect(within(screen.getByRole("group", { name: "Пищевая ценность" })).getAllByText("Не указано")).toHaveLength(3);
      await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    }
  });

  it("показывает БЖУ и заголовки шагов гостю, различает ноль и неизвестное значение", async () => {
    useAuthStore.getState().clearAuth();
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({ ...detail, protein: 0, fat: null, carbohydrates: null });
    await renderApp(`/recipes/${recipe.slug}`);
    const nutrition = within(await screen.findByRole("group", { name: "Пищевая ценность" }));
    expect(nutrition.getByText("0 г")).toBeVisible();
    expect(nutrition.getAllByText("Не указано")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Подготовка" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Жарка" })).toBeVisible();
    expect(screen.queryByLabelText("Белки")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Редактировать рецепт" })).not.toBeInTheDocument();
  });

  it("отправляет новые БЖУ и заголовок, отображает ответ сервера без перезагрузки", async () => {
    const saved = managedFixture();
    saved.version = 8;
    saved.recipe.protein = 23;
    saved.recipe.fat = 0;
    saved.recipe.carbohydrates = null;
    saved.recipe.imageUrl = "https://s3.example/main.jpg";
    saved.recipe.steps[0] = { text: "Взбейте яйца", title: "Заголовок от сервера", imageUrl: "https://s3.example/step.jpg" };
    const save = vi.spyOn(recipesApi, "updateRecipe").mockResolvedValue(saved);
    const { user, client } = await openEditor();
    expect(screen.getByLabelText("Белки")).toHaveValue(15);
    expect(screen.getByLabelText("Жиры")).toHaveValue(20);
    expect(screen.getByLabelText("Углеводы")).toHaveValue(3);
    expect(screen.queryByLabelText(/slug|слаг|адрес рецепта/i)).not.toBeInTheDocument();
    for (const [label, value] of [["Белки", "21"], ["Жиры", "0"], ["Углеводы", ""]]) {
      await user.clear(screen.getByLabelText(label));
      if (value) await user.type(screen.getByLabelText(label), value);
    }
    expect(screen.queryByLabelText("URL главной фотографии")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Редактировать шаг 1" }));
    await user.clear(screen.getByLabelText("Заголовок шага 1"));
    await user.type(screen.getByLabelText("Заголовок шага 1"), "  Подготовим продукты  ");
    expect(screen.queryByLabelText("URL фотографии шага 1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Применить изменения шага 1" }));
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(recipe.id, expect.objectContaining({
      version: 7,
      recipe: expect.objectContaining({
        slug: recipe.slug, protein: 21, fat: 0, carbohydrates: null,
        imageUrl: detail.image,
        steps: [
          { title: "Подготовим продукты", text: "Взбейте яйца", imageUrl: null },
          saved.recipe.steps[1],
        ],
      }),
    })));
    expect(await screen.findByRole("heading", { name: "Заголовок от сервера" })).toBeVisible();
    const nutrition = within(screen.getByRole("group", { name: "Пищевая ценность" }));
    expect(nutrition.getByText("23 г")).toBeVisible();
    expect(nutrition.getByText("0 г")).toBeVisible();
    expect(nutrition.getByText("Не указано")).toBeVisible();
    expect(screen.getByRole("img", { name: detail.title })).toHaveAttribute("src", saved.recipe.imageUrl);
    expect(screen.getByRole("img", { name: "Шаг 1" })).toHaveAttribute("src", saved.recipe.steps[0].imageUrl);
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(managedRecipeToDetail(saved));
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(saved);
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByLabelText("Белки")).toHaveValue(23);
    expect(screen.getByLabelText("Жиры")).toHaveValue(0);
    expect(screen.getByLabelText("Углеводы")).toHaveValue(null);
  });

  it.each(["Белки", "Жиры", "Углеводы"])("позволяет очистить поле %s и отправляет null", async (label) => {
    const save = vi.spyOn(recipesApi, "updateRecipe").mockResolvedValue({ ...managedFixture(), version: 8 });
    const { user } = await openEditor();
    const input = screen.getByLabelText(label);
    expect(input).not.toBeRequired();
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    const field = { Белки: "protein", Жиры: "fat", Углеводы: "carbohydrates" }[label]!;
    await waitFor(() => expect(save).toHaveBeenCalledWith(recipe.id, expect.objectContaining({
      recipe: expect.objectContaining({ [field]: null }),
    })));
  });

  it.each([
    ["Белки", "-1"], ["Жиры", "1.5"], ["Углеводы", "2147483648"],
  ])("отклоняет недопустимое значение %s: %s", async (label, value) => {
    const save = vi.spyOn(recipesApi, "updateRecipe");
    const { user } = await openEditor();
    const input = screen.getByLabelText(label);
    await user.clear(input);
    await user.type(input, value);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Укажите целое неотрицательное число до 2147483647 или оставьте поле пустым")).toBeVisible();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(save).not.toHaveBeenCalled();
  });

  it("отменяет заголовок шага вместе с текстом", async () => {
    const { user } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Редактировать шаг 2" }));
    await user.clear(screen.getByLabelText("Заголовок шага 2"));
    await user.type(screen.getByLabelText("Заголовок шага 2"), "Другой заголовок");
    await user.click(screen.getByRole("button", { name: "Удалить фотографию шага 2" }));
    await user.click(screen.getByLabelText("Заголовок шага 2"));
    await user.keyboard("{Escape}");
    expect(screen.getByText("Жарка")).toBeVisible();
    expect(screen.queryByText("Другой заголовок")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Фотография шага 2" })).toHaveAttribute("src", "https://images.example.com/step.jpg");
  });

  it("показывает ошибку длинного заголовка без отправки запроса", async () => {
    const save = vi.spyOn(recipesApi, "updateRecipe");
    const { user } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Редактировать шаг 1" }));
    await user.clear(screen.getByLabelText("Заголовок шага 1"));
    await user.click(screen.getByLabelText("Заголовок шага 1"));
    await user.paste("ш".repeat(256));
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Заголовок шага не должен превышать 255 символов")).toBeVisible();
    expect(save).not.toHaveBeenCalled();
  });
});
