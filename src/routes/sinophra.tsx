import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  FileText,
  LayoutDashboard,
  Settings,
  Ship,
  ShoppingCart,
  Store,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";

export const Route = createFileRoute("/sinophra")({
  head: () => ({
    meta: [
      { title: "SINOPHRA — Administration importateur" },
      { name: "description", content: "Pilotage des importations, du stock central et du réseau revendeurs." },
      { property: "og:title", content: "SINOPHRA — Administration importateur" },
      { property: "og:description", content: "Pilotage des importations, du stock central et du réseau revendeurs." },
    ],
  }),
  component: SinophraLayout,
});

const items: NavItem[] = [
  { label: "Dashboard", to: "/sinophra", icon: LayoutDashboard, exact: true },
  { label: "Catalogue & Stock", to: "/sinophra/catalogue", icon: Boxes },
  { label: "Approvisionnement", to: "/sinophra/approvisionnement", icon: Ship },
  { label: "Fournisseurs", to: "/sinophra/fournisseurs", icon: Truck },
  { label: "Revendeurs", to: "/sinophra/revendeurs", icon: Store },
  { label: "Commandes revendeurs", to: "/sinophra/commandes", icon: ShoppingCart },
  { label: "Facturation", to: "/sinophra/facturation", icon: FileText },
  { label: "Réclamations", to: "/sinophra/reclamations", icon: Wrench },
  { label: "Analytics", to: "/sinophra/analytics", icon: BarChart3 },
  { label: "Utilisateurs", to: "/sinophra/utilisateurs", icon: Users },
  { label: "Configuration", to: "/sinophra/configuration", icon: Settings },
];

function SinophraLayout() {
  return (
    <AppShell space="sinophra" items={items}>
      <Outlet />
    </AppShell>
  );
}

export const SINOPHRA_NAV = items;
export const SettingsIcon = Settings;
