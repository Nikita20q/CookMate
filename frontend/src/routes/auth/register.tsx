import { authSearch } from "@/lib/session";
import RegisterPage from "@/pages/RegisterPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/register")({
  validateSearch: authSearch,
  component: RegisterPage,
});
