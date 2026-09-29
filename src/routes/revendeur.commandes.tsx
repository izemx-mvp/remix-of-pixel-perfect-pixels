import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, PageHeader, StatusBadge, Timeline, type Column } from "@/components/ui-kit";
import { mad, shortDate } from "@/lib/format";
import { ORDER_FLOW, useDealerScope, useStore } from "@/lib/store";
import type { DealerOrder } from "@/lib/types";

export const Route = createFileRoute("/revendeur/commandes")({
  head: () => ({
    meta: [
      { title: "Mes commandes — MOTOPARK" },
      { name: "description", content: "Suivi des commandes passées à SINOPHRA et confirmation de réception." },
      { property: "og:title", content: "Mes commandes — MOTOPARK" },
      { property: "og:description", content: "Commandes revendeur et réceptions." },
    ],
  }),
  component: DealerOrders,
});

function DealerOrders() {
  const { products, invoices, confirmReception } = useStore();
  const { orders } = useDealerScope();
  const [sel, setSel] = useState<string | null>(null);
  const selected = orders.find((o) => o.id === sel) ?? null;
  const amount = (o: DealerOrder) => o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const columns: Column<DealerOrder>[] = [
    { key: "id", header: "Commande", render: (o) => <span className="font-medium">{o.id}</span>, sortValue: (o) => o.id },
    { key: "d", header: "Date", render: (o) => shortDate(o.date), sortValue: (o) => o.date },
    { key: "p", header: "Produits", render: (o) => <span className="text-xs">{o.lines.map((l) => products.find((p) => p.id === l.productId)?.name).join(", ")}</span> },
    { key: "a", header: "Montant", render: (o) => mad(amount(o)), sortValue: (o) => amount(o) },
    { key: "s", header: "Statut", render: (o) => <StatusBadge status={o.status} /> },
    { key: "f", header: "Facture", render: (o) => invoices.find((i) => i.orderId === o.id)?.id ?? "—" },
  ];
  return (
    <>
      <PageHeader title="Mes commandes" subtitle="Chaque étape validée par SINOPHRA apparaît ici en temps réel." />
      <DataTable rows={orders} columns={columns} searchText={(o) => `${o.id} ${o.status}`} onRowClick={(o) => setSel(o.id)} exportName="mes-commandes" />
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.id}</SheetTitle></SheetHeader>
              <div className="space-y-5 px-4 pb-10">
                {selected.lines.map((l, i) => (
                  <div key={i} className="flex justify-between border-b pb-2 text-sm"><span>{products.find((p) => p.id === l.productId)?.name} ×{l.qty}</span><span>{mad(l.qty * l.unitPrice)}</span></div>
                ))}
                <Timeline steps={ORDER_FLOW} currentIndex={ORDER_FLOW.indexOf(selected.status)} />
                {(selected.status === "Livrée" || selected.status === "Expédiée") && (
                  <Button className="w-full" onClick={() => confirmReception(selected.id)}>Confirmer la réception</Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
