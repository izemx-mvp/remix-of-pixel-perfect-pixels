import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, KpiCard, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { mad, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Invoice } from "@/lib/types";

export const Route = createFileRoute("/sinophra/facturation")({
  head: () => ({
    meta: [
      { title: "Facturation — SINOPHRA" },
      { name: "description", content: "Factures revendeurs, échéances et statut de paiement." },
      { property: "og:title", content: "Facturation — SINOPHRA" },
      { property: "og:description", content: "Suivi des factures du réseau revendeurs." },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { invoices, dealers } = useStore();

  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const paid = invoices.filter((i) => i.status === "Payée").reduce((s, i) => s + i.amount, 0);
  const late = invoices.filter((i) => i.status === "En retard");

  const columns: Column<Invoice>[] = [
    { key: "id", header: "Facture", render: (i) => <span className="font-medium">{i.id}</span>, sortValue: (i) => i.id },
    { key: "dealer", header: "Revendeur", render: (i) => dealers.find((d) => d.id === i.dealerId)?.name ?? "—" },
    { key: "order", header: "Commande", render: (i) => i.orderId },
    { key: "amount", header: "Montant", render: (i) => mad(i.amount), sortValue: (i) => i.amount },
    { key: "date", header: "Date", render: (i) => shortDate(i.date), sortValue: (i) => i.date },
    { key: "due", header: "Échéance", render: (i) => shortDate(i.dueDate), sortValue: (i) => i.dueDate },
    { key: "status", header: "Statut", render: (i) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Facturation"
        subtitle="Factures du réseau revendeurs et suivi des encaissements."
        actions={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs">
              <Plug className="h-3.5 w-3.5 text-primary" /> Connecteur Odoo — démonstration
            </span>
            <Button variant="outline" onClick={() => toast.success("Synchronisation Odoo simulée")}>
              Synchroniser
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total facturé" value={mad(total)} />
        <KpiCard label="Encaissé" value={mad(paid)} tone="success" />
        <KpiCard label="En retard" value={late.length} hint={mad(late.reduce((s, i) => s + i.amount, 0))} tone="danger" />
        <KpiCard label="Factures" value={invoices.length} />
      </div>

      <DataTable
        rows={invoices}
        columns={columns}
        searchText={(i) => `${i.id} ${i.orderId} ${i.status}`}
        onRowClick={(i) => toast.success(`Facture ${i.id} téléchargée (simulation)`)}
        exportName="factures"
        pageSize={12}
      />
    </>
  );
}
