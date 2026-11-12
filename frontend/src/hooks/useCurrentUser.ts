import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/api/auth/api";
import { useAuthStore } from "@/store/auth";

export function useCurrentUser() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const query = useQuery({
    queryKey: ["me", accessToken],
    queryFn: authApi.me,
    enabled: accessToken !== null,
    retry: false,
  });

  return {
    ...query,
    canManageRecipes:
      accessToken !== null && query.isSuccess && query.data.isStaff === true,
  };
}
