import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowUpRight, Send, TicketPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatusBadge } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { dateTime, shortDate } from "@/lib/format";
import { useDealerScope, useStore } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/revendeur/reclamations")({
  head: () => ({
    meta: [
      { title: "Réclamations & Conversations — MOTOPARK" },
      { name: "description", content: "Conversations clients, tickets SAV et escalade vers SINOPHRA dans une seule interface." },
      { property: "og:title", content: "Réclamations & Conversations — MOTOPARK" },
      { property: "og:description", content: "SAV, réclamations et conversations clients." },
    ],
  }),
  component: Inbox,
});

const TYPES: Ticket["type"][] = ["SAV", "Garantie", "Pièce", "Produit", "Livraison", "Facturation", "Autre"];

function Inbox() {
  const { products, orders, sendMessage, escalateConversation, updateTicket, replyTicket } = useStore();
  const { conversations, tickets, customers } = useDealerScope();
  const [view, setView] = useState<"conv" | "ticket">("conv");
  const [sel, setSel] = useState<string | null>(conversations[0]?.id ?? null);
  const [text, setText] = useState("");
  const [esc, setEsc] = useState(false);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<Ticket["type"]>("SAV");

  const conv = view === "conv" ? conversations.find((c) => c.id === sel) : undefined;
  const ticket = view === "ticket" ? tickets.find((t) => t.id === sel) : undefined;
  const customer = conv ? customers.find((c) => c.name === conv.customerName) ?? customers[0] : ticket ? customers.find((c) => c.id === ticket.customerId) : undefined;
  const moto = customer ? products.find((p) => p.id === customer.productId) : undefined;
  const lastOrder = orders.find((o) => o.dealerId === customer?.dealerId);

  const messages = conv
    ? conv.messages.map((m) => ({ mine: m.from === "dealer", who: m.from === "dealer" ? "Vous" : conv.customerName, text: m.text, at: m.at }))
    : ticket
      ? ticket.messages.map((m) => ({ mine: m.from === "Revendeur", who: m.from, text: m.text, at: m.date }))
      : [];

  const send = () => {
    if (!text.trim()) return;
    if (conv) sendMessage(conv.id, text);
    if (ticket) replyTicket(ticket.id, "Revendeur", text);
    setText("");
  };

  return (
    <>
      <PageHeader title="Réclamations & Conversations" subtitle="Conversations clients, tickets SAV et escalade vers SINOPHRA." />
      <div className="grid h-[calc(100vh-13rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card lg:grid-cols-[300px_1fr_300px]">
        <div className="flex min-h-0 flex-col border-r">
          <Tabs value={view} onValueChange={(v) => { setView(v as "conv" | "ticket"); setSel(v === "conv" ? conversations[0]?.id ?? null : tickets[0]?.id ?? null); }} className="p-3">
            <TabsList className="w-full"><TabsTrigger value="conv" className="flex-1">Conversations</TabsTrigger><TabsTrigger value="ticket" className="flex-1">Tickets ({tickets.length})</TabsTrigger></TabsList>
          </Tabs>
          <div className="flex-1 overflow-y-auto">
            {view === "conv" && conversations.map((c) => (
              <button key={c.id} onClick={() => setSel(c.id)} className={cn("block w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent", sel === c.id && "bg-primary/10")}>
                <div className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{c.customerName}</span>{c.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</span>}</div>
                <p className="truncate text-xs text-muted-foreground">{c.topic} · {c.messages.at(-1)?.text}</p>
              </button>
            ))}
            {view === "ticket" && tickets.map((t) => (
              <button key={t.id} onClick={() => setSel(t.id)} className={cn("block w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent", sel === t.id && "bg-primary/10")}>
                <div className="flex justify-between gap-2"><span className="text-sm font-medium">{t.id}</span><StatusBadge status={t.status} /></div>
                <p className="truncate text-xs text-muted-foreground">{t.subject}{t.escalated ? " · Escaladé" : ""}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <p className="mr-auto truncate font-medium">{conv ? `${conv.customerName} — ${conv.topic}` : ticket ? `${ticket.id} — ${ticket.subject}` : "Sélectionnez un élément"}</p>
            {conv && <Button size="sm" variant="outline" onClick={() => { setSubject(`${conv.topic} — ${conv.customerName}`); setType(conv.topic === "Garantie" ? "Garantie" : "SAV"); setEsc(true); }}><TicketPlus className="h-4 w-4" /> Créer réclamation</Button>}
            {conv && <Button size="sm" onClick={() => { setSubject(`${conv.topic} — ${conv.customerName}`); setEsc(true); }}><ArrowUpRight className="h-4 w-4" /> Escalader SINOPHRA</Button>}
            {ticket && !ticket.escalated && <Button size="sm" onClick={() => updateTicket(ticket.id, { escalated: true })}><ArrowUpRight className="h-4 w-4" /> Escalader SINOPHRA</Button>}
            {ticket && <Button size="sm" variant="ghost" onClick={() => { updateTicket(ticket.id, { notes: [...ticket.notes, "Note revendeur ajoutée"] }); toast.success("Note ajoutée"); }}>Ajouter note</Button>}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("max-w-[75%] rounded-xl px-3 py-2 text-sm", m.mine ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                <p className="text-[11px] opacity-70">{m.who} · {dateTime(m.at)}</p>{m.text}
              </div>
            ))}
          </div>
          <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Répondre…" />
            <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
          </form>
        </div>

        <div className="hidden space-y-3 overflow-y-auto border-l p-4 lg:block">
          <p className="text-sm font-semibold">Fiche client</p>
          {customer ? (
            <div className="grid gap-2 text-sm">
              <Info label="Client" value={customer.name} />
              <Info label="Téléphone" value={customer.phone} />
              <Info label="Moto" value={moto?.name ?? "—"} />
              <Info label="N° série" value={customer.serial} />
              <Info label="Achat" value={shortDate(customer.purchaseDate)} />
              <Info label="Garantie" value={new Date(customer.warrantyUntil) > new Date() ? `Active jusqu'au ${shortDate(customer.warrantyUntil)}` : "Expirée"} />
              <Info label="Dernière commande" value={lastOrder ? `${lastOrder.id} · ${lastOrder.status}` : "—"} />
            </div>
          ) : <p className="text-sm text-muted-foreground">—</p>}
        </div>
      </div>

      <Dialog open={esc} onOpenChange={setEsc}>
        <DialogContent>
          <DialogHeader><DialogTitle>Créer une réclamation et escalader à SINOPHRA</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2"><Label>Sujet</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as Ticket["type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={() => { if (conv) escalateConversation(conv.id, subject, type); setEsc(false); }}>Créer et escalader</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
