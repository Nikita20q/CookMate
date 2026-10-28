import { Controller, useForm, useWatch } from "react-hook-form";
import { X } from "lucide-react";
import { authApi } from "@/api/auth/api";
import { setApiFormErrors } from "@/lib/form-errors";
import Button from "@/components/ui/Button";
import FormError from "@/components/ui/FormError";

interface VerificationValues {
  code: string;
}

interface EmailVerificationFormProps {
  email: string;
  onClose: () => void;
  onVerified: (token: string) => void;
}

export default function EmailVerificationForm({ email, onClose, onVerified }: EmailVerificationFormProps) {
  const { control, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<VerificationValues>({
    defaultValues: { code: "" },
  });
  const code = useWatch({ control, name: "code" });

  const handleConfirm = async (data: VerificationValues) => {
    try {
      const result = await authApi.verifyEmail(email, data.code);
      onVerified(result.token);
    } catch (error) {
      setApiFormErrors(error, setError, ["code"], "Не удалось подтвердить почту. Попробуйте снова.");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verification-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => { if (!isSubmitting) onClose(); }}
    >
      <form
        noValidate
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit(handleConfirm)}
      >
        <div className="flex items-center justify-between border-b border-custom pb-4">
          <h3 id="verification-title" className="text-lg font-semibold text-foreground">Подтвердите код</h3>
          <button
            type="button"
            aria-label="Закрыть подтверждение"
            className="rounded-lg p-1 text-foreground hover:text-muted-foreground"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X />
          </button>
        </div>
        <Controller
          name="code"
          control={control}
          rules={{ required: "Введите код подтверждения", pattern: { value: /^\d{6}$/, message: "Код должен содержать 6 цифр" } }}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              inputMode="numeric"
              maxLength={6}
              aria-label="Код подтверждения"
              aria-invalid={!!errors.code}
              aria-describedby={errors.code ? "code-error" : undefined}
              autoComplete="one-time-code"
              readOnly={isSubmitting}
              onChange={(event) => {
                field.onChange(event.target.value.replace(/\D/g, "").slice(0, 6));
                clearErrors("code");
                clearErrors("root");
              }}
              placeholder="Введите 6-значный код"
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
            />
          )}
        />
        <FormError id="code-error" message={errors.code?.message} />
        <FormError message={errors.root?.server?.message} />
        <div className="mt-4 flex justify-end space-x-2 border-t border-gray-100 pt-4">
          <Button onClick={onClose} variant="secondary" text="Отмена" disabled={isSubmitting} />
          <Button disabled={code.length !== 6 || isSubmitting} type="submit" text="Отправить" />
        </div>
      </form>
    </div>
  );
}
