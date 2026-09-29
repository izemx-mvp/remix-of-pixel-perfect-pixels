import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BarChart3, Boxes, FileText, LayoutDashboard, MessagesSquare, Settings, ShoppingCart, UserCog, Users } from "lucide-react";
import { AppShell, type NavItem } from "@/components/AppShell";

export const Route = createFileRoute("/revendeur")({
  head: () => ({
    meta: [
      { title: "MOTOPARK — Espace revendeur" },
      { name: "description", content: "Catalogue & stock, commandes, clients, réclamations et factures du revendeur Motopark." },
      { property: "og:title", content: "MOTOPARK — Espace revendeur" },
      { property: "og:description", content: "Espace revendeur Motopark connecté à SINOPHRA." },
    ],
  }),
  component: DealerLayout,
});

const items: NavItem[] = [
  { label: "Dashboard", to: "/revendeur", icon: LayoutDashboard, exact: true },
  { label: "Catalogue & Stock", to: "/revendeur/catalogue", icon: Boxes },
  { label: "Mes commandes", to: "/revendeur/commandes", icon: ShoppingCart },
  { label: "Mes clients", to: "/revendeur/clients", icon: Users },
  { label: "SAV & Réclamations", to: "/revendeur/reclamations", icon: MessagesSquare },
  { label: "Factures", to: "/revendeur/factures", icon: FileText },
  { label: "Analytics", to: "/revendeur/analytics", icon: BarChart3 },
  { label: "Utilisateurs", to: "/revendeur/utilisateurs", icon: UserCog },
  { label: "Configuration", to: "/revendeur/configuration", icon: Settings },
];

function DealerLayout() {
  return (
    <AppShell space="dealer" items={items}>
      <Outlet />
    </AppShell>
  );
}
