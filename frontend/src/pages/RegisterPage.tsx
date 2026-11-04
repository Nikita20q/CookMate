import { safeReturnTo } from "@/lib/session";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Route as loginRoute } from "@/routes/auth/login";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { authApi } from "@/api/auth/api";
import Button from "@/components/ui/Button";
import AuthFields, { type AuthValues } from "@/components/auth/AuthFields";
import EmailVerificationForm from "@/components/auth/EmailVerificationForm";
import { setApiFormErrors } from "@/lib/form-errors";
import { useAuthStore } from "@/store/auth";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { returnTo } = useSearch({ from: "/auth/register" });
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const form = useForm<AuthValues>({
    defaultValues: { email: "", password: "" },
  });
  const { handleSubmit, setError, formState: { isSubmitting } } = form;

  const handleRegister = async (data: AuthValues) => {
    try {
      await authApi.register(data.email, data.password);
      setVerificationEmail(data.email);
    } catch (error) {
      setApiFormErrors(error, setError, ["email", "password"], "Не удалось зарегистрироваться. Попробуйте снова.");
    }
  };

  return (
    <div className="min-h-[calc(100dvh-var(--app-header-height,0rem))] flex flex-col items-center justify-center px-4 py-8">
      {verificationEmail !== null && (
        <EmailVerificationForm
          email={verificationEmail}
          onClose={() => setVerificationEmail(null)}
          onVerified={(token) => {
            useAuthStore.getState().setAccessToken(token);
            navigate({ href: safeReturnTo(returnTo) });
          }}
        />
      )}
      <div className="bg-card w-full max-w-md p-6 sm:p-10 rounded-xl flex flex-col items-center justify-center gap-10 border-custom border">
        <h1>Регистрация</h1>
        <form noValidate className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(handleRegister)}>
          <AuthFields form={form} registration readOnly={verificationEmail !== null} />
          <Button type="submit" text="Зарегистрироваться" disabled={isSubmitting || verificationEmail !== null} />
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
