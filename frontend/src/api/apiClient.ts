import { getAccessToken, useAuthStore } from "@/store/auth";
import axios, { AxiosError } from "axios";
import { isSessionValid } from "@/lib/session";
import { AUTH_ENDPOINTS } from "@/api/auth/endpoints";

const authEndpoints: readonly string[] = Object.values(AUTH_ENDPOINTS);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1",
  withCredentials: true,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  if (authEndpoints.includes(config.url ?? "")) {
    config.headers.delete("Authorization");
    return config;
  }
  const storedToken = useAuthStore.getState().accessToken;
  if (storedToken && !isSessionValid(storedToken)) {
    useAuthStore.getState().expireSession(storedToken);
    throw new AxiosError("Сессия истекла. Войдите снова.", "ERR_SESSION_EXPIRED", config);
  }
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: unknown) => {
    if (
      axios.isAxiosError(error) && error.response?.status === 401 &&
      !authEndpoints.includes(error.config?.url ?? "")
    ) {
      const authorization = error.config?.headers.get("Authorization");
      if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
        useAuthStore.getState().expireSession(authorization.slice(7));
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
