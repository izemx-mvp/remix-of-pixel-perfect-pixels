import { createFileRoute } from "@tanstack/react-router";
import { Catalogue } from "@/components/Catalogue";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/sinophra/pieces")({
  head: () => ({
    meta: [
      { title: "Matériel & Pièces — SINOPHRA" },
      { name: "description", content: "Casques, pneus, batteries, lubrifiants et pièces détachées du stock SINOPHRA." },
      { property: "og:title", content: "Matériel & Pièces — SINOPHRA" },
      { property: "og:description", content: "Catalogue matériel et pièces détachées avec disponibilité réseau." },
    ],
  }),
  component: () => (
    <>
      <PageHeader
        title="Catalogue — Matériel & Pièces"
        subtitle="Casques, pneus, batteries, freinage, lubrifiants et accessoires."
      />
      <Catalogue kind="piece" />
    </>
  ),
});
