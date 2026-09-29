import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, LogIn, Send } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiBadge, AiNote, DataTable, KpiCard, PageHeader, Pill, StatusBadge, type Column } from "@/components/ui-kit";
import { Info, ProductThumb } from "@/components/Catalogue";
import { SendStockDialog } from "@/components/OrderDialogs";
import { InvoicesView } from "@/components/InvoicesView";
import { dealerMetrics } from "@/lib/ai";
import { dateTime, mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { DealerStockLine } from "@/lib/types";

export const Route = createFileRoute("/sinophra/revendeurs/$id")({
  head: () => ({
    meta: [
      { title: "Fiche revendeur — SINOPHRA" },
      { name: "description", content: "Stock, commandes, factures, réclamations, conversations et analyse IA d'un revendeur." },
      { property: "og:title", content: "Fiche revendeur — SINOPHRA" },
      { property: "og:description", content: "Vue 360° d'un revendeur du réseau Motopark." },
    ],
  }),
  component: DealerDetail,
});

function DealerDetail() {
  const { id } = Route.useParams();
  const store = useStore();
  const { dealers, dealerStock, products, orders, tickets, conversations, switchToDealer } = store;
  const navigate = useNavigate();
  const [send, setSend] = useState<{ productId?: string; qty?: number } | null>(null);
  const dealer = dealers.find((d) => d.id === id);

  if (!dealer) {
    return (
      <div className="space-y-3">
        <p>Revendeur introuvable.</p>
        <Link to="/sinophra/revendeurs" className="text-sm text-primary underline">Retour au réseau</Link>
      </div>
    );
  }
  const m = dealerMetrics(dealer, store);
  const stock = dealerStock.filter((l) => l.dealerId === id);
  const dOrders = orders.filter((o) => o.dealerId === id);
  const dTickets = tickets.filter((t) => t.dealerId === id);
  const dConvs = conversations.filter((c) => c.dealerId === id);
  const series = Array.from({ length: 6 }, (_, i) => ({
    month: ["Avr", "Mai", "Juin", "Juil", "Août", "Sept"][i],
    ca: Math.round(dealer.monthRevenue * (0.72 + i * 0.055 + ((i * 7) % 3) * 0.02)),
  }));

  const stockCols: Column<DealerStockLine & { id: string }>[] = [
    {
      key: "p",
      header: "Produit",
      render: (l) => {
        const p = products.find((x) => x.id === l.productId)!;
        return <div className="flex items-center gap-2"><ProductThumb product={p} size={28} /><span className="font-medium">{p.name}</span></div>;
      },
    },
    { key: "a", header: "Disponible", render: (l) => <span className={l.available <= l.minThreshold ? "font-semibold text-warning" : ""}>{l.available}</span>, sortValue: (l) => l.available },
    { key: "s", header: "Vendus", render: (l) => l.sold, sortValue: (l) => l.sold },
    { key: "m", header: "Seuil", render: (l) => l.minThreshold },
    { key: "st", header: "Statut", render: (l) => <StatusBadge status={l.available === 0 ? "Rupture" : l.available <= l.minThreshold ? "Stock faible" : "Disponible"} /> },
    {
      key: "act",
      header: "",
      render: (l) => l.available <= l.minThreshold ? (
        <Button size="sm" variant="outline" className="h-7" onClick={(e) => { e.stopPropagation(); setSend({ productId: l.productId, qty: Math.max(4, l.minThreshold * 2 - l.available) }); }}>
          <Send className="h-3 w-3" /> Envoyer
        </Button>
      ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title={dealer.name}
        subtitle={`${dealer.city} · ${dealer.manager} · ${dealer.phone}`}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate({ to: "/sinophra/revendeurs" })}><ArrowLeft className="h-4 w-4" /> Réseau</Button>
            <Button onClick={() => setSend({})}><Send className="h-4 w-4" /> Envoyer du stock</Button>
            <Button variant="outline" onClick={() => { switchToDealer(dealer.id); navigate({ to: "/revendeur" }); }}>
              <LogIn className="h-4 w-4" /> Accéder comme ce revendeur
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap gap-1.5">{m.badges.map((b) => <Pill key={b} tone="accent">{b}</Pill>)}</div>

      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">Analyse du revendeur <AiBadge /></p>
        <div className="grid gap-2 md:grid-cols-3">
          {m.insights.map((t) => <AiNote key={t}>{t}</AiNote>)}
        </div>
        {m.topLow && (
          <Button size="sm" className="mt-3" onClick={() => setSend({ productId: m.topLow!.product.id, qty: Math.max(4, m.topLow!.line.minThreshold * 2 - m.topLow!.line.available) })}>
            <Send className="h-4 w-4" /> Appliquer le transfert recommandé
          </Button>
        )}
      </div>

      <Tabs defaultValue="general">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="general">Vue générale</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="claims">Réclamations & SAV</TabsTrigger>
          <TabsTrigger value="convs">Conversations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="CA mensuel" value={mad(dealer.monthRevenue)} tone="accent" />
            <KpiCard label="Marge estimée" value={`${m.margin} %`} tone="success" />
            <KpiCard label="Stock" value={num(m.units)} hint={`Rotation ${m.rotation}`} />
            <KpiCard label="Score IA" value={`${m.score}/100`} hint={`Rentabilité ${m.profitability}`} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
            <Info label="Responsable" value={dealer.manager} />
            <Info label="Email" value={dealer.email} />
            <Info label="Adresse" value={dealer.address} />
            <Info label="Partenaire depuis" value={shortDate(dealer.since)} />
          </div>
        </TabsContent>

        <TabsContent value="stock" className="pt-4">
          <DataTable rows={stock.map((l) => ({ ...l, id: l.productId }))} columns={stockCols} exportName={`stock-${dealer.id}`} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-2 pt-4">
          {dOrders.map((o) => (
            <div key={o.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">{o.id} <span className="font-normal text-muted-foreground">· {shortDate(o.date)}</span></span>
              <span>{mad(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))}</span>
              <StatusBadge status={o.status} />
            </div>
          ))}
          <Button variant="link" className="px-0" onClick={() => navigate({ to: "/sinophra/commandes" })}>Gérer dans Commandes revendeurs →</Button>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 pt-4">
          <InvoicesView dealerId={dealer.id} />
        </TabsContent>

        <TabsContent value="claims" className="space-y-2 pt-4">
          {dTickets.map((t) => (
            <div key={t.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="min-w-0 truncate"><b>{t.id}</b> · {t.subject}</span>
              <StatusBadge status={t.priority} />
              <StatusBadge status={t.status} />
            </div>
          ))}
          <Button variant="link" className="px-0" onClick={() => navigate({ to: "/sinophra/reclamations" })}>Ouvrir le module Réclamations →</Button>
        </TabsContent>

        <TabsContent value="convs" className="space-y-2 pt-4">
          {dConvs.map((c) => (
            <div key={c.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex justify-between gap-3"><span className="font-medium">{c.customerName}</span><span className="text-xs text-muted-foreground">{dateTime(c.lastAt)}</span></div>
              <p className="text-xs text-muted-foreground">{c.topic} · {c.messages.at(-1)?.text}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="analytics" className="pt-4">
          <div className="h-64 rounded-lg border p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => mad(v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                <Area type="monotone" dataKey="ca" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>

      <SendStockDialog open={!!send} onOpenChange={(o) => !o && setSend(null)} dealerId={dealer.id} {...(send?.productId ? { productId: send.productId } : {})} {...(send?.qty ? { qty: send.qty } : {})} />
    </>
  );
}
