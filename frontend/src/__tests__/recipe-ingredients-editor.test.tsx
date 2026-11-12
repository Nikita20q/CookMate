import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi } from "@/api/auth/api";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { useAuthStore } from "@/store/auth";
import { detail, recipe, token } from "./fixtures";
import { renderApp } from "./helpers";

beforeEach(() => {
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

describe("Редактор ингредиентов рецепта", () => {
  it("добавляет ингредиент в конец черновика и удаляет незавершённую строку при отмене", async () => {
    const { user, client } = await openEditor();
    await user.click(screen.getByRole("button", { name: "Добавить ингредиент" }));
    const input = screen.getByRole("textbox", { name: "Название ингредиента" });
    expect(input).toHaveFocus();
    expect(ingredientList().getAllByRole("listitem")).toHaveLength(3);
    await user.type(input, "  соль  {Enter}");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Название ингредиента" })).not.toBeInTheDocument());
    expect(ingredientList().getAllByRole("listitem").map((row) => row.textContent)).toEqual(["яйцо", "сыр", "соль"]);
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Добавить ингредиент" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменение ингредиента" }));
    expect(ingredientList().getAllByRole("listitem")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientList().getAllByRole("listitem").map((row) => row.textContent)).toEqual(["яйцо", "сыр"]);
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
    expect(ingredientList().getAllByRole("listitem").map((row) => row.textContent)).toEqual(["яйцо", "сыр"]);
  });

  it("перемещает ингредиенты клавиатурой по вертикали и откатывает порядок общей отменой", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const list = this.tagName === "UL" ? this : this.parentElement;
      if (list?.getAttribute("aria-label") === "Ингредиенты рецепта") {
        const index = [...list.children].indexOf(this);
        return new DOMRect(0, index < 0 ? 0 : index * 64, 400, index < 0 ? list.children.length * 64 : 56);
      }
      return new DOMRect(0, 0, 400, 600);
    });
    const { user, client } = await openEditor();
    const handle = ingredientList().getByRole("button", { name: "Переместить ингредиент яйцо" });
    act(() => handle.focus());
    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(handle.closest("li")?.style.transform).toMatch(/^translate3d\(0px,/);
    await user.keyboard(" ");
    await waitFor(() => expect(ingredientList().getAllByRole("listitem").map((row) => row.textContent)).toEqual(["сыр", "яйцо"]));
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(ingredientList().getAllByRole("listitem").map((row) => row.textContent)).toEqual(["яйцо", "сыр"]);
  });
});
