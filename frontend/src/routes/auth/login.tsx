import { authSearch } from "@/lib/session";
import LoginPage from "@/pages/LoginPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/login")({
  validateSearch: authSearch,
  component: LoginPage,
});
