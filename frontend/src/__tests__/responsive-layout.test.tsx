import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { useIngredientsStore } from "@/store/ingredients";
import { renderApp } from "./helpers";
import { recipe } from "./fixtures";

function mobileViewport() {
  const original = vi.mocked(window.matchMedia).getMockImplementation()!;
  vi.mocked(window.matchMedia).mockImplementation((query) => ({
    ...original(query), matches: false,
  }));
}

describe("Выезжающие меню", () => {
  it("открывает навигацию, удерживает фокус и закрывается по Escape", async () => {
    mobileViewport();
    const { user } = await renderApp("/");
    const trigger = screen.getByRole("button", { name: "Открыть навигацию" });
    expect(screen.queryByRole("link", { name: "Избранное" })).not.toBeInTheDocument();
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Навигация" });
    const close = within(dialog).getByRole("button", { name: "Закрыть: Навигация" });
    expect(close).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    await user.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("закрывает навигацию после выбора страницы", async () => {
    mobileViewport();
    const { user, router } = await renderApp("/");
    await user.click(screen.getByRole("button", { name: "Открыть навигацию" }));
    await user.click(screen.getByRole("link", { name: "Избранное" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/favorites"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("управляет ингредиентами из плавающей кнопки и закрывается по затемнению", async () => {
    mobileViewport();
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"], recipeCount: 1, recipes: [recipe],
    });
    vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
      recognizedIngredients: ["яйцо", "сыр"], recipeCount: 1, recipes: [recipe],
    });
    const { user } = await renderApp("/recipes");
    const trigger = screen.getByRole("button", { name: "Управлять ингредиентами" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Ингредиенты" });
    await user.click(within(dialog).getByText("+"));
    await user.type(within(dialog).getByPlaceholderText("Введите ингредиент"), "Сыр");
    await user.click(within(dialog).getByRole("button", { name: "Добавить" }));
    await waitFor(() => expect(recipesApi.findByIngredients).toHaveBeenCalledWith(["яйцо", "сыр"]));
    await user.click(within(dialog).getByText("сыр", { selector: "span" }));
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    fireEvent.click(dialog.previousElementSibling!);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("открывает форму из пустого состояния при скрытой панели", async () => {
    mobileViewport();
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByRole("button", { name: "Добавить ингредиенты" }));
    const dialog = screen.getByRole("dialog", { name: "Ингредиенты" });
    expect(within(dialog).getByPlaceholderText("Введите ингредиент")).toBeVisible();
  });

  it("снимает блокировку прокрутки при расширении экрана", async () => {
    let wide = false;
    const listeners = new Set<() => void>();
    const original = vi.mocked(window.matchMedia).getMockImplementation()!;
    vi.mocked(window.matchMedia).mockImplementation((query) => ({
      ...original(query),
      matches: wide,
      addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener as () => void),
      removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener as () => void),
    }));
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByRole("button", { name: "Управлять ингредиентами" }));
    expect(document.body.style.overflow).toBe("hidden");
    act(() => { wide = true; listeners.forEach((listener) => listener()); });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Панель ингредиентов на большом экране", () => {
  it("сворачивается, восстанавливается и не теряет ингредиенты", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"], recipeCount: 1, recipes: [recipe],
    });
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByRole("button", { name: "Свернуть ингредиенты" }));
    expect(screen.getByText("1 ингредиентов обнаружено")).not.toBeVisible();
    await user.click(screen.getByRole("button", { name: "Развернуть ингредиенты" }));
    expect(screen.getByText("1 ингредиентов обнаружено")).toBeVisible();
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(screen.getByText(recipe.title)).toBeVisible();
  });
});
