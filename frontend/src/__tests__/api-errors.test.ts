import { describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { getApiError } from "@/api/errors";
import { setApiFormErrors } from "@/lib/form-errors";

export function responseError(data: unknown, status = 400) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, {
    data, status, statusText: "Error", headers: {}, config,
  });
}

describe("Разбор ошибок API", () => {
  it.each([
    [{ title: "Ошибка", message: "Почта занята" }, "Почта занята"],
    [{ detail: "Неверный код", title: "Bad request" }, "Неверный код"],
    [{ error: { message: "Нет доступа" } }, "Нет доступа"],
    [{ message: ["Ошибка почты", "Ошибка пароля"] }, "Ошибка почты; Ошибка пароля"],
    ["Сервис недоступен", "Сервис недоступен"],
  ])("извлекает сообщение из %j", (data, message) => {
    expect(getApiError(responseError(data)).message).toBe(message);
  });

  it.each([
    { errors: { email: ["Почта занята"], password: "Короткий пароль" } },
    { fieldErrors: [{ field: "email", defaultMessage: "Почта занята" }, { field: "password", message: "Короткий пароль" }] },
  ])("разбирает ошибки полей %j", (data) => {
    expect(getApiError(responseError(data)).fieldErrors).toEqual({ email: "Почта занята", password: "Короткий пароль" });
  });

  it.each([undefined, null, {}, 42, "", "<html><body>Bad Gateway</body></html>"])(
    "использует запасной текст для %j", (data) => {
      expect(getApiError(responseError(data), "Ошибка запроса").message).toBe("Ошибка запроса");
    },
  );

  it("различает таймаут, отсутствие сети и ошибку сервера", () => {
    expect(getApiError(new AxiosError("timeout", "ECONNABORTED")).message).toContain("вовремя");
    expect(getApiError(new AxiosError("Network Error", "ERR_NETWORK")).message).toContain("подключение");
    expect(getApiError(responseError("<html>Bad Gateway</html>", 502)).message).toContain("временно недоступен");
    expect(getApiError(responseError({ message: "Сервис распознавания недоступен" }, 503)).message).toBe("Сервис распознавания недоступен");
  });

  it("обрабатывает обычные и неизвестные исключения", () => {
    expect(getApiError(new Error("Ошибка чтения")).message).toBe("Ошибка чтения");
    expect(getApiError(null, "Попробуйте ещё раз").message).toBe("Попробуйте ещё раз");
  });

  it("передаёт известные поля в setError, остальные в root", () => {
    const setError = vi.fn();
    setApiFormErrors(responseError({ errors: { email: "Почта занята", unknown: "Ошибка данных" } }), setError, ["email"]);
    expect(setError).toHaveBeenCalledWith("email", { type: "server", message: "Почта занята" });
    expect(setError).toHaveBeenCalledWith("root.server", { type: "server", message: "Ошибка данных" });
  });

  it("передаёт бизнес-ошибку в root", () => {
    const setError = vi.fn();
    setApiFormErrors(responseError({ message: "Email не подтверждён" }, 403), setError, ["email", "password"]);
    expect(setError).toHaveBeenCalledExactlyOnceWith("root.server", { type: "server", message: "Email не подтверждён" });
  });
});
