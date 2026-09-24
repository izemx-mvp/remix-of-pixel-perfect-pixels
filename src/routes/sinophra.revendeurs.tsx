import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/sinophra/revendeurs")({
  component: () => <Outlet />,
});
