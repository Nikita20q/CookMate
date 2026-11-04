import type { UseFormReturn } from "react-hook-form";
import FormError from "@/components/ui/FormError";

export interface AuthValues {
  email: string;
  password: string;
}

interface AuthFieldsProps {
  form: UseFormReturn<AuthValues>;
  registration?: boolean;
  readOnly?: boolean;
}

export default function AuthFields({ form, registration = false, readOnly = false }: AuthFieldsProps) {
  const { register, clearErrors, formState: { errors, isSubmitting } } = form;

  return (
    <>
      <input
        type="text"
        className="border-custom border-b"
        aria-label="Электронная почта"
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? "email-error" : undefined}
        autoComplete="email"
        placeholder="Электронная почта"
        readOnly={readOnly || isSubmitting}
        {...register("email", {
          setValueAs: (value: string) => value.trim(),
          required: "Введите электронную почту",
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Неверный формат email" },
          onChange: () => { clearErrors("email"); clearErrors("root"); },
        })}
      />
      <FormError id="email-error" message={errors.email?.message} />
      <input
        type="password"
        aria-label="Пароль"
        aria-invalid={!!errors.password}
        aria-describedby={errors.password ? "password-error" : undefined}
        autoComplete={registration ? "new-password" : "current-password"}
        placeholder="Пароль"
        className="border-custom border-b"
        readOnly={readOnly || isSubmitting}
        {...register("password", {
          validate: (value) => value.trim().length > 0 || "Введите пароль",
          ...(registration ? { minLength: { value: 6, message: "Пароль должен быть минимум 6 символов" } } : {}),
          onChange: () => { clearErrors("password"); clearErrors("root"); },
        })}
      />
      <FormError id="password-error" message={errors.password?.message} />
      <FormError message={errors.root?.server?.message} />
    </>
  );
}
