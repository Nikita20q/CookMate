import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { useAuthStore } from "@/store/auth";
import { detail, managedFixture, recipe, token } from "./fixtures";
import { mockRecipeManagement, renderApp } from "./helpers";

beforeEach(() => {
  mockRecipeManagement();
  useAuthStore.getState().setAccessToken(token());
  vi.spyOn(authApi, "me").mockResolvedValue({ userId: 1, email: "admin@example.com", isStaff: true });
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 0, recipes: [] });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
});

async function openEditor() {
  const app = await renderApp(`/recipes/${recipe.slug}`);
  await app.user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
  return app;
}

function ingredientList() {
  return within(screen.getByRole("list", { name: "Ингредиенты рецепта" }));
}

function ingredientNames() {
  return ingredientList().getAllByRole("listitem").map((row) =>
    within(row).getByRole("button", { name: /^Редактировать ингредиент/ })
      .getAttribute("aria-label")?.replace("Редактировать ингредиент ", ""));
}

function mockIngredientRects() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const list = this.tagName === "UL" ? this : this.parentElement;
    if (list?.getAttribute("aria-label") === "Ингредиенты рецепта") {
      const index = [...list.children].indexOf(this);
      return new DOMRect(0, index < 0 ? 0 : index * 120, 400, index < 0 ? list.children.length * 120 : 112);
    }
    return new DOMRect(0, 0, 400, 600);
  });
}

