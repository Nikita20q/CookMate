import { getAccessToken, useAuthStore } from "@/store/auth";
import axios from "axios";
import { AUTH_ENDPOINTS } from "@/api/auth/endpoints";

const authEndpoints: readonly string[] = Object.entries(AUTH_ENDPOINTS)
  .filter(([name]) => name !== "me")
  .map(([, endpoint]) => endpoint);

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  withCredentials: true,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  if (authEndpoints.includes(config.url ?? "")) {
    config.headers.delete("Authorization");
    return config;
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
