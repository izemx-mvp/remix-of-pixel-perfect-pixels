import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AiNote, DataTable, KpiCard, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { dateTime, shortDate } from "@/lib/format";
import { TICKET_FLOW, useStore } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { AlertOctagon, ArrowUpRight, Inbox, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/sinophra/reclamations")({
  head: () => ({
    meta: [
      { title: "Réclamations — SINOPHRA" },
      { name: "description", content: "Réclamations, SAV et garanties escaladés par les revendeurs Motopark." },
      { property: "og:title", content: "Réclamations — SINOPHRA" },
      { property: "og:description", content: "Échanges SINOPHRA ↔ revendeurs sur le SAV, les garanties et les livraisons." },
    ],
  }),
  component: ClaimsPage,
});

export const TICKET_TYPES: Ticket["type"][] = ["SAV", "Garantie", "Pièce", "Produit", "Livraison", "Facturation", "Commande", "Autre"];
const OWNERS = ["Sofia Kabbaj", "Imane Tazi", "Mehdi Naciri", "Yassine Berrada"];

function ClaimsPage() {
  const { tickets, dealers, customers, products, updateTicket, replyTicket } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [type, setType] = useState("all");
  const [scope, setScope] = useState("escalated");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const selected = tickets.find((t) => t.id === selectedId) ?? null;
  const dealerName = (id: string) => dealers.find((d) => d.id === id)?.name ?? "—";
  const cust = (id: string) => customers.find((c) => c.id === id);
  const prod = (id: string) => products.find((p) => p.id === id);

  const rows = tickets.filter((t) => (scope === "all" || t.escalated) && (type === "all" || t.type === type));
  const urgent = tickets.filter((t) => t.escalated && !["Résolu", "Clôturée"].includes(t.status) && (t.priority === "Critique" || t.priority === "Haute"));

  const columns: Column<Ticket>[] = [
    { key: "id", header: "Ticket", render: (t) => <span className="font-medium">{t.id}</span>, sortValue: (t) => t.id },
    { key: "d", header: "Revendeur", render: (t) => dealerName(t.dealerId), sortValue: (t) => dealerName(t.dealerId) },
    { key: "c", header: "Client final", render: (t) => cust(t.customerId)?.name ?? "—" },
    { key: "m", header: "Moto", render: (t) => prod(t.productId)?.name ?? "—" },
    { key: "sn", header: "N° série", render: (t) => <span className="font-mono text-xs">{t.serial}</span> },
    { key: "s", header: "Sujet", render: (t) => <span className="text-sm">{t.subject}</span> },
    { key: "t", header: "Type", render: (t) => t.type, sortValue: (t) => t.type },
    { key: "p", header: "Priorité", render: (t) => <StatusBadge status={t.priority} /> },
    { key: "st", header: "Statut", render: (t) => <StatusBadge status={t.status} /> },
    { key: "date", header: "Date", render: (t) => shortDate(t.date), sortValue: (t) => t.date },
    { key: "a", header: "Responsable", render: (t) => <span className="text-xs">{t.assignee}</span> },
  ];

  return (
    <>
      <PageHeader title="Réclamations" subtitle="Centralise les échanges SINOPHRA ↔ revendeurs : SAV, garanties, pièces, livraisons, facturation." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Escaladées" value={tickets.filter((t) => t.escalated).length} icon={ArrowUpRight} tone="accent" />
        <KpiCard label="Ouvertes" value={tickets.filter((t) => !["Résolu", "Clôturée"].includes(t.status)).length} icon={Inbox} />
        <KpiCard label="Urgentes" value={urgent.length} icon={AlertOctagon} tone="danger" />
        <KpiCard label="Sous garantie" value={tickets.filter((t) => t.warranty).length} icon={ShieldCheck} tone="success" />
      </div>
      {urgent.length > 0 && (
        <AiNote tone="warning">
          {urgent.length} réclamations urgentes. Sujet récurrent : « {urgent[0]!.subject} ». {tickets.filter((t) => t.parts.includes("Batterie BTX7")).length} tickets impliquent la Batterie BTX7 — vérifier le lot fournisseur.
        </AiNote>
      )}
      <DataTable
        rows={rows}
        columns={columns}
        searchText={(t) => `${t.id} ${t.subject} ${t.serial} ${dealerName(t.dealerId)} ${cust(t.customerId)?.name}`}
        onRowClick={(t) => setSelectedId(t.id)}
        exportName="reclamations"
        filters={
          <>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="escalated">Escaladées</SelectItem>
                <SelectItem value="all">Toutes (réseau)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                {TICKET_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.id} — {selected.subject}</SheetTitle></SheetHeader>
              <div className="space-y-5 px-4 pb-10">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <StatusBadge status={selected.priority} />
                  <span className="text-xs text-muted-foreground">{selected.type} · {selected.warranty ? "Sous garantie" : "Hors garantie"}</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select value={selected.status} onValueChange={(v) => updateTicket(selected.id, { status: v as Ticket["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{[...TICKET_FLOW, ...(["Envoyée à SINOPHRA", "Réponse SINOPHRA", "Info demandée", "Clôturée"] as const).filter((x) => !TICKET_FLOW.includes(x))].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={selected.assignee} onValueChange={(v) => { updateTicket(selected.id, { assignee: v }); toast.success(`Affecté à ${v}`); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" disabled={selected.status === "Clôturée"} onClick={() => updateTicket(selected.id, { status: "Clôturée" })}>Clôturer</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateTicket(selected.id, { status: "En analyse" })}>En analyse</Button>
                  <Button size="sm" variant="outline" onClick={() => updateTicket(selected.id, { status: "En traitement" })}>Passer en traitement</Button>
                  <Button size="sm" variant="outline" onClick={() => { replyTicket(selected.id, "SINOPHRA", "Merci de nous transmettre des informations complémentaires (photos, facture, n° de série)."); updateTicket(selected.id, { status: "Info demandée" }); }}>Demander une information</Button>
                  <Button size="sm" onClick={() => updateTicket(selected.id, { status: "Résolu" })}>Résoudre</Button>
                </div>
                {selected.description && <p className="rounded-md border p-3 text-sm">{selected.description}{selected.attachment ? ` · Pièce jointe : ${selected.attachment}` : ""}{selected.orderId ? ` · Commande : ${selected.orderId}` : ""}</p>}
                <Tabs defaultValue="msgs">
                  <TabsList className="h-auto flex-wrap">
                    <TabsTrigger value="msgs">Messages</TabsTrigger>
                    <TabsTrigger value="info">Informations</TabsTrigger>
                    <TabsTrigger value="notes">Notes internes</TabsTrigger>
                    <TabsTrigger value="hist">Historique</TabsTrigger>
                  </TabsList>
                  <TabsContent value="msgs" className="space-y-3 pt-4">
                    {selected.messages.map((m, i) => (
                      <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.from === "SINOPHRA" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-[11px] opacity-70">{m.from} · {dateTime(m.date)}</p>
                        {m.text}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Paperclip className="h-3.5 w-3.5" /> photo_panne.jpg · rapport_diagnostic.pdf</div>
                    <div className="flex gap-2">
                      <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Répondre au revendeur…" />
                      <Button disabled={!reply} onClick={() => { replyTicket(selected.id, "SINOPHRA", reply); updateTicket(selected.id, { status: "Réponse SINOPHRA" }); setReply(""); }}>Répondre</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="info" className="pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Info label="Revendeur" value={dealerName(selected.dealerId)} />
                      <Info label="Client" value={cust(selected.customerId)?.name ?? "—"} />
                      <Info label="Téléphone client" value={cust(selected.customerId)?.phone ?? "—"} />
                      <Info label="Moto" value={prod(selected.productId)?.name ?? "—"} />
                      <Info label="N° série" value={selected.serial} />
                      <Info label="Garantie jusqu'au" value={cust(selected.customerId) ? shortDate(cust(selected.customerId)!.warrantyUntil) : "—"} />
                      <Info label="Pièces" value={selected.parts.join(", ") || "—"} />
                      <Info label="Responsable" value={selected.assignee} />
                    </div>
                  </TabsContent>
                  <TabsContent value="notes" className="space-y-2 pt-4">
                    {selected.notes.map((n, i) => <p key={i} className="rounded-md border px-3 py-2 text-sm">{n}</p>)}
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note interne…" />
                    <Button size="sm" disabled={!note} onClick={() => { updateTicket(selected.id, { notes: [...selected.notes, note] }); setNote(""); toast.success("Note ajoutée"); }}>Ajouter note</Button>
                  </TabsContent>
                  <TabsContent value="hist" className="space-y-1 pt-4 text-sm text-muted-foreground">
                    <p>{shortDate(selected.date)} — Ticket créé par {dealerName(selected.dealerId)}</p>
                    {selected.escalated && <p>Escaladé à SINOPHRA</p>}
                    <p>Statut actuel : {selected.status}</p>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
