import { ScanPage } from "@/pages/ScanPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: ScanPage,
});
