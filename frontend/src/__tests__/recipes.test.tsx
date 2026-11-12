import { useAuthStore } from "@/store/auth";
import { favoritesApi } from "@/api/favorites/api";
import { authApi } from "@/api/auth/api";
import type { MeResponse } from "@/api/auth/types";
import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { recipesApi } from "@/api/recipes/api";
import { useIngredientsStore } from "@/store/ingredients";
import { detail, recipe, secondRecipe, token } from "./fixtures";
import { deferred, renderApp } from "./helpers";
import type { RecognizeResponse } from "@/api/recipes/types";
import type { RecipeDetail } from "@/types/recipes";

beforeEach(() => {
  vi.spyOn(recipesApi, "findByIngredients").mockResolvedValue({
    recipeCount: 1,
    recipes: [recipe],
    recognizedIngredients: ["яйцо"],
  });
  vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
  vi.spyOn(favoritesApi, "getAll").mockResolvedValue({
    recipeNumber: 0,
    recipes: [],
  });
  vi.spyOn(authApi, "me").mockResolvedValue({
    userId: 1,
    email: "cook@example.com",
    isStaff: false,
  });
});

describe("Подбор рецептов", () => {
  it("получает подборку без ингредиентов", async () => {
    vi.mocked(recipesApi.getSuggestions).mockResolvedValue({
      recognizedIngredients: [],
      recipeCount: 1,
      recipes: [secondRecipe],
    });
    await renderApp("/recipes");
    expect(await screen.findByText(secondRecipe.title)).toBeVisible();
    expect(recipesApi.getSuggestions).toHaveBeenCalledTimes(1);
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
    expect(screen.queryByText("Рецепты не найдены")).not.toBeInTheDocument();
  });

  it("после удаления последнего ингредиента очищает список и загружает подборку", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"],
      recipeCount: 1,
      recipes: [recipe],
    });
    const response = deferred<RecognizeResponse>();
    vi.mocked(recipesApi.getSuggestions).mockReturnValue(response.promise);
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("яйцо", { selector: "span" }));
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
    expect(useIngredientsStore.getState().recognitionResult).toBeNull();
    expect(screen.getByText("0 ингредиентов обнаружено")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем рецепты");
    expect(recipesApi.getSuggestions).toHaveBeenCalledTimes(1);
    await act(async () =>
      response.resolve({
        recognizedIngredients: [],
        recipeCount: 1,
        recipes: [secondRecipe],
      }),
    );
    expect(await screen.findByText(secondRecipe.title)).toBeVisible();
    expect(screen.queryByText(recipe.title)).not.toBeInTheDocument();
    expect(screen.queryByText("Рецепты не найдены")).not.toBeInTheDocument();
    expect(useIngredientsStore.getState().currentIngredients).toEqual([]);
    await user.click(screen.getByText("+"));
    await user.type(screen.getByLabelText("Новый ингредиент"), "Сыр{Enter}");
    await waitFor(() =>
      expect(recipesApi.findByIngredients).toHaveBeenCalledWith(["сыр"]),
    );
  });

  it("при ошибке подборки показывает повтор вместо пустого результата", async () => {
    vi.mocked(recipesApi.getSuggestions)
      .mockRejectedValueOnce(new Error("Нет сети"))
      .mockResolvedValue({
        recognizedIngredients: [],
        recipeCount: 1,
        recipes: [secondRecipe],
      });
    const { user } = await renderApp("/recipes");
    expect(await screen.findByRole("alert")).toHaveTextContent("Нет сети");
    expect(screen.queryByText("Рецепты не найдены")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Повторить поиск" }));
    expect(await screen.findByText(secondRecipe.title)).toBeVisible();
  });

  it("показывает загрузку списка", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const response = deferred<RecognizeResponse>();
    vi.mocked(recipesApi.findByIngredients).mockReturnValue(response.promise);
    await renderApp("/recipes");
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем рецепты");
    await act(async () =>
      response.resolve({
        recipeCount: 0,
        recipes: [],
        recognizedIngredients: [],
      }),
    );
  });

  it("показывает ошибку запроса и повторяет поиск", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    vi.mocked(recipesApi.findByIngredients)
      .mockRejectedValueOnce(new Error("Нет сети"))
      .mockResolvedValue({
        recipeCount: 1,
        recipes: [recipe],
        recognizedIngredients: [],
      });
    const { user } = await renderApp("/recipes");
    await user.click(
      await screen.findByRole("button", { name: "Повторить поиск" }),
    );
    expect(await screen.findByText(recipe.title)).toBeVisible();
  });

  it("показывает пустой результат поиска", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["рис"]);
    vi.mocked(recipesApi.findByIngredients).mockResolvedValue({
      recipeCount: 0,
      recipes: [],
      recognizedIngredients: [],
    });
    await renderApp("/recipes");
    expect(
      await screen.findByText(
        "Для данных продуктов не получилось найти подходящие рецепты",
      ),
    ).toBeVisible();
  });

  it("повторяет поиск после добавления и удаления ингредиента", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const { user } = await renderApp("/recipes");
    await screen.findByText(recipe.title);
    await user.click(screen.getByText("+"));
    await user.type(screen.getByPlaceholderText("Введите ингредиент"), "Сыр");
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    await waitFor(() =>
      expect(recipesApi.findByIngredients).toHaveBeenCalledWith([
        "яйцо",
        "сыр",
      ]),
    );
    await user.click(screen.getByText("сыр", { selector: "span" }));
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
  });

  it("добавляет нормализованный ингредиент по Enter один раз", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"],
      recipes: [recipe],
      recipeCount: 1,
    });
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("+"));
    const input = screen.getByLabelText("Новый ингредиент");
    expect(input).toHaveFocus();
    await user.tab();
    expect(input).not.toHaveFocus();
    await user.click(screen.getByText("+"));
    expect(input).toHaveFocus();
    await user.keyboard("  Сыр  {Enter}");
    expect(useIngredientsStore.getState().currentIngredients).toEqual([
      "яйцо",
      "сыр",
    ]);
    await waitFor(() =>
      expect(recipesApi.findByIngredients).toHaveBeenCalledExactlyOnceWith([
        "яйцо",
        "сыр",
      ]),
    );
    expect(screen.queryByLabelText("Новый ингредиент")).not.toBeInTheDocument();
  });

  it("показывает ошибку пустого ингредиента у поля формы", async () => {
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("+"));
    await user.type(screen.getByLabelText("Новый ингредиент"), "   {Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Введите ингредиент",
    );
    expect(
      screen.getByLabelText("Новый ингредиент"),
    ).toHaveAccessibleDescription("Введите ингредиент");
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
  });

  it("отменяет добавление без отправки формы и поиска", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"],
      recipes: [recipe],
      recipeCount: 1,
    });
    const { user } = await renderApp("/recipes");
    await user.click(screen.getByText("+"));
    await user.type(screen.getByLabelText("Новый ингредиент"), "сыр");
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Новый ингредиент")).not.toBeInTheDocument();
  });

  it("не добавляет дубли и пустые продукты, сохраняя результат сканирования", async () => {
    useIngredientsStore.getState().setRecognitionResult({
      recognizedIngredients: ["яйцо"],
      recipes: [recipe],
      recipeCount: 1,
    });
    const { user } = await renderApp("/recipes");
    for (const value of [" ЯЙЦО ", "   "]) {
      await user.click(screen.getByText("+"));
      await user.type(screen.getByPlaceholderText("Введите ингредиент"), value);
      await user.click(screen.getByRole("button", { name: "Добавить" }));
      if (screen.queryByRole("button", { name: "Отмена" })) {
        await user.click(screen.getByRole("button", { name: "Отмена" }));
      }
    }
    expect(useIngredientsStore.getState().currentIngredients).toEqual(["яйцо"]);
    expect(recipesApi.findByIngredients).not.toHaveBeenCalled();
    await user.click(screen.getByText("+"));
    await user.type(
      screen.getByPlaceholderText("Введите ингредиент"),
      " Зелёный  лук ",
    );
    await user.click(screen.getByRole("button", { name: "Добавить" }));
    await waitFor(() =>
      expect(recipesApi.findByIngredients).toHaveBeenCalledWith([
        "яйцо",
        "зелёный лук",
      ]),
    );
  });

  it("показывает одинаковое совпадение в списке, деталях и избранном", async () => {
    const components = [" Яйцо ", "яйцо", "Сыр", "СЫР ", " Зелёный  лук ", " "];
    useAuthStore.getState().setAccessToken(token());
    useIngredientsStore
      .getState()
      .setCurrentIngredients([" ЯЙЦО ", "яйцо", "ЗЕЛЁНЫЙ ЛУК"]);
    vi.spyOn(favoritesApi, "getAll").mockResolvedValue({
      recipeNumber: 1,
      recipes: [{ ...recipe, components }],
    });
    vi.mocked(recipesApi.findByIngredients).mockResolvedValue({
      recognizedIngredients: [],
      recipeCount: 1,
      recipes: [{ ...recipe, components }],
    });
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({
      ...detail,
      components,
    });
    const { user, router } = await renderApp("/recipes");
    await user.click(
      await screen.findByRole("button", { name: /Омлет с сыром/ }),
    );
    expect(screen.getByText("67%")).toBeVisible();
    expect(screen.getByText(/ингредиентов в наличии/)).toHaveTextContent(
      "2/3 ингредиентов в наличии",
    );
    expect(screen.getByText("✓ Яйцо")).toHaveClass("text-primary");
    expect(screen.getByText("✓ Зелёный лук")).toHaveClass("text-primary");
    expect(screen.getByText("Сыр", { exact: true })).not.toHaveClass(
      "text-primary",
    );
    await user.click(
      screen.getByRole("link", { name: "Посмотреть полный рецепт" }),
    );
    expect(await screen.findByText("67% совпадение")).toBeVisible();
    const overview = within(
      screen.getByRole("region", { name: "Информация о рецепте" }),
    );
    expect(overview.getByText(/в кладовой/)).toHaveTextContent(
      "2/3 в кладовой",
    );
    expect(overview.getAllByText("купить")).toHaveLength(1);
    expect(overview.getByText("купить").parentElement).toHaveTextContent("Сыр");
    expect(overview.getAllByText("Яйцо", { exact: true })).toHaveLength(1);
    await act(async () => {
      await router.navigate({ to: "/favorites" });
    });
    expect(await screen.findByText("67% совпадение")).toBeVisible();
    const card = within(screen.getByRole("article"));
    expect(card.getAllByText("Яйцо", { exact: true })).toHaveLength(1);
    expect(card.getByText("Зелёный лук")).toBeVisible();
  });

  it("раскрывает карточку и открывает полный рецепт", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    const { user, router } = await renderApp("/recipes");
    await user.click(
      await screen.findByRole("button", { name: /Омлет с сыром/ }),
    );
    expect(screen.getByText(/ингредиентов в наличии/)).toHaveTextContent(
      "1/2 ингредиентов в наличии",
    );
    await user.click(
      screen.getByRole("link", { name: "Посмотреть полный рецепт" }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/recipes/${recipe.slug}`),
    );
    expect(
      await screen.findByRole("heading", { name: recipe.title }),
    ).toBeVisible();
  });
});

describe("Детальная страница рецепта", () => {
  it.each(["Отменить", "Выйти из режима редактирования"])(
    "%s запрашивает подтверждение и сохраняет черновик до согласия",
    async (triggerLabel) => {
      useAuthStore.getState().setAccessToken(token());
      vi.mocked(authApi.me).mockResolvedValue({
        userId: 1,
        email: "admin@example.com",
        isStaff: true,
      });
      const { user } = await renderApp(`/recipes/${recipe.slug}`);
      await user.click(await screen.findByRole("button", { name: "Редактировать рецепт" }));
      const title = screen.getByLabelText("Название рецепта");
      await user.clear(title);
      await user.type(title, "Мой черновик");
      const trigger = screen.getByRole("button", { name: triggerLabel });
      await user.click(trigger);

      const dialog = screen.getByRole("alertdialog", { name: "Отменить изменения?" });
      expect(dialog).toHaveAccessibleDescription("Все изменения рецепта будут удалены. Это действие нельзя отменить.");
      const keepEditing = within(dialog).getByRole("button", { name: "Вернуться" });
      expect(keepEditing).toHaveFocus();
      expect(title).toHaveValue("Мой черновик");
      await user.click(keepEditing);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(title).toHaveValue("Мой черновик");
      expect(trigger).toHaveFocus();

      await user.click(trigger);
      await user.tab({ shift: true });
      expect(screen.getByRole("button", { name: "Отменить изменения" })).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Вернуться" })).toHaveFocus();
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(title).toHaveValue("Мой черновик");
      expect(trigger).toHaveFocus();

      await user.click(trigger);
      await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("form", { name: "Черновик рецепта" })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: detail.title })).toBeVisible();
      await user.click(screen.getByRole("button", { name: "Редактировать рецепт" }));
      expect(screen.getByLabelText("Название рецепта")).toHaveValue(detail.title);
    },
  );

  it("не запрашивает профиль гостя и скрывает редактирование", async () => {
    await renderApp(`/recipes/${recipe.slug}`);
    await screen.findByRole("heading", { name: recipe.title });
    expect(authApi.me).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Редактировать рецепт" }),
    ).not.toBeInTheDocument();
  });

  it("ожидает профиль и позволяет администратору переключать режим", async () => {
    useAuthStore.getState().setAccessToken(token());
    const response = deferred<MeResponse>();
    vi.mocked(authApi.me).mockReturnValue(response.promise);
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await screen.findByRole("heading", { name: recipe.title });
    expect(
      screen.queryByRole("button", { name: "Редактировать рецепт" }),
    ).not.toBeInTheDocument();
    await act(async () =>
      response.resolve({
        userId: 1,
        email: "admin@example.com",
        isStaff: true,
      }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Редактировать рецепт" }),
    );
    expect(
      screen.getByRole("region", { name: "Действия редактирования рецепта" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    expect(
      screen.getByRole("button", { name: "Редактировать рецепт" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.queryByRole("region", { name: "Действия редактирования рецепта" }),
    ).not.toBeInTheDocument();
  });

  it("создаёт отдельный черновик и отменяет изменения всех полей", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(authApi.me).mockResolvedValue({
      userId: 1,
      email: "admin@example.com",
      isStaff: true,
    });
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(
      await screen.findByRole("button", { name: "Редактировать рецепт" }),
    );
    const fields = [
      {
        label: "Название рецепта",
        initial: detail.title,
        changed: "Новый рецепт",
      },
      {
        label: "Описание рецепта",
        initial: detail.description,
        changed: "Новое описание",
      },
      { label: "Время", initial: detail.approximateTime, changed: "40 минут" },
      { label: "Калории", initial: detail.calories!, changed: "500" },
    ];
    for (const field of fields) {
      const input = screen.getByLabelText(field.label);
      expect(input).toHaveValue(field.initial);
      await user.clear(input);
      await user.type(input, field.changed);
    }
    expect(client.getQueryData(["recipes", recipe.slug])).toEqual(detail);
    expect(screen.getByText("Взбейте яйца")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    expect(screen.getByRole("heading", { name: detail.title })).toBeVisible();
    expect(screen.getByText(detail.description)).toBeVisible();
    expect(screen.getByText(detail.approximateTime)).toBeVisible();
    expect(screen.getByText(String(detail.calories))).toBeVisible();
    expect(
      screen.queryByRole("form", { name: "Черновик рецепта" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Редактировать рецепт" }),
    );
    for (const field of fields) {
      expect(screen.getByLabelText(field.label)).toHaveValue(field.initial);
    }
  });

  it("не перезаписывает черновик при фоновом обновлении рецепта", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(authApi.me).mockResolvedValue({
      userId: 1,
      email: "admin@example.com",
      isStaff: true,
    });
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(
      await screen.findByRole("button", { name: "Редактировать рецепт" }),
    );
    await user.clear(screen.getByLabelText("Название рецепта"));
    await user.type(screen.getByLabelText("Название рецепта"), "Мой черновик");
    await act(async () => {
      client.setQueryData(["recipes", recipe.slug], {
        ...detail,
        title: "Обновлено на сервере",
      });
    });
    expect(screen.getByLabelText("Название рецепта")).toHaveValue(
      "Мой черновик",
    );
    await user.click(screen.getByRole("button", { name: "Отменить" }));
    await user.click(screen.getByRole("button", { name: "Отменить изменения" }));
    expect(
      screen.getByRole("heading", { name: "Обновлено на сервере" }),
    ).toBeVisible();
  });

  it.each(["user", "error"])(
    "скрывает редактирование при профиле %s",
    async (profile) => {
      useAuthStore.getState().setAccessToken(token());
      if (profile === "error")
        vi.mocked(authApi.me).mockRejectedValue(new Error("Нет сети"));
      await renderApp(`/recipes/${recipe.slug}`);
      await screen.findByRole("heading", { name: recipe.title });
      await waitFor(() => expect(authApi.me).toHaveBeenCalled());
      expect(
        screen.queryByRole("button", { name: "Редактировать рецепт" }),
      ).not.toBeInTheDocument();
    },
  );

  it("убирает режим и права администратора при смене аккаунта", async () => {
    useAuthStore.getState().setAccessToken(token());
    vi.mocked(authApi.me).mockResolvedValueOnce({
      userId: 1,
      email: "admin@example.com",
      isStaff: true,
    });
    const { user, client } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(
      await screen.findByRole("button", { name: "Редактировать рецепт" }),
    );
    const response = deferred<MeResponse>();
    vi.mocked(authApi.me).mockReturnValue(response.promise);
    await act(async () => useAuthStore.getState().setAccessToken(token("2")));
    expect(
      screen.queryByRole("button", {
        name: /Редактировать рецепт|Выйти из режима редактирования/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Действия редактирования рецепта" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("form", { name: "Черновик рецепта" }),
    ).not.toBeInTheDocument();
    expect(client.getQueryData(["me", token()])).toBeUndefined();
    await act(async () =>
      response.resolve({
        userId: 2,
        email: "user@example.com",
        isStaff: false,
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Редактировать рецепт" }),
    ).not.toBeInTheDocument();
  });

  it("отличает загрузку от отсутствующего рецепта", async () => {
    const response = deferred<RecipeDetail>();
    vi.mocked(recipesApi.getBySlug).mockReturnValue(response.promise);
    await renderApp(`/recipes/${recipe.slug}`);
    expect(screen.getByRole("status")).toHaveTextContent("Загружаем рецепт");
    expect(screen.queryByText("Рецепт не найден.")).not.toBeInTheDocument();
    await act(async () => response.resolve(detail));
    expect(
      await screen.findByRole("heading", { name: recipe.title }),
    ).toBeVisible();
  });

  it("показывает ошибку загрузки и кнопку повтора", async () => {
    vi.mocked(recipesApi.getBySlug)
      .mockRejectedValueOnce(new Error("Нет сети"))
      .mockResolvedValue(detail);
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    await user.click(
      await screen.findByRole("button", { name: "Повторить загрузку" }),
    );
    expect(
      await screen.findByRole("heading", { name: recipe.title }),
    ).toBeVisible();
  });

  it("показывает ингредиенты, калорийность и процент совпадения", async () => {
    useIngredientsStore.getState().setCurrentIngredients(["яйцо"]);
    await renderApp(`/recipes/${recipe.slug}`);
    expect(await screen.findByText("50% совпадение")).toBeVisible();
    expect(screen.getByText("240")).toBeVisible();
    expect(
      screen.getByRole("region", { name: "Информация о рецепте" }),
    ).toHaveTextContent("сыр");
  });

  it("отмечает выполненные шаги и отменяет отметку", async () => {
    const { user } = await renderApp(`/recipes/${recipe.slug}`);
    const step = await screen.findByRole("button", { name: /Взбейте яйца/ });
    expect(screen.getByText("0/2 шагов выполнено")).toBeVisible();
    await user.click(step);
    expect(screen.getByText("1/2 шагов выполнено")).toBeVisible();
    await user.click(step);
    expect(screen.getByText("0/2 шагов выполнено")).toBeVisible();
  });

  it("не показывает NaN для рецепта без ингредиентов", async () => {
    vi.mocked(recipesApi.getBySlug).mockResolvedValue({
      ...detail,
      components: [],
    });
    await renderApp(`/recipes/${recipe.slug}`);
    expect(await screen.findByText("0% совпадение")).toBeVisible();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
