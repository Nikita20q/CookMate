import { screen, waitFor } from "@testing-library/react";
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
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => "blob:test-photo");
    static revokeObjectURL = vi.fn();
  });
});

describe("Валидация редактора рецепта", () => {
  it.each(["15 мин", "15 минут", "15\u00a0мин"])("сохраняет время из API %s как число без редактирования поля", async (approximateTime) => {
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({ ...detail, approximateTime });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByLabelText("Время")).toHaveValue(15);
    expect(screen.getByLabelText("Время")).toHaveAttribute("type", "number");
    expect(screen.getByText("мин", { exact: true })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(log).toHaveBeenCalledWith("Recipe update request", expect.objectContaining({ body: expect.objectContaining({ prepTimeMinutes: 15 }) })));
    const request = log.mock.calls[0][1];
    expect(request.body).not.toHaveProperty("approximateTime");
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    await user.clear(screen.getByLabelText("Время"));
    expect(screen.getByText("мин", { exact: true })).toBeVisible();
  });

  it("позволяет открыть рецепт без steps от парсера, но требует добавить шаг при сохранении", async () => {
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({ ...detail, contentJson: JSON.stringify({ description: detail.description }) });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Добавьте хотя бы один шаг инструкции")).toBeVisible();
    expect(log).not.toHaveBeenCalled();
  });

  it("показывает все обязательные ошибки, блокирует сохранение и позволяет исправить черновик", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    await user.clear(screen.getByLabelText("Название рецепта"));
    await user.type(screen.getByLabelText("Название рецепта"), "   ");
    await user.clear(screen.getByLabelText("Время"));
    await user.clear(screen.getByLabelText("Калории"));
    await user.click(screen.getByRole("button", { name: "Удалить фотографию рецепта" }));
    for (const button of screen.getAllByRole("button", { name: /^Удалить ингредиент/ })) await user.click(button);
    for (const button of screen.getAllByRole("button", { name: /^Удалить шаг/ })) await user.click(button);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));

    expect(await screen.findByText("Введите название рецепта")).toBeVisible();
    expect(screen.getByLabelText("Название рецепта")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Название рецепта")).toHaveAccessibleDescription("Введите название рецепта");
    expect(screen.getByLabelText("Время")).toHaveAccessibleDescription("мин Укажите время приготовления");
    expect(screen.getByLabelText("Калории")).toHaveAccessibleDescription("Укажите калорийность");
    expect(screen.getByRole("button", { name: "Добавить фотографию рецепта" })).toHaveAccessibleDescription("Добавьте главную фотографию рецепта");
    expect(screen.getByText("Добавьте хотя бы один ингредиент")).toBeVisible();
    expect(screen.getByText("Добавьте хотя бы один шаг инструкции")).toBeVisible();
    expect(screen.queryByText(/Необязательно/)).not.toBeInTheDocument();
    expect(log).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText("Название рецепта"));
    await user.type(screen.getByLabelText("Название рецепта"), "  Новый омлет  ");
    await user.type(screen.getByLabelText("Время"), "30");
    await user.type(screen.getByLabelText("Калории"), "0");
    await user.upload(screen.getByLabelText("Фотография рецепта"), new File(["photo"], "main.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(screen.queryByText("Добавьте главную фотографию рецепта")).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Добавить ингредиент" }));
    await user.type(screen.getByLabelText("Название ингредиента"), "яйцо{Enter}");
    await user.click(screen.getByRole("button", { name: "Добавить шаг" }));
    await user.type(screen.getByLabelText("Текст шага 1"), "  Взбейте яйца  ");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    await waitFor(() => expect(log).toHaveBeenCalledWith("Recipe update request", expect.objectContaining({
      body: expect.objectContaining({ title: "Новый омлет", prepTimeMinutes: 30, calories: 0, components: ["яйцо"], steps: [expect.objectContaining({ stepInstruction: "Взбейте яйца", image: null })] }),
    })));
    expect(screen.queryAllByRole("alert")).toHaveLength(0);
    expect(screen.getByLabelText("Название рецепта")).not.toHaveAttribute("aria-invalid", "true");
  });

  it.each(["-1", "1.5", "2147483648"])("не сохраняет недопустимую калорийность %s", async (value) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    await user.clear(screen.getByLabelText("Калории"));
    await user.type(screen.getByLabelText("Калории"), value);
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Калорийность должна быть целым неотрицательным числом до 2147483647")).toBeVisible();
    expect(log).not.toHaveBeenCalled();
  });

  it("не сохраняет некорректное время и слишком длинное название", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    await user.clear(screen.getByLabelText("Название рецепта"));
    await user.click(screen.getByLabelText("Название рецепта"));
    await user.paste("а".repeat(256));
    await user.clear(screen.getByLabelText("Время"));
    await user.type(screen.getByLabelText("Время"), "0");
    await user.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(await screen.findByText("Название не должно превышать 255 символов")).toBeVisible();
    expect(screen.getByLabelText("Время")).toHaveAccessibleDescription("мин Укажите целое количество минут от 1 до 2147483647");
    expect(log).not.toHaveBeenCalled();
  });
});
