import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiNote, DataTable, KpiCard, StatusBadge, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { invoiceInsight } from "@/lib/ai";
import { mad, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, FileText } from "lucide-react";

const TONE = { success: "text-success", warning: "text-warning", danger: "text-destructive", info: "text-muted-foreground" };

/** Tableau factures + drawer, partagé SINOPHRA / MOTOPARK (dealerId = scope revendeur). */
export function InvoicesView({ dealerId }: { dealerId?: string }) {
  const { invoices: all, dealers, orders, products, updateInvoice } = useStore();
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const invoices = dealerId ? all.filter((i) => i.dealerId === dealerId) : all;
  const rows = status === "all" ? invoices : invoices.filter((i) => i.status === status);
  const selected = all.find((i) => i.id === selectedId) ?? null;
  const dealerName = (id: string) => dealers.find((d) => d.id === id)?.name ?? "—";
  const ins = (i: Invoice) => invoiceInsight(i, all);

  const columns: Column<Invoice>[] = [
    { key: "id", header: "Facture", render: (i) => <span className="font-medium">{i.id}</span>, sortValue: (i) => i.id },
    { key: "order", header: "Commande", render: (i) => i.orderId },
    ...(dealerId ? [] : [{ key: "dealer", header: "Revendeur", render: (i: Invoice) => dealerName(i.dealerId), sortValue: (i: Invoice) => dealerName(i.dealerId) }]),
    { key: "date", header: "Date", render: (i) => shortDate(i.date), sortValue: (i) => i.date },
    { key: "due", header: "Échéance", render: (i) => shortDate(i.dueDate), sortValue: (i) => i.dueDate },
    { key: "amount", header: "Montant", render: (i) => mad(i.amount), sortValue: (i) => i.amount },
    { key: "status", header: "Statut", render: (i) => <StatusBadge status={i.status} /> },
    {
      key: "days",
      header: "J ± échéance",
      render: (i) => (i.status === "Payée" ? "—" : <span className={cn("tabular-nums", ins(i).days < 0 && "text-destructive font-medium")}>{ins(i).days >= 0 ? `J-${ins(i).days}` : `J+${-ins(i).days}`}</span>),
      sortValue: (i) => ins(i).days,
    },
    { key: "ai", header: "Analyse IA", render: (i) => <span className={cn("text-xs", TONE[ins(i).tone])}>{ins(i).text}</span> },
  ];

  const unpaid = invoices.filter((i) => i.status !== "Payée");
  const late = invoices.filter((i) => i.status === "En retard" || (i.status !== "Payée" && ins(i).days < 0));
  const order = selected ? orders.find((o) => o.id === selected.orderId) : undefined;
  const sIns = selected ? ins(selected) : null;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Factures" value={invoices.length} icon={FileText} />
        <KpiCard label="Encours" value={mad(unpaid.reduce((s, i) => s + i.amount, 0))} icon={Clock} tone="accent" />
        <KpiCard label="En retard" value={late.length} icon={AlertTriangle} tone="danger" onClick={() => setStatus("En retard")} />
        <KpiCard label="Payées" value={invoices.filter((i) => i.status === "Payée").length} icon={CheckCircle2} tone="success" />
      </div>
      <DataTable
        rows={rows}
        columns={columns}
        searchText={(i) => `${i.id} ${i.orderId} ${dealerName(i.dealerId)}`}
        onRowClick={(i) => setSelectedId(i.id)}
        exportName="factures"
        filters={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              {["Brouillon", "Envoyée", "Payée", "En retard"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && sIns && (
            <>
              <SheetHeader><SheetTitle>{selected.id}</SheetTitle></SheetHeader>
              <div className="space-y-5 px-4 pb-10">
                <StatusBadge status={selected.status} />
                <AiNote tone={sIns.tone === "info" ? "accent" : sIns.tone}>{sIns.text}</AiNote>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Revendeur" value={dealerName(selected.dealerId)} />
                  <Info label="Commande liée" value={selected.orderId} />
                  <Info label="Émise le" value={shortDate(selected.date)} />
                  <Info label="Échéance" value={shortDate(selected.dueDate)} />
                  <Info label="Montant TTC" value={mad(selected.amount)} />
                  <Info label="Délai paiement moyen" value={`${sIns.payDelay} jours`} />
                </div>
                {order && (
                  <div className="rounded-lg border p-4 text-sm">
                    <p className="mb-2 font-medium">Commande {order.id} — {order.status}</p>
                    {order.lines.map((l, i) => (
                      <div key={i} className="flex justify-between border-b py-1.5 last:border-0">
                        <span>{products.find((p) => p.id === l.productId)?.name} ×{l.qty}</span>
                        <span>{mad(l.qty * l.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="rounded-lg border p-4 text-sm">
                  <p className="mb-2 font-medium">Historique</p>
                  <p className="text-muted-foreground">{shortDate(selected.date)} — Facture émise</p>
                  {selected.status !== "Brouillon" && <p className="text-muted-foreground">{shortDate(selected.date)} — Envoyée au revendeur</p>}
                  {selected.status === "Payée" && <p className="text-success">Paiement reçu</p>}
                </div>
                {!dealerId && (
                  <div className="flex flex-wrap gap-2">
                    {selected.status === "Brouillon" && <Button onClick={() => updateInvoice(selected.id, { status: "Envoyée" })}>Envoyer</Button>}
                    {selected.status !== "Payée" && <Button variant="outline" onClick={() => updateInvoice(selected.id, { status: "Payée" })}>Marquer payée</Button>}
                    {selected.status !== "Payée" && <Button variant="ghost" onClick={() => toast.success(`Relance envoyée à ${dealerName(selected.dealerId)}`)}>Relancer</Button>}
                  </div>
                )}
                <Button variant="ghost" className="w-full" onClick={() => toast.success(`${selected.id}.pdf téléchargé (simulation)`)}>Télécharger PDF</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
