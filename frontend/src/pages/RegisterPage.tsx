import { Link, useNavigate } from "@tanstack/react-router";
import { Route as loginRoute } from "@/routes/auth/login";
import { useState } from "react";
import { authApi } from "@/api/auth/api";
import Button from "@/components/ui/Button";
import Hint from "@/components/ui/Hint";
import { X } from "lucide-react";
import { useAuthStore } from "@/store/auth";

const RegisterPage = () => {
  const navigate = useNavigate();
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
      navigate({ to: "/" });
    } catch (e) {
      console.error(e);
    }
  };

  const [showConfirmCode, setShowConfirmCode] = useState(false);
  const [data, setData] = useState<{ email: string; password: string }>({
    email: "",
    password: "",
  });

  const handleRegister = () => {
    if (data.email.trim().length == 0 || data.password.length == 0) {
      setIsError(true);
      return;
    }
    try {
      authApi.register(data.email.trim(), data.password);
      setShowConfirmCode(true);
      // navigate({ to: ConfirmCodeRoute.to });
    } catch (e) {
      setIsError(true);
    }
  };

  const handleModalClose = () => {
    setCode("");
    setShowConfirmCode(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      {showConfirmCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleModalClose}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-custom pb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Подтвердите код
              </h3>
              <button
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
                onClick={handleCodeConfirm}
                text="Отправить"
              />
            </div>
          </div>
        </div>
      )}
      <div className="bg-card p-10 min-w-100 rounded-xl flex flex-col items-center justify-center gap-10 border-custom border">
        <h1>Регистрация</h1>

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
          {/* {showConfirmCode && (
            <input
              type="text"
              placeholder="Введите код"
              className="border-custom border-b"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
              }}
            />
          )} */}
          {isError && (
            <Hint text="Возникла ошибка" className="text-[#a60c25]!" />
          )}
        </form>
        <div>
          Есть аккаунт?{" "}
          <Link to={loginRoute.to} className="underline">
            Войти
          </Link>
        </div>
        <Button
          text="Зарегистрироваться"
          onClick={() => {
            handleRegister();
          }}
        />
      </div>
    </div>
  );
};

export default RegisterPage;
