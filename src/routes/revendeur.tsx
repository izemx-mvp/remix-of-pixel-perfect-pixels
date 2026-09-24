import { createFileRoute, Outlet } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  Boxes,
  LayoutDashboard,
  MessageSquare,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";

export const Route = createFileRoute("/revendeur")({
  head: () => ({
    meta: [
      { title: "MOTOPARK — Espace revendeur" },
      { name: "description", content: "Stock, commandes, clients, SAV et agents IA du revendeur Motopark." },
      { property: "og:title", content: "MOTOPARK — Espace revendeur" },
      { property: "og:description", content: "Stock, commandes, clients, SAV et agents IA du revendeur Motopark." },
    ],
  }),
  component: DealerLayout,
});

const items: NavItem[] = [
  { label: "Dashboard", to: "/revendeur", icon: LayoutDashboard, exact: true },
  { label: "Mon stock", to: "/revendeur/stock", icon: Boxes },
  { label: "Catalogue Motopark", to: "/revendeur/catalogue", icon: ShoppingBag },
  { label: "Mes commandes", to: "/revendeur/commandes", icon: ShoppingCart },
  { label: "Mes clients", to: "/revendeur/clients", icon: Users },
  { label: "SAV", to: "/revendeur/sav", icon: Wrench },
  { label: "Conversations", to: "/revendeur/conversations", icon: MessageSquare },
  { label: "Analytics", to: "/revendeur/analytics", icon: BarChart3 },
  { label: "Agents IA", to: "/revendeur/agents", icon: Bot },
  { label: "Configuration", to: "/revendeur/configuration", icon: Settings },
];

function DealerLayout() {
  return (
    <AppShell space="dealer" items={items}>
      <Outlet />
    </AppShell>
  );
}
