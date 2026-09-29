import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Boxes, MessageSquareWarning, Package, RefreshCw, ShoppingBag, Sparkles, TrendingDown, TrendingUp, UserPlus, Wallet, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiBadge, PageHeader, SectionCard, StatusBadge } from "@/components/ui-kit";
import { dealerMetrics } from "@/lib/ai";
import { mad } from "@/lib/format";
import { stockStatus, useDealerScope, useStore } from "@/lib/store";

export const Route = createFileRoute("/revendeur/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Performance — MOTOPARK" },
      { name: "description", content: "Ventes, chiffre d'affaires, stock, clients et réclamations du point de vente." },
      { property: "og:title", content: "Analytics & Performance — MOTOPARK" },
      { property: "og:description", content: "Indicateurs de performance revendeur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DealerAnalytics,
});

const PERIODS = [
  { id: "d", label: "Aujourd'hui", f: 1 / 30, pts: ["8h", "10h", "12h", "14h", "16h", "18h"] },
  { id: "7", label: "7 jours", f: 7 / 30, pts: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] },
  { id: "30", label: "30 jours", f: 1, pts: ["S1", "S2", "S3", "S4"] },
  { id: "90", label: "3 mois", f: 3, pts: ["Juil", "Août", "Sept"] },
  { id: "y", label: "Cette année", f: 9, pts: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sept"] },
] as const;
const COLORS = ["var(--primary)", "var(--chart-2, #f59e0b)", "var(--chart-3, #10b981)", "var(--chart-4, #64748b)", "var(--chart-5, #8b5cf6)"];
const tip = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 };
const wave = (i: number, seed: number) => 0.75 + ((Math.sin(i * 1.7 + seed) + 1) / 2) * 0.5;

function Kpi({ label, value, delta, icon: Icon }: { label: string; value: string; delta: number; icon: React.ComponentType<{ className?: string }> }) {
  const up = delta >= 0;
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{label}</span><Icon className="h-4 w-4 text-primary" /></div>
      <p key={value} className="mt-2 animate-in fade-in text-xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-1 flex items-center gap-1 text-xs ${up ? "text-emerald-500" : "text-destructive"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {up ? "+" : ""}{delta.toFixed(1)} % <span className="text-muted-foreground">vs période préc.</span>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
}

function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={tip} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-3 text-xs">{data.map((d, i) => <span key={d.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}</span>)}</div>
    </div>
  );
}

