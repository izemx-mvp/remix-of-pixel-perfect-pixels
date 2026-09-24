import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, KpiCard, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { dateTime, shortDate } from "@/lib/format";
import { TICKET_FLOW, useStore } from "@/lib/store";
import type { Ticket, TicketStatus } from "@/lib/types";

export const Route = createFileRoute("/sinophra/sav")({
  head: () => ({
    meta: [
      { title: "SAV réseau — SINOPHRA" },
      { name: "description", content: "Tickets SAV remontés par les revendeurs, garanties et pièces requises." },
      { property: "og:title", content: "SAV réseau — SINOPHRA" },
      { property: "og:description", content: "Centralisation du service après-vente du réseau." },
    ],
  }),
  component: SavPage,
});

function SavPage() {
  const { tickets, dealers, customers, products, updateTicket, replyTicket } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const columns: Column<Ticket>[] = [
    { key: "id", header: "Ticket", render: (t) => <span className="font-medium">{t.id}</span>, sortValue: (t) => t.id },
    { key: "dealer", header: "Revendeur", render: (t) => dealers.find((d) => d.id === t.dealerId)?.name ?? "—" },
    { key: "client", header: "Client", render: (t) => customers.find((c) => c.id === t.customerId)?.name ?? "—" },
    { key: "moto", header: "Moto", render: (t) => products.find((p) => p.id === t.productId)?.name ?? "—" },
    { key: "serial", header: "N° série", render: (t) => t.serial },
    { key: "subject", header: "Sujet", render: (t) => t.subject },
    { key: "prio", header: "Priorité", render: (t) => <StatusBadge status={t.priority} /> },
    { key: "status", header: "Statut", render: (t) => <StatusBadge status={t.status} /> },
    { key: "date", header: "Date", render: (t) => shortDate(t.date), sortValue: (t) => t.date },
  ];

  return (
    <>
      <PageHeader title="SAV réseau" subtitle="Tickets remontés par les revendeurs Motopark." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Tickets ouverts" value={tickets.filter((t) => t.status !== "Résolu").length} tone="warning" />
        <KpiCard label="Escaladés" value={tickets.filter((t) => t.escalated).length} tone="danger" />
        <KpiCard label="Sous garantie" value={tickets.filter((t) => t.warranty).length} tone="success" />
        <KpiCard label="Résolus" value={tickets.filter((t) => t.status === "Résolu").length} />
      </div>

      <DataTable
        rows={tickets}
        columns={columns}
        searchText={(t) => `${t.id} ${t.subject} ${t.serial}`}
        onRowClick={(t) => setSelectedId(t.id)}
        exportName="sav-reseau"
        pageSize={12}
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id} — {selected.subject}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-10">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <StatusBadge status={selected.priority} />
                  <Select
                    value={selected.status}
                    onValueChange={(v) => updateTicket(selected.id, { status: v as TicketStatus })}
                  >
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_FLOW.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Revendeur" value={dealers.find((d) => d.id === selected.dealerId)?.name ?? "—"} />
                  <Info label="Client" value={customers.find((c) => c.id === selected.customerId)?.name ?? "—"} />
                  <Info label="Moto" value={products.find((p) => p.id === selected.productId)?.name ?? "—"} />
                  <Info label="N° série" value={selected.serial} />
                  <Info label="Garantie" value={selected.warranty ? "Sous garantie" : "Hors garantie"} />
                  <Info label="Ouvert le" value={shortDate(selected.date)} />
                </div>

                {selected.parts.length > 0 && (
                  <div className="rounded-lg border p-4 text-sm">
                    <p className="mb-2 font-medium">Pièces nécessaires</p>
                    <p className="text-muted-foreground">{selected.parts.join(", ")}</p>
                  </div>
                )}

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Conversation</p>
                  <div className="space-y-2">
                    {selected.messages.map((m, i) => (
                      <div key={i} className="rounded-md bg-muted px-3 py-2 text-sm">
                        <p className="text-xs font-medium text-muted-foreground">{m.from} · {dateTime(m.date)}</p>
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Répondre au revendeur…"
                    />
                    <Button
                      disabled={!reply.trim()}
                      onClick={() => {
                        replyTicket(selected.id, "SINOPHRA", reply);
                        setReply("");
                      }}
                    >
                      <Send className="h-4 w-4" /> Envoyer
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border p-4 text-sm">
                  <p className="mb-2 font-medium">Notes internes</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {selected.notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
