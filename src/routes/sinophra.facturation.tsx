import { createFileRoute } from "@tanstack/react-router";
import { InvoicesView } from "@/components/InvoicesView";
import { PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/sinophra/facturation")({
  head: () => ({
    meta: [
      { title: "Facturation — SINOPHRA" },
      { name: "description", content: "Factures revendeurs, échéances et analyse IA des risques de retard." },
      { property: "og:title", content: "Facturation — SINOPHRA" },
      { property: "og:description", content: "Suivi des factures et paiements du réseau." },
    ],
  }),
  component: () => (
    <>
      <PageHeader title="Facturation" subtitle="Factures générées depuis les commandes, échéances et risques de paiement." />
      <InvoicesView />
    </>
  ),
});
