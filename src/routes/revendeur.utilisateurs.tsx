import { createFileRoute } from "@tanstack/react-router";
import { UsersPanel } from "@/components/AdminPanels";

export const Route = createFileRoute("/revendeur/utilisateurs")({
  head: () => ({
    meta: [
      { title: "Utilisateurs — MOTOPARK" },
      { name: "description", content: "Comptes de l'équipe du point de vente." },
      { property: "og:title", content: "Utilisateurs — MOTOPARK" },
      { property: "og:description", content: "Gestion des utilisateurs revendeur." },
    ],
  }),
  component: () => (
    <UsersPanel
      roles={["Gérant", "Vendeur", "Technicien SAV"]}
      initial={[
        ["Responsable point de vente", "Gérant", "gerant@motopark.ma"],
        ["Amine Chraibi", "Vendeur", "a.chraibi@motopark.ma"],
        ["Rachid Fassi", "Technicien SAV", "r.fassi@motopark.ma"],
      ]}
    />
  ),
});
