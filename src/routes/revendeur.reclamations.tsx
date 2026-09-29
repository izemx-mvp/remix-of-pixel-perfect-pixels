import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock, Download, Eye, FileText, Link2, MessageSquare, Paperclip, Plus, Search, Send, TicketPlus, Trash2, Upload, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { dateTime, shortDate } from "@/lib/format";
import { useDealerScope, useStore } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/revendeur/reclamations")({
  head: () => ({
    meta: [
      { title: "SAV & Réclamations — MOTOPARK" },
      { name: "description", content: "SAV, réclamations, conversations clients, FAQ et documents dans une seule interface revendeur." },
      { property: "og:title", content: "SAV & Réclamations — MOTOPARK" },
      { property: "og:description", content: "SAV, réclamations, conversations, FAQ et documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SavModule,
});

const TYPES: Ticket["type"][] = ["SAV", "Garantie", "Pièce", "Produit", "Livraison", "Facturation", "Autre"];
const STATUSES = ["Nouveau", "En analyse", "En traitement", "En attente client", "Escaladé SINOPHRA", "Résolu", "Fermé"] as const;

const FAQ = [
  { q: "Comment ouvrir un dossier SAV ?", cat: "SAV", a: "Depuis l'onglet Conversations, cliquez sur « Créer SAV » ou utilisez le bouton de création. Renseignez le client, la moto et le sujet." },
  { q: "Quels documents sont nécessaires pour une garantie ?", cat: "Garantie", a: "Facture d'achat, numéro de série, photos du défaut et formulaire de garantie signé." },
  { q: "Comment escalader une réclamation à SINOPHRA ?", cat: "Réclamation", a: "Ouvrez le dossier puis cliquez sur « Escalader à SINOPHRA ». Le dossier apparaît immédiatement côté SINOPHRA." },
  { q: "Quel est le délai moyen de traitement ?", cat: "SAV", a: "Environ 3 à 5 jours ouvrés, hors attente de pièces." },
  { q: "Comment suivre une pièce de remplacement ?", cat: "Livraison", a: "La pièce apparaît dans Mes commandes avec son statut de livraison et le dossier SAV lié." },
  { q: "Comment modifier une réclamation ?", cat: "Réclamation", a: "Dans le tableau, cliquez sur « Voir » puis modifiez le statut, la priorité ou ajoutez une note." },
  { q: "Comment clôturer un dossier SAV ?", cat: "SAV", a: "Une fois résolu, cliquez sur « Clôturer ». Le client est notifié automatiquement." },
  { q: "Diagnostic batterie et démarrage moteur", cat: "Garantie", a: "Vérifiez la tension batterie (>12,4 V), les fusibles et le relais de démarreur avant toute demande de garantie." },
];

type Doc = { name: string; cat: string; date: string; size: string };
const INITIAL_DOCS: Doc[] = [
  { name: "Procédure SAV.pdf", cat: "SAV", date: "2026-08-12", size: "420 Ko" },
  { name: "Conditions de garantie.pdf", cat: "Garantie", date: "2026-07-03", size: "310 Ko" },
  { name: "Guide de diagnostic CR50.pdf", cat: "Diagnostic", date: "2026-06-21", size: "1,2 Mo" },
  { name: "Guide de diagnostic V10.pdf", cat: "Diagnostic", date: "2026-06-21", size: "1,1 Mo" },
  { name: "Procédure retour produit.pdf", cat: "Réclamation", date: "2026-05-15", size: "280 Ko" },
  { name: "Formulaire de garantie.pdf", cat: "Garantie", date: "2026-04-02", size: "95 Ko" },
];

function SavModule() {
  const { products, orders, sendMessage, escalateConversation, updateTicket, replyTicket } = useStore();
  const { conversations, tickets, customers } = useDealerScope();
  const [tab, setTab] = useState("overview");
  const [closed, setClosed] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<string>("");
  const [docs, setDocs] = useState<Doc[]>(INITIAL_DOCS);
  const [attach, setAttach] = useState<Record<string, string[]>>({});
  const [links, setLinks] = useState<Record<string, string>>({});

  const statusOf = (t: Ticket) => closed.includes(t.id) ? "Fermé" : t.escalated && t.status !== "Résolu" ? "Escaladé SINOPHRA" : t.status === "Diagnostic" ? "En analyse" : t.status === "Pièce requise" ? "En attente client" : t.status;
  const custOf = (t: Ticket) => customers.find((c) => c.id === t.customerId);
  const prodOf = (id: string) => products.find((p) => p.id === id);
  const openFaq = (q: string) => { setOpenId(null); setTab("faq"); setFaqOpen(q); };

  const open = tickets.filter((t) => !["Résolu", "Fermé"].includes(statusOf(t)));
  const attention = open.filter((t) => t.priority === "Haute" || t.priority === "Critique" || t.escalated).concat(open).filter((t, i, a) => a.indexOf(t) === i).slice(0, 5);
  const ticket = tickets.find((t) => t.id === openId);

  return (
    <>
      <PageHeader title="SAV & Réclamations" subtitle="SAV, réclamations, conversations clients, garanties, FAQ et documents." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview">Vue générale</TabsTrigger>
          <TabsTrigger value="cases">SAV & Réclamations</TabsTrigger>
          <TabsTrigger value="conv">Conversations</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="docs">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label="SAV ouverts" value={open.filter((t) => t.type === "SAV" || t.type === "Garantie").length} icon={Wrench} />
            <KpiCard label="Réclamations ouvertes" value={open.filter((t) => t.type !== "SAV" && t.type !== "Garantie").length} icon={AlertCircle} tone="warning" />
            <KpiCard label="En attente de réponse" value={conversations.reduce((s, c) => s + c.unread, 0)} icon={Clock} tone="accent" />
            <KpiCard label="Dossiers résolus" value={tickets.length - open.length} icon={CheckCircle2} tone="success" />
            <KpiCard label="Escaladés à SINOPHRA" value={tickets.filter((t) => t.escalated).length} icon={ArrowUpRight} />
          </div>
          <SectionCard title="Dossiers nécessitant votre attention">
            <div className="space-y-2">
              {attention.map((t) => (
                <button key={t.id} onClick={() => setOpenId(t.id)} className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent">
                  <span className="min-w-0 truncate"><b>{t.type} {prodOf(t.productId)?.name ?? ""}</b> · {t.subject}</span>
                  <StatusBadge status={t.priority} />
                  <StatusBadge status={statusOf(t)} />
                </button>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="cases" className="pt-4">
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-xs text-muted-foreground">
                <tr>{["Référence", "Type", "Client", "Moto / Produit", "Sujet", "Priorité", "Statut", "Date", "SINOPHRA", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b transition-colors hover:bg-accent/50">
                    <td className="px-3 py-2 font-medium">{t.id}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1">{t.type === "SAV" ? <Wrench className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}{t.type}</span></td>
                    <td className="px-3 py-2">{custOf(t)?.name ?? "—"}</td>
                    <td className="px-3 py-2">{prodOf(t.productId)?.name ?? "—"}</td>
                    <td className="max-w-[220px] truncate px-3 py-2">{t.subject}</td>
                    <td className="px-3 py-2"><StatusBadge status={t.priority} /></td>
                    <td className="px-3 py-2"><StatusBadge status={statusOf(t)} /></td>
                    <td className="px-3 py-2">{shortDate(t.date)}</td>
                    <td className="px-3 py-2">{t.escalated ? "Oui" : "—"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Voir / Modifier / Répondre" onClick={() => setOpenId(t.id)}><Eye className="h-3.5 w-3.5" /></Button>
                        {!t.escalated && <Button size="icon" variant="ghost" className="h-7 w-7" title="Escalader à SINOPHRA" onClick={() => { updateTicket(t.id, { escalated: true }); toast.success("Escaladé à SINOPHRA"); }}><ArrowUpRight className="h-3.5 w-3.5" /></Button>}
                        {!closed.includes(t.id) && <Button size="icon" variant="ghost" className="h-7 w-7" title="Clôturer" onClick={() => { setClosed((c) => [...c, t.id]); toast.success("Dossier clôturé"); }}><CheckCircle2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="conv" className="pt-4">
          <ConversationsPane links={links} setLinks={setLinks} tickets={tickets} onOpenTicket={setOpenId} {...{ conversations, customers, products, orders, sendMessage, escalateConversation }} />
        </TabsContent>

        <TabsContent value="faq" className="pt-4"><FaqPane value={faqOpen} onChange={setFaqOpen} /></TabsContent>
        <TabsContent value="docs" className="pt-4"><DocsPane docs={docs} setDocs={setDocs} /></TabsContent>
      </Tabs>

      <Sheet open={!!ticket} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {ticket && <TicketDetail key={ticket.id} t={ticket} status={statusOf(ticket)} cust={custOf(ticket)} product={prodOf(ticket.productId)?.name ?? "—"}
            order={orders.find((o) => o.dealerId === ticket.dealerId)?.id ?? "—"} docs={docs} attached={attach[ticket.id] ?? []}
            setAttached={(l) => setAttach((a) => ({ ...a, [ticket.id]: l }))} updateTicket={updateTicket} replyTicket={replyTicket}
            onClose={() => { setClosed((c) => [...c, ticket.id]); toast.success("Dossier clôturé"); }} openFaq={openFaq} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

type Store = ReturnType<typeof useStore>;
type Scope = ReturnType<typeof useDealerScope>;

function TicketDetail({ t, status, cust, product, order, docs, attached, setAttached, updateTicket, replyTicket, onClose, openFaq }: {
  t: Ticket; status: string; cust: Scope["customers"][number] | undefined; product: string; order: string; docs: Doc[]; attached: string[];
  setAttached: (l: string[]) => void; updateTicket: Store["updateTicket"]; replyTicket: Store["replyTicket"]; onClose: () => void; openFaq: (q: string) => void;
}) {
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [pick, setPick] = useState("");
  const steps = [
    { l: "Dossier créé", done: true },
    { l: "Diagnostic", done: t.status !== "Nouveau" },
    { l: "Réponse client", done: t.messages.some((m) => m.from === "Revendeur") },
    { l: "Escalade SINOPHRA", done: t.escalated },
    { l: "Réponse SINOPHRA", done: t.messages.some((m) => m.from === "SINOPHRA") },
    { l: "Résolution", done: t.status === "Résolu" || status === "Fermé" },
  ];
  const suggested = /démarr|batter/i.test(t.subject) ? [FAQ[7]!, FAQ[1]!, FAQ[0]!] : t.type === "Livraison" ? [FAQ[4]!, FAQ[2]!] : [FAQ[0]!, FAQ[1]!, FAQ[2]!];
  return (
    <div className="space-y-5">
      <SheetHeader><SheetTitle>{t.id} — {t.subject}</SheetTitle></SheetHeader>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Info label="Type" value={t.type} /><Info label="Client" value={cust?.name ?? "—"} />
        <Info label="Téléphone" value={cust?.phone ?? "—"} /><Info label="Moto / Produit" value={product} />
        <Info label="N° série" value={t.serial} /><Info label="Commande associée" value={order} />
        <Info label="Garantie" value={t.warranty ? "Sous garantie" : "Hors garantie"} /><Info label="Statut" value={status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label>Priorité</Label>
          <Select value={t.priority} onValueChange={(v) => updateTicket(t.id, { priority: v as Ticket["priority"] })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Basse", "Normale", "Haute", "Critique"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Statut</Label>
          <Select value={t.status} onValueChange={(v) => updateTicket(t.id, { status: v as Ticket["status"] })}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["Nouveau", "En analyse", "En traitement", "Résolu"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {!t.escalated && <Button size="sm" onClick={() => { updateTicket(t.id, { escalated: true }); toast.success("Escaladé à SINOPHRA"); }}><ArrowUpRight className="h-4 w-4" /> Escalader à SINOPHRA</Button>}
        {status !== "Fermé" && <Button size="sm" variant="outline" onClick={onClose}><CheckCircle2 className="h-4 w-4" /> Clôturer</Button>}
      </div>

      <div><p className="mb-2 text-sm font-semibold">Timeline</p>
        <ol className="space-y-1.5 border-l pl-4 text-sm">{steps.map((s) => <li key={s.l} className={cn("relative", !s.done && "text-muted-foreground")}><span className={cn("absolute -left-[21px] top-1.5 h-2 w-2 rounded-full", s.done ? "bg-primary" : "bg-muted")} />{s.l}</li>)}</ol></div>

      <div><p className="mb-2 text-sm font-semibold">Conversation</p>
        <div className="space-y-2">{t.messages.map((m, i) => <div key={i} className={cn("rounded-lg px-3 py-2 text-sm", m.from === "Revendeur" ? "ml-8 bg-primary text-primary-foreground" : "mr-8 bg-muted")}><p className="text-[11px] opacity-70">{m.from} · {dateTime(m.date)}</p>{m.text}</div>)}</div>
        <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) { replyTicket(t.id, "Revendeur", reply); setReply(""); } }}>
          <Input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Répondre…" /><Button type="submit" size="icon"><Send className="h-4 w-4" /></Button></form></div>

      <div><p className="mb-2 text-sm font-semibold">Notes internes</p>
        <ul className="mb-2 space-y-1 text-sm text-muted-foreground">{t.notes.map((n, i) => <li key={i}>• {n}</li>)}</ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { updateTicket(t.id, { notes: [...t.notes, note] }); setNote(""); toast.success("Note ajoutée"); } }}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ajouter une note…" /><Button type="submit" size="icon" variant="outline"><Plus className="h-4 w-4" /></Button></form></div>

      <div><p className="mb-2 text-sm font-semibold">Documents associés</p>
        <div className="mb-2 space-y-1">{attached.map((d) => <div key={d} className="flex items-center gap-2 rounded-md border px-2 py-1 text-sm"><Paperclip className="h-3.5 w-3.5" /><span className="flex-1 truncate">{d}</span><Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAttached(attached.filter((x) => x !== d))}><X className="h-3 w-3" /></Button></div>)}</div>
        <div className="flex gap-2">
          <Select value={pick} onValueChange={setPick}><SelectTrigger><SelectValue placeholder="Joindre un document existant" /></SelectTrigger>
            <SelectContent>{docs.map((d) => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" onClick={() => { if (pick && !attached.includes(pick)) setAttached([...attached, pick]); setPick(""); }}>Joindre</Button>
          <Button variant="outline" size="icon" title="Pièce jointe fictive" onClick={() => { setAttached([...attached, `photo-${attached.length + 1}.jpg`]); toast.success("Pièce jointe ajoutée"); }}><Upload className="h-4 w-4" /></Button>
        </div></div>

      <div><p className="mb-2 text-sm font-semibold">Articles FAQ suggérés</p>
        <div className="space-y-1">{suggested.map((f) => <button key={f.q} onClick={() => openFaq(f.q)} className="block w-full rounded-md border px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent">{f.q}</button>)}</div></div>
    </div>
  );
}

function ConversationsPane({ conversations, customers, products, orders, tickets, sendMessage, escalateConversation, links, setLinks, onOpenTicket }: {
  conversations: Scope["conversations"]; customers: Scope["customers"]; products: Store["products"]; orders: Store["orders"]; tickets: Ticket[];
  sendMessage: Store["sendMessage"]; escalateConversation: Store["escalateConversation"]; links: Record<string, string>; setLinks: (f: (l: Record<string, string>) => Record<string, string>) => void; onOpenTicket: (id: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(conversations[0]?.id ?? null);
  const [text, setText] = useState("");
  const [dlg, setDlg] = useState<null | "create" | "link">(null);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<Ticket["type"]>("SAV");
  const [linkId, setLinkId] = useState("");
  const conv = conversations.find((c) => c.id === sel);
  const customer = conv ? customers.find((c) => c.name === conv.customerName) ?? customers[0] : undefined;
  const moto = customer ? products.find((p) => p.id === customer.productId) : undefined;
  const lastOrder = orders.find((o) => o.dealerId === customer?.dealerId);
  const linked = conv ? tickets.find((t) => t.id === links[conv.id]) ?? tickets.find((t) => t.customerId === customer?.id) : undefined;
  const create = (ty: Ticket["type"]) => { if (!conv) return; setSubject(`${conv.topic} — ${conv.customerName}`); setType(ty); setDlg("create"); };

  return (
    <div className="grid h-[calc(100vh-16rem)] min-h-[520px] overflow-hidden rounded-xl border bg-card lg:grid-cols-[300px_1fr_300px]">
      <div className="overflow-y-auto border-r">
        {conversations.map((c) => (
          <button key={c.id} onClick={() => setSel(c.id)} className={cn("block w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent", sel === c.id && "bg-primary/10")}>
            <div className="flex justify-between gap-2"><span className="truncate text-sm font-medium">{c.customerName}</span>{c.unread > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{c.unread}</span>}</div>
            <p className="truncate text-xs text-muted-foreground">{c.topic} · {c.messages.at(-1)?.text}</p>
          </button>
        ))}
      </div>
      <div className="flex min-h-0 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <p className="mr-auto truncate font-medium">{conv ? `${conv.customerName} — ${conv.topic}` : "Sélectionnez une conversation"}</p>
          {conv && <>
            <Button size="sm" variant="outline" onClick={() => create("SAV")}><Wrench className="h-4 w-4" /> Créer SAV</Button>
            <Button size="sm" variant="outline" onClick={() => create("Produit")}><TicketPlus className="h-4 w-4" /> Créer Réclamation</Button>
            <Button size="sm" variant="outline" onClick={() => setDlg("link")}><Link2 className="h-4 w-4" /> Associer</Button>
            <Button size="sm" onClick={() => { escalateConversation(conv.id, `${conv.topic} — ${conv.customerName}`, conv.topic === "Garantie" ? "Garantie" : "SAV"); }}><ArrowUpRight className="h-4 w-4" /> Escalader SINOPHRA</Button>
          </>}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {conv?.messages.map((m, i) => (
            <div key={i} className={cn("max-w-[75%] rounded-xl px-3 py-2 text-sm", m.from === "dealer" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
              <p className="text-[11px] opacity-70">{m.from === "dealer" ? "Vous" : conv.customerName} · {dateTime(m.at)}</p>{m.text}
            </div>
          ))}
        </div>
        <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); if (conv && text.trim()) { sendMessage(conv.id, text); setText(""); } }}>
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
            <Info label="Garantie" value={new Date(customer.warrantyUntil) > new Date() ? `Active jusqu'au ${shortDate(customer.warrantyUntil)}` : "Expirée"} />
            <Info label="Dernière commande" value={lastOrder ? `${lastOrder.id} · ${lastOrder.status}` : "—"} />
            <div><p className="text-xs text-muted-foreground">Dossier SAV lié</p>
              {linked ? <button className="text-left font-medium text-primary hover:underline" onClick={() => onOpenTicket(linked.id)}>{linked.id} · {linked.subject}</button> : <p>—</p>}</div>
          </div>
        ) : <p className="text-sm text-muted-foreground">—</p>}
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          {dlg === "create" ? <>
            <DialogHeader><DialogTitle>Créer un dossier et l'escalader à SINOPHRA</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-2"><Label>Sujet</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              <div className="space-y-2"><Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as Ticket["type"])}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <DialogFooter><Button onClick={() => { if (conv) escalateConversation(conv.id, subject, type); setDlg(null); }}>Créer le dossier</Button></DialogFooter>
          </> : <>
            <DialogHeader><DialogTitle>Associer à un dossier existant</DialogTitle></DialogHeader>
            <Select value={linkId} onValueChange={setLinkId}><SelectTrigger><SelectValue placeholder="Choisir un dossier" /></SelectTrigger>
              <SelectContent>{tickets.map((t) => <SelectItem key={t.id} value={t.id}>{t.id} · {t.subject}</SelectItem>)}</SelectContent></Select>
            <DialogFooter><Button disabled={!linkId} onClick={() => { if (conv) setLinks((l) => ({ ...l, [conv.id]: linkId })); toast.success("Conversation associée au dossier"); setDlg(null); }}>Associer</Button></DialogFooter>
          </>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FaqPane({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Tous");
  const list = FAQ.filter((f) => (cat === "Tous" || f.cat === cat) && (f.q + f.a).toLowerCase().includes(q.toLowerCase()));
  return (
    <SectionCard title="Questions fréquentes">
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…" /></div>
        {["Tous", "SAV", "Garantie", "Réclamation", "Livraison"].map((c) => <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>{c}</Button>)}
      </div>
      <Accordion type="single" collapsible value={value} onValueChange={onChange}>
        {list.map((f) => <AccordionItem key={f.q} value={f.q}><AccordionTrigger><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />{f.q}</span></AccordionTrigger><AccordionContent className="text-muted-foreground">{f.a}</AccordionContent></AccordionItem>)}
      </Accordion>
      {list.length === 0 && <p className="text-sm text-muted-foreground">Aucun résultat.</p>}
    </SectionCard>
  );
}

function DocsPane({ docs, setDocs }: { docs: Doc[]; setDocs: (f: (d: Doc[]) => Doc[]) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cat, setCat] = useState("SAV");
  const [desc, setDesc] = useState("");
  return (
    <SectionCard title="Documents utiles" action={<Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Ajouter document</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b text-left text-xs text-muted-foreground"><tr>{["Document", "Catégorie", "Date", "Taille", "Actions"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{docs.map((d) => (
            <tr key={d.name} className="border-b transition-colors hover:bg-accent/50">
              <td className="px-3 py-2"><span className="inline-flex items-center gap-2 font-medium"><FileText className="h-4 w-4 text-primary" />{d.name}</span></td>
              <td className="px-3 py-2">{d.cat}</td><td className="px-3 py-2">{shortDate(d.date)}</td><td className="px-3 py-2">{d.size}</td>
              <td className="px-3 py-2"><div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.info(`Aperçu de ${d.name}`)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toast.success(`${d.name} téléchargé`)}><Download className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDocs((l) => l.filter((x) => x.name !== d.name)); toast.success("Document supprimé"); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div></td>
            </tr>))}</tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2"><Label>Nom du document</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Catégorie</Label>
              <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["SAV", "Garantie", "Diagnostic", "Réclamation", "Livraison"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
            <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed p-6 text-sm text-muted-foreground"><Upload className="h-5 w-5" />Glissez un fichier ici (simulation)</div>
          </div>
          <DialogFooter><Button disabled={!name.trim()} onClick={() => {
            const n = name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
            setDocs((l) => [{ name: n, cat, date: new Date().toISOString(), size: "150 Ko" }, ...l]);
            toast.success("Document ajouté"); setOpen(false); setName(""); setDesc("");
          }}>Ajouter</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
