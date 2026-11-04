import { isAxiosError } from "axios";

export interface ApiError {
  message: string;
  fieldErrors: Record<string, string>;
  status?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readMessage(value: unknown, depth = 0): string | undefined {
  if (depth > 4) return;
  if (typeof value === "string") {
    const text = value.trim();
    return text && !/<\/?[a-z][^>]*>/i.test(text) ? text : undefined;
  }
  if (Array.isArray(value)) {
    const messages = value.map((item) => readMessage(item, depth + 1)).filter(Boolean);
    return [...new Set(messages)].join("; ") || undefined;
  }
  if (isRecord(value)) {
    for (const key of ["message", "detail", "defaultMessage", "error", "title"]) {
      const message = readMessage(value[key], depth + 1);
      if (message) return message;
    }
  }
}

function readFieldErrors(data: unknown): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  if (!isRecord(data)) return result;
  for (const source of [data.errors, data.fieldErrors]) {
    if (Array.isArray(source)) {
      for (const item of source) {
        if (!isRecord(item)) continue;
        const field = item.field ?? item.path;
        const message = readMessage(item);
        if (typeof field === "string" && message) result[field] = message;
      }
    } else if (isRecord(source)) {
      for (const [field, value] of Object.entries(source)) {
        const message = readMessage(value);
        if (message) result[field] = message;
      }
    }
  }
  return result;
}

export function getApiError(error: unknown, fallback = "Произошла ошибка. Попробуйте снова."): ApiError {
  const axiosError = isAxiosError(error);
  const status = axiosError ? error.response?.status : undefined;
  const data: unknown = axiosError ? error.response?.data : error;
  const fieldErrors = readFieldErrors(data);
  const fieldMessage = Object.values(fieldErrors).join("; ");
  let message: string | undefined;

  if (isRecord(data)) {
    message = readMessage(data.message) ?? readMessage(data.detail) ??
      readMessage(data.error) ?? (fieldMessage || undefined) ??
      readMessage(data.errors) ?? readMessage(data.title);
  } else {
    message = readMessage(data);
  }

  if (!message && axiosError) {
    if (error.code === "ERR_SESSION_EXPIRED") message = "Сессия истекла. Войдите снова.";
    else if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      message = "Сервер не ответил вовремя. Попробуйте снова.";
    } else if (!error.response) message = "Не удалось связаться с сервером. Проверьте подключение.";
    else if (status === 401) message = "Необходим вход в аккаунт.";
    else if (status === 403) message = "Недостаточно прав для выполнения запроса.";
    else if (status === 413) message = "Размер файла превышает допустимый лимит (10 МБ).";
    else if (status === 429) message = "Слишком много запросов. Попробуйте позже.";
    else if (status !== undefined && status >= 500) message = "Сервер временно недоступен. Попробуйте позже.";
  }

  return { message: message ?? fallback, fieldErrors, status };
}
