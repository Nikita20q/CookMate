import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { authApi } from "@/api/auth/api";
import { useAuthStore } from "@/store/auth";
import { favoritesApi } from "@/api/favorites/api";
import { recipesApi } from "@/api/recipes/api";
import { authResponse, detail } from "./fixtures";
import { deferred, renderApp } from "./helpers";

const registrationResponse = {
  data: undefined,
  status: 200,
  statusText: "OK",
  headers: {},
  config: { headers: new AxiosHeaders() },
};

beforeEach(() => {
  vi.spyOn(authApi, "login").mockResolvedValue(authResponse);
  vi.spyOn(authApi, "register").mockResolvedValue(registrationResponse);
  vi.spyOn(authApi, "verifyEmail").mockResolvedValue(authResponse);
});

describe("Вход в аккаунт", () => {
  it("не отправляет пустую форму", async () => {
    const { user } = await renderApp("/auth/login");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(authApi.login).not.toHaveBeenCalled();
    expect(await screen.findByText("Введите электронную почту")).toBeVisible();
    expect(screen.getByText("Введите пароль")).toBeVisible();
  });

  it("сохраняет токен и открывает сканирование после входа", async () => {
    const { user, router } = await renderApp("/auth/login");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      " cook@example.com ",
    );
    await user.type(screen.getByPlaceholderText("Пароль"), "password");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(authApi.login).toHaveBeenCalledWith("cook@example.com", "password");
    expect(useAuthStore.getState().accessToken).toBe(authResponse.token);
  });

  it.each(["Электронная почта", "Пароль"])("отправляет вход один раз по Enter из поля %s", async (field) => {
    const { user, router } = await renderApp("/auth/login");
    await user.type(screen.getByLabelText("Электронная почта"), "cook@example.com");
    await user.type(screen.getByLabelText("Пароль"), "password");
    await user.click(screen.getByLabelText(field));
    await user.keyboard("{Enter}");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(authApi.login).toHaveBeenCalledExactlyOnceWith("cook@example.com", "password");
  });

  it.each(["/favorites", "/recipes/omlet-s-syrom", "https://evil.example", "//evil.example", "/auth/login"]) (
    "после входа безопасно возвращает на %s", async (returnTo) => {
      vi.spyOn(favoritesApi, "getAll").mockResolvedValue({ recipeNumber: 0, recipes: [] });
      vi.spyOn(recipesApi, "getBySlug").mockResolvedValue(detail);
      const { user, router } = await renderApp(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
      await user.type(screen.getByPlaceholderText("Электронная почта"), "cook@example.com");
      await user.type(screen.getByPlaceholderText("Пароль"), "password");
      await user.click(screen.getByRole("button", { name: "Войти" }));
      const expected = returnTo.startsWith("/favorites") || returnTo.startsWith("/recipes/") ? returnTo : "/";
      await waitFor(() => expect(router.state.location.pathname).toBe(expected));
    },
  );

  it("сохраняет адрес возврата при переходе к регистрации и обратно", async () => {
    const { user, router } = await renderApp("/auth/login?returnTo=%2Ffavorites");
    await user.click(screen.getByRole("link", { name: "Регистрация" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/auth/register"));
    expect(router.state.location.search).toMatchObject({ returnTo: "/favorites" });
    await user.click(screen.getByRole("link", { name: "Войти" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/auth/login"));
    expect(router.state.location.search).toMatchObject({ returnTo: "/favorites" });
  });

  it("показывает ошибку неверных данных и позволяет исправить ввод", async () => {
    vi.mocked(authApi.login).mockRejectedValue(new Error("Неверный пароль"));
    const { user } = await renderApp("/auth/login");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      "cook@example.com",
    );
    await user.type(screen.getByPlaceholderText("Пароль"), "wrong");
    await user.click(screen.getByRole("button", { name: "Войти" }));
    expect(
      await screen.findByText("Неверный пароль"),
    ).toBeVisible();
    expect(useAuthStore.getState().accessToken).toBeNull();
    await user.type(screen.getByPlaceholderText("Пароль"), "1");
    expect(
      screen.queryByText("Неверный пароль"),
    ).not.toBeInTheDocument();
  });

  it("показывает сообщение backend о неподтверждённой почте", async () => {
    const error = new AxiosError("Request failed");
    error.response = { status: 403, data: { title: "Доступ запрещён", message: "Email не подтверждён. Проверьте почту." } } as AxiosError["response"];
    vi.mocked(authApi.login).mockRejectedValue(error);
    const { user } = await renderApp("/auth/login");
    await user.type(screen.getByLabelText("Электронная почта"), "cook@example.com");
    await user.type(screen.getByLabelText("Пароль"), "password{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Email не подтверждён. Проверьте почту.");
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("связывает ошибки backend с полями формы", async () => {
    const error = new AxiosError("Request failed");
    error.response = { status: 400, data: { errors: { email: "Почта недоступна", password: "Пароль отклонён" } } } as AxiosError["response"];
    vi.mocked(authApi.login).mockRejectedValue(error);
    const { user } = await renderApp("/auth/login");
    await user.type(screen.getByLabelText("Электронная почта"), "cook@example.com");
    await user.type(screen.getByLabelText("Пароль"), "password{Enter}");
    expect(await screen.findByText("Почта недоступна")).toBeVisible();
    expect(screen.getByLabelText("Электронная почта")).toHaveAccessibleDescription("Почта недоступна");
    expect(screen.getByLabelText("Пароль")).toHaveAccessibleDescription("Пароль отклонён");
    await user.type(screen.getByLabelText("Пароль"), "1");
    expect(screen.queryByText("Пароль отклонён")).not.toBeInTheDocument();
    expect(screen.getByText("Почта недоступна")).toBeVisible();
  });

  it("блокирует повторную отправку входа", async () => {
    const request = deferred<typeof authResponse>();
    vi.mocked(authApi.login).mockReturnValue(request.promise);
    const { user } = await renderApp("/auth/login");
    await user.type(screen.getByLabelText("Электронная почта"), "cook@example.com");
    await user.type(screen.getByLabelText("Пароль"), "password{Enter}");
    expect(screen.getByRole("button", { name: "Войти" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(authApi.login).toHaveBeenCalledTimes(1);
    await act(async () => request.resolve(authResponse));
  });
});

describe("Регистрация и подтверждение почты", () => {
  it("не отправляет регистрацию без пароля", async () => {
    const { user } = await renderApp("/auth/register");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      "cook@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("открывает ввод кода только после успешной регистрации", async () => {
    const request = deferred<Awaited<ReturnType<typeof authApi.register>>>();
    vi.mocked(authApi.register).mockReturnValue(request.promise);
    const { user } = await renderApp("/auth/register");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      "cook@example.com",
    );
    await user.type(screen.getByPlaceholderText("Пароль"), "password");
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );
    expect(screen.queryByText("Подтвердите код")).not.toBeInTheDocument();
    await act(async () => request.resolve(registrationResponse));
    expect(await screen.findByText("Подтвердите код")).toBeVisible();
  });

  it("показывает ошибку отклонённой регистрации", async () => {
    vi.mocked(authApi.register).mockRejectedValue(new Error("Почта занята"));
    const { user } = await renderApp("/auth/register");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      "cook@example.com",
    );
    await user.type(screen.getByPlaceholderText("Пароль"), "password");
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );
    expect(await screen.findByText("Возникла ошибка")).toBeVisible();
    expect(screen.queryByText("Подтвердите код")).not.toBeInTheDocument();
  });

  it("принимает шесть цифр кода и авторизует пользователя", async () => {
    const { user, router } = await renderApp("/auth/register");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      "cook@example.com",
    );
    await user.type(screen.getByPlaceholderText("Пароль"), "password");
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );
    const input = await screen.findByPlaceholderText("Введите 6-значный код");
    expect(screen.getByRole("button", { name: "Отправить" })).toBeDisabled();
    await user.type(input, "ab12cd3456");
    expect(input).toHaveValue("123456");
    await user.click(screen.getByRole("button", { name: "Отправить" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(authApi.verifyEmail).toHaveBeenCalledWith(
      "cook@example.com",
      "123456",
    );
    expect(useAuthStore.getState().accessToken).toBe(authResponse.token);
  });

  it("отправляет регистрацию и код подтверждения по Enter", async () => {
    const { user, router } = await renderApp("/auth/register");
    await user.type(screen.getByLabelText("Электронная почта"), "cook@example.com");
    await user.type(screen.getByLabelText("Пароль"), "password{Enter}");
    const input = await screen.findByLabelText("Код подтверждения");
    expect(authApi.register).toHaveBeenCalledExactlyOnceWith("cook@example.com", "password");
    await user.type(input, "123{Enter}");
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
    await user.type(input, "456{Enter}");
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(authApi.verifyEmail).toHaveBeenCalledExactlyOnceWith("cook@example.com", "123456");
  });

  it("закрывает подтверждение при отмене", async () => {
    const { user } = await renderApp("/auth/register");
    await user.type(
      screen.getByPlaceholderText("Электронная почта"),
      "cook@example.com",
    );
    await user.type(screen.getByPlaceholderText("Пароль"), "password");
    await user.click(
      screen.getByRole("button", { name: "Зарегистрироваться" }),
    );
    await screen.findByText("Подтвердите код");
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    expect(screen.queryByText("Подтвердите код")).not.toBeInTheDocument();
    expect(authApi.verifyEmail).not.toHaveBeenCalled();
  });
});
