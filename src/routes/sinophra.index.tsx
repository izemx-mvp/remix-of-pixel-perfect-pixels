import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bike,
  Boxes,
  ChevronRight,
  Package,
  Ship,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { mad, num } from "@/lib/format";
import { salesSeries } from "@/lib/mock-data";
import { stockStatus, useStore } from "@/lib/store";

export const Route = createFileRoute("/sinophra/")({
  head: () => ({
    meta: [
      { title: "Dashboard direction — SINOPHRA" },
      { name: "description", content: "Vue direction : chiffre d'affaires, stock, réseau revendeurs et alertes IA." },
      { property: "og:title", content: "Dashboard direction — SINOPHRA" },
      { property: "og:description", content: "CA, commandes, stock central, transit, SAV et alertes IA." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { products, dealers, orders, tickets, dealerStock } = useStore();
  const navigate = useNavigate();

  const motos = products.filter((p) => p.kind === "moto");
  const pieces = products.filter((p) => p.kind === "piece");
  const monthRevenue = dealers.reduce((s, d) => s + d.monthRevenue, 0);
  const inTransit = products.reduce((s, p) => s + p.inTransit, 0);
  const ruptures = products.filter((p) => p.centralStock === 0).length;
  const openTickets = tickets.filter((t) => t.status !== "Résolu").length;

  const byCategory = Object.entries(
    motos.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + p.centralStock;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const topModels = [...motos]
    .map((p) => ({
      name: p.name,
      ventes: dealerStock.filter((l) => l.productId === p.id).reduce((s, l) => s + l.sold, 0),
    }))
    .sort((a, b) => b.ventes - a.ventes)
    .slice(0, 6);

  const topDealers = [...dealers]
    .sort((a, b) => b.monthRevenue - a.monthRevenue)
    .slice(0, 6)
    .map((d) => ({ name: d.city, ca: Math.round(d.monthRevenue / 1000) }));

  const stockByStatus = ["Disponible", "Stock faible", "Rupture", "Surstock"].map((s) => ({
    name: s,
    value: products.filter((p) => stockStatus(p.centralStock, p.minThreshold) === s).length,
  }));

  const alerts = [
    { text: "3 modèles risquent une rupture sous 15 jours", to: "/sinophra/stock" },
    { text: "Casablanca Centre affiche une forte rotation du modèle CR50", to: "/sinophra/revendeurs" },
    { text: `${inTransit} unités sont actuellement en transit`, to: "/sinophra/importations" },
    { text: "8 produits ont un stock dormant supérieur à 90 jours", to: "/sinophra/analytics" },
  ] as const;


  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  return (
    <>
      <PageHeader
        title="Dashboard direction"
        subtitle="Vue consolidée du réseau SINOPHRA — septembre 2026"
        actions={<Button variant="outline" onClick={() => navigate({ to: "/sinophra/analytics" })}>Analytics détaillés</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="CA du mois" value={mad(monthRevenue)} hint="+12,4 % vs août" icon={TrendingUp} tone="accent" />
        <KpiCard label="Commandes revendeurs" value={orders.length} hint={`${orders.filter((o) => o.status === "Commande reçue").length} en attente`} icon={ShoppingCart} onClick={() => navigate({ to: "/sinophra/commandes" })} />
        <KpiCard label="Revendeurs actifs" value={dealers.length} hint="6 villes couvertes" icon={Store} onClick={() => navigate({ to: "/sinophra/revendeurs" })} />
        <KpiCard label="Motos en stock" value={num(motos.reduce((s, p) => s + p.centralStock, 0))} icon={Bike} onClick={() => navigate({ to: "/sinophra/stock" })} />
        <KpiCard label="Pièces en stock" value={num(pieces.reduce((s, p) => s + p.centralStock, 0))} icon={Package} onClick={() => navigate({ to: "/sinophra/pieces" })} />
        <KpiCard label="Stock en transit" value={num(inTransit)} icon={Ship} tone="warning" onClick={() => navigate({ to: "/sinophra/importations" })} />
        <KpiCard label="Produits en rupture" value={ruptures} icon={Boxes} tone="danger" onClick={() => navigate({ to: "/sinophra/stock" })} />
        <KpiCard label="SAV ouverts" value={openTickets} icon={Wrench} tone="warning" onClick={() => navigate({ to: "/sinophra/sav" })} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Évolution des ventes" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={salesSeries}>
              <defs>
                <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip formatter={(v: number) => mad(v)} />
              <Area type="monotone" dataKey="ca" stroke="var(--chart-1)" fill="url(#ca)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Alertes IA" action={<Sparkles className="h-4 w-4 text-primary" />}>
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.text}>
                <button
                  onClick={() => navigate({ to: a.to })}
                  className="flex w-full items-start gap-2 rounded-md border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">{a.text}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Ventes par modèle">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topModels} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="ventes" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top revendeurs (kMAD)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topDealers}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="ca" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Stock motos par catégorie">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {byCategory.map((c, i) => (
              <span key={c.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {c.name}
              </span>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Stock par statut">
        <div className="grid gap-3 sm:grid-cols-4">
          {stockByStatus.map((s) => (
            <div key={s.name} className="rounded-lg border p-4">
              <StatusBadge status={s.name} />
              <p className="mt-3 text-2xl font-semibold">{s.value}</p>
              <p className="text-xs text-muted-foreground">références</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
