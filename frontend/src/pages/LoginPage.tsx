import { safeReturnTo } from "@/lib/session";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Route as registerRoute } from "@/routes/auth/register";
import { useState } from "react";
import { authApi } from "@/api/auth/api";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import Hint from "@/components/ui/Hint";

const LoginPage = () => {
  const navigate = useNavigate();
  const { returnTo } = useSearch({ from: "/auth/login" });
  const [data, setData] = useState<{ email: string; password: string }>({
    email: "",
    password: "",
  });
  const [isError, setIsError] = useState(false);

  const handleLogin = async () => {
    if (data.email.trim().length == 0 || data.password.length == 0) {
      setIsError(true);
      return;
    }
    try {
      const result = await authApi.login(data.email.trim(), data.password);
      useAuthStore.getState().setAccessToken(result.token);
      navigate({ href: safeReturnTo(returnTo) });
    } catch {
      setIsError(true);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height,0rem))] flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-card w-full max-w-md p-6 sm:p-10 rounded-xl flex flex-col items-center justify-center gap-10 border-custom border">
        <h1>Вход</h1>

        <form
          className="flex flex-col gap-4 w-full"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <input
            type="text"
            className="border-custom border-b"
            name="email"
            aria-label="Электронная почта"
            autoComplete="email"
            placeholder="Электронная почта"
            value={data.email}
            onChange={(e) => {
              setIsError(false);
              setData((d) => ({ ...d, email: e.target.value }));
            }}
          />
          <input
            type="password"
            name="password"
            aria-label="Пароль"
            autoComplete="current-password"
            placeholder="Пароль"
            className="border-custom border-b"
            value={data.password}
            onChange={(e) => {
              setIsError(false);
              setData((d) => ({ ...d, password: e.target.value }));
            }}
          />
          {isError && (
            <Hint
              text="Неверное имя пользователя или пароль"
              className="text-[#a60c25]!"
            />
          )}
          <Button type="submit" text="Войти" />
        </form>
        <div>
          <span>Нет аккаунта? </span>
          <span>
            <Link to={registerRoute.to} search={{ returnTo }} className="underline">
              Регистрация
            </Link>
          </span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
