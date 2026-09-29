import { createFileRoute } from "@tanstack/react-router";
import { InvoicesView } from "@/components/InvoicesView";
import { PageHeader } from "@/components/ui-kit";
import { useDealerScope } from "@/lib/store";

export const Route = createFileRoute("/revendeur/factures")({
  head: () => ({
    meta: [
      { title: "Factures — MOTOPARK" },
      { name: "description", content: "Factures SINOPHRA, échéances et statuts de paiement." },
      { property: "og:title", content: "Factures — MOTOPARK" },
      { property: "og:description", content: "Factures du revendeur Motopark." },
    ],
  }),
  component: DealerInvoices,
});

function DealerInvoices() {
  const { dealerId } = useDealerScope();
  return (
    <>
      <PageHeader title="Factures" subtitle="Factures émises par SINOPHRA pour vos commandes." />
      <InvoicesView dealerId={dealerId} />
    </>
  );
}