function DealerAnalytics() {
  const store = useStore();
  const { dealer, stock, orders, customers, tickets } = useDealerScope();
  const m = dealerMetrics(dealer, store);
  const [period, setPeriod] = useState<string>("30");
  const [cat, setCat] = useState("all");
  const [prod, setProd] = useState("all");
  const P = PERIODS.find((p) => p.id === period)!;

  const rows = useMemo(() => stock.map((l) => ({ l, p: store.products.find((x) => x.id === l.productId)! })).filter((r) => r.p), [stock, store.products]);
  const cats = [...new Set(rows.map((r) => r.p.category))];
  const filtered = rows.filter((r) => (cat === "all" || r.p.category === cat) && (prod === "all" || r.p.id === prod));
  const share = filtered.length / Math.max(1, rows.length);

  const f = P.f * share;
  const sales = Math.max(1, Math.round(filtered.reduce((s, r) => s + r.l.sold, 0) * P.f));
  const ca = Math.round(dealer.monthRevenue * f);
  const units = filtered.reduce((s, r) => s + r.l.available, 0);
  const newClients = Math.max(0, Math.round(customers.length * 0.15 * P.f));
  const open = tickets.filter((t) => t.status !== "Résolu").length;
  const d = (k: number) => ((m.growth + k * 3.1) % 20) - 3 + P.f;

  const caSeries = P.pts.map((name, i) => ({ name, ca: Math.round((ca / P.pts.length) * wave(i, 1)), ventes: Math.max(0, Math.round((sales / P.pts.length) * wave(i, 2))) }));
  const byModel = [...filtered].sort((a, b) => b.l.sold - a.l.sold).slice(0, 6).map((r) => ({ name: r.p.name, ventes: Math.round(r.l.sold * P.f) || r.l.sold }));
  const kinds = ["Motos", "Pièces", "Accessoires", "SAV / Services"];
  const caSplit = kinds.map((name, i) => ({ name, value: Math.round(ca * [0.62, 0.2, 0.11, 0.07][i]!) }));
  const stState = ["Disponible", "Stock faible", "Rupture", "Surstock"].map((name) => ({ name, value: filtered.filter((r) => stockStatus(r.l.available, r.l.minThreshold) === name).length }));
  const rot = (r: (typeof rows)[number]) => Math.round((r.l.sold / Math.max(1, r.l.available)) * 10) / 10;
  const rotData = [...filtered].sort((a, b) => rot(b) - rot(a)).slice(0, 8).map((r) => ({ name: r.p.name, rotation: rot(r) }));
  const top = [...filtered].sort((a, b) => b.l.sold - a.l.sold).slice(0, 5);
  const watch = filtered.filter((r) => stockStatus(r.l.available, r.l.minThreshold) !== "Disponible").slice(0, 6);
  const orderStatus = ["Commande reçue", "Validée", "Préparation", "Expédiée", "Livrée"].map((s) => ({ name: s === "Commande reçue" ? "En attente" : s, value: orders.filter((o) => o.status === s).length }));
  const orderVal = orders.length ? orders.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.qty * l.unitPrice, 0), 0) / orders.length : 0;
  const ticketTypes = ["SAV", "Garantie", "Livraison", "Produit", "Autre"].map((name, i) => ({ name, value: tickets.filter((t) => String(t.type).toLowerCase().includes(name.toLowerCase())).length || (i + open) % 4 }));
  const clientsMonthly = ["Avr", "Mai", "Juin", "Juil", "Août", "Sept"].map((name, i) => ({ name, clients: Math.round(3 + wave(i, 3) * 5) }));
  const best = top[0];
  const totalSold = Math.max(1, filtered.reduce((s, r) => s + r.l.sold, 0));

  const insights = [
    best && `Le modèle ${best.p.name} représente ${Math.round((best.l.sold / totalSold) * 100)} % de vos ventes sur la période.`,
    top[1] && `Les ventes du modèle ${top[1].p.name} progressent de ${Math.abs(d(2)).toFixed(0)} %.`,
    ...m.insights.slice(1, 2),
    "Les accessoires affichent la meilleure marge moyenne.",
    `Votre chiffre d'affaires est ${d(0) >= 0 ? "en hausse" : "en baisse"} de ${Math.abs(d(0)).toFixed(0)} % par rapport à la période précédente.`,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title="Analytics & Performance" subtitle="Suivez les performances commerciales, les ventes et l'évolution de votre stock." />

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border p-1">
          {PERIODS.map((p) => <Button key={p.id} size="sm" variant={period === p.id ? "default" : "ghost"} className="h-7" onClick={() => setPeriod(p.id)}>{p.label}</Button>)}
        </div>
        <Select value={cat} onValueChange={(v) => { setCat(v); setProd("all"); }}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Toutes catégories</SelectItem>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={prod} onValueChange={setProd}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Produit" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tous produits</SelectItem>{rows.filter((r) => cat === "all" || r.p.category === cat).map((r) => <SelectItem key={r.p.id} value={r.p.id}>{r.p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Chiffre d'affaires" value={mad(ca)} delta={d(0)} icon={Wallet} />
        <Kpi label="Nombre de ventes" value={String(sales)} delta={d(1)} icon={ShoppingBag} />
        <Kpi label="Panier moyen" value={mad(Math.round(ca / sales))} delta={d(2)} icon={Package} />
        <Kpi label="Marge estimée" value={`${m.margin} %`} delta={d(3) / 3} icon={Percent} />
        <Kpi label="Stock disponible" value={`${units} u.`} delta={-d(4) / 2} icon={Boxes} />
        <Kpi label="Rotation moyenne" value={String(m.rotation)} delta={d(5) / 2} icon={RefreshCw} />
        <Kpi label="Nouveaux clients" value={String(newClients)} delta={d(6)} icon={UserPlus} />
        <Kpi label="Réclamations ouvertes" value={String(open)} delta={-d(7) / 2} icon={MessageSquareWarning} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Évolution du chiffre d'affaires">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={caSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tip} formatter={(v) => mad(Number(v))} /><Line type="monotone" dataKey="ca" name="CA" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
          </LineChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Évolution des ventes">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={caSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="ventes" name="Ventes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Ventes par modèle">
          <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={byModel} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} /><YAxis type="category" dataKey="name" width={90} stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="ventes" fill="var(--primary)" radius={[0, 4, 4, 0]} />
          </BarChart></ResponsiveContainer></div>
        </SectionCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <SectionCard title="Répartition du CA"><Donut data={caSplit} /></SectionCard>
          <SectionCard title="État du stock"><Donut data={stState} /></SectionCard>
        </div>
      </div>

      <SectionCard title="Rotation du stock">
        <div className="h-60"><ResponsiveContainer width="100%" height="100%"><BarChart data={rotData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="rotation" radius={[4, 4, 0, 0]}>{rotData.map((r, i) => <Cell key={i} fill={r.rotation >= 2 ? "var(--primary)" : r.rotation >= 0.8 ? COLORS[1] : COLORS[3]} />)}</Bar>
        </BarChart></ResponsiveContainer></div>
        <p className="mt-2 text-xs text-muted-foreground">Rouge : rotation élevée · Orange : moyenne · Gris : faible</p>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Top produits">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="text-left"><th className="py-2">Produit</th><th>Ventes</th><th>CA</th><th>Stock</th><th>Rotation</th></tr></thead>
            <tbody>{top.map((r) => <tr key={r.p.id} className="border-t transition-colors hover:bg-muted/40"><td className="py-2 font-medium">{r.p.name}</td><td>{r.l.sold}</td><td>{mad(r.l.sold * r.p.pricePublic)}</td><td>{r.l.available}</td><td>{rot(r)}</td></tr>)}</tbody>
          </table>
        </SectionCard>
        <SectionCard title="Produits à surveiller" action={<AlertTriangle className="h-4 w-4 text-primary" />}>
          <div className="space-y-2">
            {watch.map((r) => <div key={r.p.id} className="flex items-center justify-between rounded-md border px-3 py-2 transition-colors hover:bg-muted/40"><div><p className="text-sm font-medium">{r.p.name}</p><p className="text-xs text-muted-foreground">Stock : {r.l.available}</p></div><StatusBadge status={stockStatus(r.l.available, r.l.minThreshold)} /></div>)}
            {watch.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun produit à surveiller.</p>}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Clients">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Clients actifs" value={customers.length} /><Stat label="Nouveaux clients" value={newClients} />
            <Stat label="Clients récurrents" value={Math.round(customers.length * 0.38)} /><Stat label="Taux de retour" value={`${(2 + (m.claims % 4)).toFixed(1)} %`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Nouveaux clients par mois</p>
          <div className="h-32"><ResponsiveContainer width="100%" height="100%"><BarChart data={clientsMonthly}><XAxis dataKey="name" fontSize={10} stroke="var(--muted-foreground)" /><Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="clients" fill="var(--primary)" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </SectionCard>
        <SectionCard title="Commandes">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Reçues" value={orders.length} /><Stat label="En cours" value={orders.filter((o) => !["Livrée", "Commande reçue"].includes(o.status)).length} />
            <Stat label="Livrées" value={orders.filter((o) => o.status === "Livrée").length} /><Stat label="Valeur moyenne" value={mad(Math.round(orderVal))} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Commandes par statut</p>
          <Donut data={orderStatus} />
        </SectionCard>
        <SectionCard title="Réclamations">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Ouvertes" value={open} /><Stat label="Résolues" value={tickets.length - open} /><Stat label="Délai moyen" value={`${3 + (open % 4)} j`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Réclamations par type</p>
          <div className="h-44"><ResponsiveContainer width="100%" height="100%"><BarChart data={ticketTypes}><XAxis dataKey="name" fontSize={10} stroke="var(--muted-foreground)" /><YAxis fontSize={10} stroke="var(--muted-foreground)" allowDecimals={false} /><Tooltip contentStyle={tip} cursor={{ fill: "var(--muted)" }} /><Bar dataKey="value" name="Tickets" fill={COLORS[1]} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </SectionCard>
      </div>

      <SectionCard title="Insights IA" action={<AiBadge />}>
        <ul className="grid gap-2 md:grid-cols-2">
          {insights.map((t) => <li key={t} className="flex gap-2 rounded-md border bg-primary/5 p-3 text-sm transition-colors hover:bg-primary/10"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t}</li>)}
        </ul>
      </SectionCard>
    </>
  );
}
