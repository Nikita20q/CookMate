import { screen } from "@testing-library/react";
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
  let preview = 0;
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL = vi.fn(() => `blob:recipe-preview-${++preview}`);
    static revokeObjectURL = vi.fn();
  });
});

describe("Редактор главной фотографии рецепта", () => {
  it("показывает действия в режиме редактирования и восстанавливает удалённое фото при отмене", async () => {
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    expect(await screen.findByRole("img", { name: detail.title })).toHaveAttribute("src", detail.image);
    expect(screen.queryByRole("button", { name: "Удалить фотографию рецепта" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByRole("img", { name: "Фотография рецепта" })).toHaveAttribute("src", detail.image);
    expect(screen.getByRole("button", { name: "Заменить фотографию рецепта" })).toBeVisible();
    const download = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await user.click(screen.getByRole("button", { name: "Скачать фотографию рецепта" }));
    expect(download).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Удалить фотографию рецепта" }));
    expect(screen.queryByRole("img", { name: "Фотография рецепта" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Добавить фотографию рецепта" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    expect(screen.getByRole("img", { name: detail.title })).toHaveAttribute("src", detail.image);
  });

  it("заменяет одно локальное фото без изменения кеша и освобождает предпросмотр", async () => {
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    const input = screen.getByLabelText("Фотография рецепта");
    expect(input).not.toHaveAttribute("multiple");
    await user.upload(input, new File(["photo"], "one.png", { type: "image/png" }));
    const firstUrl = screen.getByRole("img", { name: "Фотография рецепта" }).getAttribute("src");
    expect(firstUrl).toMatch(/^blob:/);
    await user.upload(input, new File(["replacement"], "two.png", { type: "image/png" }));
    expect(screen.getAllByRole("img", { name: "Фотография рецепта" })).toHaveLength(1);
    const secondUrl = screen.getByRole("img", { name: "Фотография рецепта" }).getAttribute("src");
    expect(secondUrl).not.toBe(firstUrl);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(secondUrl);
    expect(screen.getByRole("img", { name: detail.title })).toHaveAttribute("src", detail.image);
    await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByRole("img", { name: "Фотография рецепта" })).toHaveAttribute("src", detail.image);
  });

  it("позволяет добавить фото, если у рецепта его не было", async () => {
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({ ...detail, image: "" });
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
    expect(screen.getByRole("button", { name: "Добавить фотографию рецепта" })).toBeVisible();
    await user.upload(screen.getByLabelText("Фотография рецепта"), new File(["photo"], "recipe.jpg", { type: "image/jpeg" }));
    expect(screen.getByRole("img", { name: "Фотография рецепта" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Удалить фотографию рецепта" }));
    expect(screen.getByRole("button", { name: "Добавить фотографию рецепта" })).toBeVisible();
  });
});
