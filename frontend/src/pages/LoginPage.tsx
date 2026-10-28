import { safeReturnTo } from "@/lib/session";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Route as registerRoute } from "@/routes/auth/register";
import { useForm } from "react-hook-form";
import { authApi } from "@/api/auth/api";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/auth";
import AuthFields, { type AuthValues } from "@/components/auth/AuthFields";
import { setApiFormErrors } from "@/lib/form-errors";

const LoginPage = () => {
  const navigate = useNavigate();
  const { returnTo } = useSearch({ from: "/auth/login" });
  const form = useForm<AuthValues>({
    defaultValues: { email: "", password: "" },
  });
  const { handleSubmit, setError, formState: { isSubmitting } } = form;

  const handleLogin = async (data: AuthValues) => {
    try {
      const result = await authApi.login(data.email, data.password);
      useAuthStore.getState().setAccessToken(result.token);
      navigate({ href: safeReturnTo(returnTo) });
    } catch (error) {
      setApiFormErrors(error, setError, ["email", "password"], "Не удалось войти. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height,0rem))] flex flex-col items-center justify-center px-4 py-8">
      <div className="bg-card w-full max-w-md p-6 sm:p-10 rounded-xl flex flex-col items-center justify-center gap-10 border-custom border">
        <h1>Вход</h1>

        <form
          noValidate
          className="flex flex-col gap-4 w-full"
          onSubmit={handleSubmit(handleLogin)}
        >
          <AuthFields form={form} />
          <Button type="submit" text="Войти" disabled={isSubmitting} />
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
