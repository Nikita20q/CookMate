import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/auth";
import { favoritesApi } from "@/api/favorites/api";
import { token } from "./fixtures";
import { renderApp } from "./helpers";

describe("Навигация приложения", () => {
  it("открывает избранное через боковое меню", async () => {
    const { user, router } = await renderApp("/");
    await user.click(screen.getByRole("link", { name: "Избранное" }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/favorites"),
    );
    expect(
      screen.getByRole("heading", { name: "Избранные рецепты" }),
    ).toBeVisible();
  });

  it("после выхода очищает авторизацию и открывает вход", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.spyOn(favoritesApi, "getAll").mockResolvedValue({
      recipeNumber: 0,
      recipes: [],
    });
    const { user, router } = await renderApp("/favorites");
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe("/auth/login"),
    );
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Выйти" }),
    ).not.toBeInTheDocument();
  });
});
