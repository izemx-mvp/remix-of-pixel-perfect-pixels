import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, PageHeader, StatusBadge, Timeline, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { mad, num, shortDate } from "@/lib/format";
import { ORDER_FLOW, useStore } from "@/lib/store";
import type { DealerOrder } from "@/lib/types";

export const Route = createFileRoute("/sinophra/commandes")({
  head: () => ({
    meta: [
      { title: "Commandes revendeurs — SINOPHRA" },
      { name: "description", content: "Validation, préparation et expédition des commandes du réseau revendeurs." },
      { property: "og:title", content: "Commandes revendeurs — SINOPHRA" },
      { property: "og:description", content: "Workflow complet des commandes revendeurs." },
    ],
  }),
  component: OrdersPage,
});

export function orderAmount(o: DealerOrder) {
  return o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

function OrdersPage() {
  const { orders, dealers, products, advanceOrder } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = orders.find((o) => o.id === selectedId) ?? null;

  const columns: Column<DealerOrder>[] = [
    { key: "id", header: "Commande", render: (o) => <span className="font-medium">{o.id}</span>, sortValue: (o) => o.id },
    { key: "dealer", header: "Revendeur", render: (o) => dealers.find((d) => d.id === o.dealerId)?.name ?? "—" },
    { key: "date", header: "Date", render: (o) => shortDate(o.date), sortValue: (o) => o.date },
    { key: "prod", header: "Produits", render: (o) => `${o.lines.length} référence(s)` },
    { key: "qty", header: "Quantité", render: (o) => num(o.lines.reduce((s, l) => s + l.qty, 0)) },
    { key: "amount", header: "Montant", render: (o) => mad(orderAmount(o)), sortValue: (o) => orderAmount(o) },
    { key: "status", header: "Statut", render: (o) => <StatusBadge status={o.status} /> },
  ];

  const nextStatus = (o: DealerOrder) => {
    const i = ORDER_FLOW.indexOf(o.status);
    return i >= 0 && i < ORDER_FLOW.length - 2 ? ORDER_FLOW[i + 1]! : null;
  };

  return (
    <>
      <PageHeader
        title="Commandes revendeurs"
        subtitle="Demande → validation → préparation → expédition → livraison → réception."
      />
      <DataTable
        rows={orders}
        columns={columns}
        searchText={(o) => `${o.id} ${dealers.find((d) => d.id === o.dealerId)?.name} ${o.status}`}
        onRowClick={(o) => setSelectedId(o.id)}
        exportName="commandes-revendeurs"
        pageSize={12}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-10">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Revendeur" value={dealers.find((d) => d.id === selected.dealerId)?.name ?? "—"} />
                  <Info label="Date" value={shortDate(selected.date)} />
                  <Info label="Montant" value={mad(orderAmount(selected))} />
                  <Info label="Livraison prévue" value={shortDate(selected.expectedDelivery)} />
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Lignes de commande</p>
                  {selected.lines.map((l) => (
                    <div key={l.productId} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                      <span className="truncate">{products.find((p) => p.id === l.productId)?.name}</span>
                      <span className="text-muted-foreground">×{l.qty}</span>
                      <span className="font-medium">{mad(l.qty * l.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Workflow</p>
                  <Timeline steps={ORDER_FLOW} currentIndex={ORDER_FLOW.indexOf(selected.status)} />
                  <div className="flex flex-wrap gap-2">
                    {nextStatus(selected) && (
                      <Button onClick={() => advanceOrder(selected.id, nextStatus(selected)!)}>
                        Passer à « {nextStatus(selected)} »
                      </Button>
                    )}
                    {selected.status === "Demande envoyée" && (
                      <Button variant="outline" onClick={() => advanceOrder(selected.id, "Refusée")}>
                        Refuser
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => toast.success(`BL ${selected.id} téléchargé (simulation)`)}>
                      <Download className="h-4 w-4" /> BL
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
