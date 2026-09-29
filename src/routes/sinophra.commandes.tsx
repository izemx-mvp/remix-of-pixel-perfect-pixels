import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiNote, DataTable, PageHeader, Pill, StatusBadge, Timeline, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { InvoiceDialog } from "@/components/OrderDialogs";
import { mad, num, shortDate } from "@/lib/format";
import { ORDER_FLOW, useStore } from "@/lib/store";
import type { DealerOrder, OrderStatus } from "@/lib/types";

export const Route = createFileRoute("/sinophra/commandes")({
  head: () => ({
    meta: [
      { title: "Commandes revendeurs — SINOPHRA" },
      { name: "description", content: "Validation, préparation, expédition et facturation des commandes revendeurs." },
      { property: "og:title", content: "Commandes revendeurs — SINOPHRA" },
      { property: "og:description", content: "Workflow des commandes du réseau Motopark." },
    ],
  }),
  component: OrdersPage,
});

export function orderAmount(o: DealerOrder) {
  return o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
}

const ACTIONS: Partial<Record<OrderStatus, [string, OrderStatus]>> = {
  "Commande reçue": ["Valider", "Validée"],
  Validée: ["Préparer", "Préparation"],
  Préparation: ["Marquer prête", "Prête"],
  Prête: ["Expédier", "Expédiée"],
  Expédiée: ["Marquer livrée", "Livrée"],
};

function OrdersPage() {
  const { orders, dealers, products, invoices, advanceOrder } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<string | null>(null);
  const [status, setStatus] = useState("all");
  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const dealerName = (id: string) => dealers.find((d) => d.id === id)?.name ?? "—";
  const invoiceOf = (id: string) => invoices.find((i) => i.orderId === id);
  const idx = (o: DealerOrder) => ORDER_FLOW.indexOf(o.status);

  const rowActions = (o: DealerOrder) => {
    const next = ACTIONS[o.status];
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => setSelectedId(o.id)}>Voir</DropdownMenuItem>
          {next && <DropdownMenuItem onClick={() => advanceOrder(o.id, next[1])}>{next[0]}</DropdownMenuItem>}
          {o.status === "Commande reçue" && <DropdownMenuItem onClick={() => advanceOrder(o.id, "Refusée")}>Refuser</DropdownMenuItem>}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setInvoiceFor(o.id)}><FileText className="h-4 w-4" /> Générer facture</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const columns: Column<DealerOrder>[] = [
    { key: "id", header: "Commande", render: (o) => <span className="font-medium">{o.id}</span>, sortValue: (o) => o.id },
    { key: "dealer", header: "Revendeur", render: (o) => dealerName(o.dealerId), sortValue: (o) => dealerName(o.dealerId) },
    { key: "date", header: "Date", render: (o) => shortDate(o.date), sortValue: (o) => o.date },
    { key: "prod", header: "Produits", render: (o) => <span className="text-xs">{o.lines.map((l) => products.find((p) => p.id === l.productId)?.name).join(", ")}</span> },
    { key: "qty", header: "Qté", render: (o) => num(o.lines.reduce((s, l) => s + l.qty, 0)) },
    { key: "amount", header: "Montant", render: (o) => mad(orderAmount(o)), sortValue: (o) => orderAmount(o) },
    { key: "status", header: "Statut", render: (o) => <StatusBadge status={o.status} />, sortValue: (o) => idx(o) },
    {
      key: "prep",
      header: "Préparation",
      render: (o) => <Pill tone={idx(o) >= 3 ? "success" : idx(o) === 2 ? "warning" : "neutral"}>{idx(o) >= 3 ? "Prête" : idx(o) === 2 ? "En cours" : o.status === "Refusée" ? "—" : "À faire"}</Pill>,
    },
    {
      key: "ship",
      header: "Livraison",
      render: (o) => <span className="text-xs">{idx(o) >= 5 ? "Livrée" : idx(o) === 4 ? "En route" : shortDate(o.expectedDelivery)}</span>,
    },
    { key: "inv", header: "Facture", render: (o) => <span className="text-xs">{invoiceOf(o.id)?.id ?? "—"}</span> },
    { key: "act", header: "", render: rowActions, className: "w-10" },
  ];

  const rows = status === "all" ? orders : orders.filter((o) => o.status === status);
  const next = selected ? ACTIONS[selected.status] : undefined;
  const inv = selected ? invoiceOf(selected.id) : undefined;

  return (
    <>
      <PageHeader title="Commandes revendeurs" subtitle="Commande reçue → validée → préparation → prête → expédiée → livrée → réception confirmée." />
      <AiNote>
        {orders.filter((o) => o.status === "Commande reçue").length} commandes attendent une validation et{" "}
        {orders.filter((o) => o.status === "Livrée" && !invoiceOf(o.id)).length} commandes livrées ne sont pas encore facturées.
      </AiNote>
      <DataTable
        rows={rows}
        columns={columns}
        searchText={(o) => `${o.id} ${dealerName(o.dealerId)} ${o.status}`}
        onRowClick={(o) => setSelectedId(o.id)}
        exportName="commandes-revendeurs"
        pageSize={12}
        filters={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {[...ORDER_FLOW, "Refusée"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.id}</SheetTitle></SheetHeader>
              <div className="space-y-6 px-4 pb-10">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Revendeur" value={dealerName(selected.dealerId)} />
                  <Info label="Date" value={shortDate(selected.date)} />
                  <Info label="Montant HT" value={mad(orderAmount(selected))} />
                  <Info label="Livraison prévue" value={shortDate(selected.expectedDelivery)} />
                  <Info label="Facture" value={inv?.id ?? "Non générée"} />
                  <Info label="Statut facture" value={inv?.status ?? "—"} />
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Lignes de commande</p>
                  {selected.lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                      <span className="truncate">{products.find((p) => p.id === l.productId)?.name}</span>
                      <span className="text-muted-foreground">×{l.qty}</span>
                      <span className="font-medium">{mad(l.qty * l.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Workflow</p>
                  <Timeline steps={ORDER_FLOW} currentIndex={idx(selected)} />
                  <div className="flex flex-wrap gap-2">
                    {next && <Button onClick={() => advanceOrder(selected.id, next[1])}>{next[0]}</Button>}
                    {selected.status === "Commande reçue" && (
                      <Button variant="outline" onClick={() => advanceOrder(selected.id, "Refusée")}>Refuser</Button>
                    )}
                    <Button variant="outline" onClick={() => setInvoiceFor(selected.id)}><FileText className="h-4 w-4" /> Générer facture</Button>
                    <Button variant="ghost" onClick={() => toast.success(`BL ${selected.id} téléchargé (simulation)`)}><Download className="h-4 w-4" /> BL</Button>
                  </div>
                  {selected.status === "Livrée" && <p className="mt-3 text-xs text-muted-foreground">En attente de la confirmation de réception par le revendeur.</p>}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <InvoiceDialog orderId={invoiceFor} onClose={() => setInvoiceFor(null)} />
    </>
  );
}
