import { safeReturnTo } from "@/lib/session";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Route as loginRoute } from "@/routes/auth/login";
import { useState } from "react";
import { authApi } from "@/api/auth/api";
import Button from "@/components/ui/Button";
import Hint from "@/components/ui/Hint";
import { X } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { returnTo } = useSearch({ from: "/auth/register" });
  const [isError, setIsError] = useState(false);
  const [code, setCode] = useState("");

  const handleCodeChange = (
    e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>,
  ) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
  };

  const handleCodeConfirm = async () => {
    if (code.length !== 6) return;

    try {
      const result = await authApi.verifyEmail(data.email, code);
      useAuthStore.getState().setAccessToken(result.token);
      navigate({ href: safeReturnTo(returnTo) });
    } catch (e) {
      console.error(e);
    }
  };

  const [showConfirmCode, setShowConfirmCode] = useState(false);
  const [data, setData] = useState<{ email: string; password: string }>({
    email: "",
    password: "",
  });

  const handleRegister = async () => {
    if (data.email.trim().length == 0 || data.password.length == 0) {
      setIsError(true);
      return;
    }
    try {
      await authApi.register(data.email.trim(), data.password);
      setShowConfirmCode(true);
    } catch {
      setIsError(true);
    }
  };

  const handleModalClose = () => {
    setCode("");
    setShowConfirmCode(false);
  };

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height,0rem))] flex flex-col items-center justify-center px-4 py-8">
      {showConfirmCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleModalClose}
        >
          <form
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void handleCodeConfirm();
            }}
          >
            <div className="flex items-center justify-between border-b border-custom pb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Подтвердите код
              </h3>
              <button
                type="button"
                aria-label="Закрыть подтверждение"
                className="rounded-lg p-1 text-foreground hover:text-muted-foreground"
                onClick={handleModalClose}
              >
                <X />
              </button>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              name="code"
              aria-label="Код подтверждения"
              autoComplete="one-time-code"
              value={code}
              onChange={handleCodeChange}
              placeholder="Введите 6-значный код"
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />

            <div className="mt-4 flex justify-end space-x-2 border-t border-gray-100 pt-4">
              <Button
                onClick={() => {
                  setCode("");
                  setShowConfirmCode(false);
                }}
                variant="secondary"
                text="Отмена"
              />
              <Button
                disabled={code.length !== 6}
                type="submit"
                text="Отправить"
              />
            </div>
          </form>
        </div>
      )}
      <div className="bg-card w-full max-w-md p-6 sm:p-10 rounded-xl flex flex-col items-center justify-center gap-10 border-custom border">
        <h1>Регистрация</h1>

        <form
          className="flex flex-col gap-4 w-full"
          onSubmit={(event) => {
            event.preventDefault();
            void handleRegister();
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
            autoComplete="new-password"
            placeholder="Пароль"
            className="border-custom border-b"
            value={data.password}
            onChange={(e) => {
              setIsError(false);
              setData((d) => ({ ...d, password: e.target.value }));
            }}
          />

          {isError && (
            <Hint text="Возникла ошибка" className="text-[#a60c25]!" />
          )}
          <Button type="submit" text="Зарегистрироваться" />
        </form>
        <div>
          Есть аккаунт?{" "}
          <Link to={loginRoute.to} search={{ returnTo }} className="underline">
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
