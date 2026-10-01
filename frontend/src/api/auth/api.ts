import apiClient from "../apiClient";
import { AUTH_ENDPOINTS } from "./endpoints";
import type { LoginResponse, VerifyEmailResponse } from "./types";

export const authApi = {
  register: (email: string, password: string) => {
    return apiClient.post(AUTH_ENDPOINTS.register, { email, password });
  },
  verifyEmail: (email: string, code: string): Promise<VerifyEmailResponse> => {
    return apiClient.post(AUTH_ENDPOINTS.verifyEmail, { email, code });
  },
  login: (email: string, password: string): Promise<LoginResponse> => {
    return apiClient.post(AUTH_ENDPOINTS.login, { email, password });
  },
};