describe("Редактор ингредиентов рецепта", () => {
  it("добавляет ингредиент в конец черновика и удаляет незавершённую строку при отмене", async () => {
    const { user, client } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Добавить ингредиент" }));
    const input = screen.getByRole("textbox", { name: "Название ингредиента" });
    expect(input).toHaveFocus();
    expect(ingredientList().getAllByRole("listitem")).toHaveLength(3);
    await user.type(input, "  соль  {Enter}");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Название ингредиента" })).not.toBeInTheDocument());
    expect(ingredientNames()).toEqual(["яйцо", "сыр", "соль"]);
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Добавить ингредиент" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменение ингредиента" }));
    expect(ingredientList().getAllByRole("listitem")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientNames()).toEqual(["яйцо", "сыр"]);
  });

  it("показывает управление только в режиме редактирования администратора", async () => {
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await screen.findByRole("heading", { name: detail.title });
    expect(screen.queryByRole("list", { name: "Ингредиенты рецепта" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientList().getAllByRole("listitem")).toHaveLength(2);
    expect(ingredientList().getByRole("button", { name: "Переместить ингредиент яйцо" })).toBeVisible();
    expect(ingredientList().getByRole("button", { name: "Редактировать ингредиент яйцо" })).toBeVisible();
    expect(ingredientList().getByRole("button", { name: "Удалить ингредиент яйцо" })).toBeVisible();
  });

  it("изменяет название, проверяет пустое значение и сохраняет исходный рецепт в кеше", async () => {
    const { user, client } = await openEditor();
    await user.click(ingredientList().getByRole("button", { name: "Редактировать ингредиент яйцо" }));
    const input = screen.getByRole("textbox", { name: "Название ингредиента" });
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "Применить название ингредиента" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Введите название ингредиента");
    await user.clear(input);
    await user.type(input, "  Зелёный   лук  {Enter}");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Название ингредиента" })).not.toBeInTheDocument());
    expect(ingredientList().getByText("Зелёный лук")).toBeVisible();
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientList().getByText("яйцо")).toBeVisible();
    expect(ingredientList().queryByText("Зелёный лук")).not.toBeInTheDocument();
  });

  it("сохраняет редактируемую строку при удалении предыдущей и откатывает по Escape", async () => {
    const { user } = await openEditor();
    await user.click(ingredientList().getByRole("button", { name: "Редактировать ингредиент сыр" }));
    await user.clear(screen.getByRole("textbox", { name: "Название ингредиента" }));
    await user.type(screen.getByRole("textbox", { name: "Название ингредиента" }), "Моцарелла");
    await user.click(ingredientList().getByRole("button", { name: "Удалить ингредиент яйцо" }));
    expect(ingredientList().getAllByRole("listitem")).toHaveLength(1);
    const input = screen.getByRole("textbox", { name: "Название ингредиента" });
    expect(input).toHaveValue("Моцарелла");
    await user.click(input);
    await user.keyboard("{Escape}");
    expect(ingredientList().getByText("сыр")).toBeVisible();
    expect(ingredientList().getByRole("button", { name: "Переместить ингредиент сыр" })).toBeDisabled();
  });

  it("позволяет удалить все ингредиенты и восстановить их общей отменой", async () => {
    const { user } = await openEditor();
    await user.click(ingredientList().getByRole("button", { name: "Удалить ингредиент яйцо" }));
    await user.click(ingredientList().getByRole("button", { name: "Удалить ингредиент сыр" }));
    expect(ingredientList().queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText("В рецепте нет ингредиентов.")).toBeVisible();
    expect(screen.getByText("0% совпадение")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientNames()).toEqual(["яйцо", "сыр"]);
  });

  it("перемещает ингредиенты клавиатурой по вертикали и откатывает порядок общей отменой", async () => {
    mockIngredientRects();
    const { user, client } = await openEditor();
    const handle = ingredientList().getByRole("button", { name: "Переместить ингредиент яйцо" });
    act(() => handle.focus());
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(handle.closest("li")?.style.transform).toMatch(/^translate3d\(0px,/);
    await user.keyboard(" ");
    await waitFor(() => expect(ingredientNames()).toEqual(["сыр", "яйцо"]));
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientNames()).toEqual(["яйцо", "сыр"]);
  });

  it("сохраняет новый порядок вместе с количеством и показывает актуальный ответ сервера", async () => {
    mockIngredientRects();
    const saved = managedFixture();
    saved.version = 8;
    saved.recipe.ingredients = [
      { name: "сыр", count: 1.5, measurement: "стакана" },
      { name: "яйцо", count: null, measurement: null },
    ];
    const save = vi.spyOn(recipesApi, "updateRecipe").mockResolvedValue(saved);
    const { user, client } = await openEditor();
    expect(screen.getByLabelText("Количество ингредиента яйцо")).toHaveValue(2);
    expect(screen.getByLabelText("Единица измерения ингредиента сыр")).toHaveValue("г");
    await user.clear(screen.getByLabelText("Количество ингредиента сыр"));
    await user.type(screen.getByLabelText("Количество ингредиента сыр"), "12.5");
    const handle = ingredientList().getByRole("button", { name: "Переместить ингредиент яйцо" });
    act(() => handle.focus());
    await user.keyboard(" {ArrowDown}{ArrowDown}{ArrowDown} ");
    await waitFor(() => expect(ingredientNames()).toEqual(["сыр", "яйцо"]));
    expect(screen.getByLabelText("Количество ингредиента сыр")).toHaveValue(12.5);
    expect(screen.getByLabelText("Количество ингредиента яйцо")).toHaveValue(2);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(recipe.id, expect.objectContaining({
      version: 7, recipe: expect.objectContaining({ ingredients: [
        { name: "сыр", count: 12.5, measurement: "г" },
        { name: "яйцо", count: 2, measurement: "шт." },
      ] }),
    })));
    expect(await screen.findByText("1.5 стакана")).toBeVisible();
    expect(client.getQueryData(["recipes", recipe.slug])).toMatchObject({
      components: ["сыр", "яйцо"], ingredients: saved.recipe.ingredients,
    });
    vi.mocked(recipesApi.getManagedRecipe).mockResolvedValue(saved);
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientNames()).toEqual(["сыр", "яйцо"]);
    expect(screen.getByLabelText("Количество ингредиента сыр")).toHaveValue(1.5);
    expect(screen.getByLabelText("Количество ингредиента яйцо")).toHaveValue(null);
    expect(screen.getByLabelText("Единица измерения ингредиента яйцо")).toHaveValue("");
  });
});
