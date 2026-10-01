import { Link, useNavigate } from "@tanstack/react-router";
import { Route as registerRoute } from "@/routes/auth/register";
import { useState } from "react";
import { authApi } from "@/api/auth/api";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import Hint from "@/components/ui/Hint";

const LoginPage = () => {
  const navigate = useNavigate();
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
      navigate({ to: "/" });
    } catch (e) {
      setIsError(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="bg-card p-10 min-w-100 rounded-xl flex flex-col items-center justify-center gap-10 border-custom border">
        <h1>Вход</h1>

        <form className="flex flex-col gap-4 w-full">
          <input
            type="text"
            className="border-custom border-b"
            placeholder="Электронная почта"
            value={data.email}
            onChange={(e) => {
              setIsError(false);
              setData((d) => ({ ...d, email: e.target.value }));
            }}
          />
          <input
            type="password"
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
        </form>
        <div>
          <span>Нет аккаунта? </span>
          <span>
            <Link to={registerRoute.to} className="underline">
              Регистрация
            </Link>
          </span>
        </div>
        <Button
          text="Войти"
          onClick={() => {
            handleLogin();
          }}
        />
      </div>
    </div>
  );
};

export default LoginPage;
