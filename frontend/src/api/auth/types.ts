export interface LoginResponse {
  token: string;
  userId: number;
  email: string;
  message: string;
}

export interface VerifyEmailResponse {
  token: string;
  userId: number;
  email: string;
  message: string;
}
