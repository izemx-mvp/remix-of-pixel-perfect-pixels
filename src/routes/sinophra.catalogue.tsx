import { createFileRoute } from "@tanstack/react-router";
import { Catalogue } from "@/components/Catalogue";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/sinophra/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue motos — SINOPHRA" },
      { name: "description", content: "Catalogue des modèles de motos importés et distribués par SINOPHRA." },
      { property: "og:title", content: "Catalogue motos — SINOPHRA" },
      { property: "og:description", content: "Modèles, prix revendeur, stock central et stock réseau." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Catalogue — Motos" subtitle="Modèles importés, prix revendeur et disponibilité réseau." />
      <Catalogue kind="moto" />
    </>
  ),
});
