import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/recipes/$acronym")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/recipes/$acronym"!</div>;
}
