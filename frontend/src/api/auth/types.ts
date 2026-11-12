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

// TMP
export interface MeResponse {
  userId: number;
  isStaff: boolean;
  email: string;
}
