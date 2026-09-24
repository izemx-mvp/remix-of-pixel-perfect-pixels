import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, SectionCard } from "@/components/ui-kit";
import { mad } from "@/lib/format";
import { salesSeries } from "@/lib/mock-data";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/sinophra/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics réseau — SINOPHRA" },
      { name: "description", content: "CA réseau, rotation du stock, performance fournisseurs et insights IA." },
      { property: "og:title", content: "Analytics réseau — SINOPHRA" },
      { property: "og:description", content: "Analyse consolidée des ventes, stocks et fournisseurs." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { dealers, dealerStock, products, suppliers, tickets } = useStore();
  const [period, setPeriod] = useState("6m");
  const [city, setCity] = useState("all");

  const cities = [...new Set(dealers.map((d) => d.city))];
  const visibleDealers = city === "all" ? dealers : dealers.filter((d) => d.city === city);

  const byDealer = visibleDealers.map((d) => ({
    name: d.city,
    ca: Math.round(d.monthRevenue / 1000),
  }));

  const motos = products.filter((p) => p.kind === "moto");
  const byModel = motos
    .map((p) => ({
      name: p.name,
      ventes: dealerStock.filter((l) => l.productId === p.id).reduce((s, l) => s + l.sold, 0),
    }))
    .sort((a, b) => b.ventes - a.ventes)
    .slice(0, 8);

  const rotation = motos.slice(0, 8).map((p) => ({
    name: p.name,
    rotation: Math.round(((dealerStock.filter((l) => l.productId === p.id).reduce((s, l) => s + l.sold, 0) + 1) / (p.centralStock + 1)) * 10) / 10,
  }));

  const supplierPerf = suppliers.map((s) => ({ name: s.name.split(" ")[0], delai: s.avgDelay, ponctualite: s.onTimeRate }));

  const savByModel = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => {
      const n = products.find((p) => p.id === t.productId)?.name ?? "Autre";
      acc[n] = (acc[n] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

  const insights = [
    "Le modèle V10 affiche +24 % de ventes sur les 30 derniers jours.",
    "Le revendeur de Tanger pourrait atteindre une rupture du CR50 dans 8 jours.",
    "Les batteries représentent la catégorie de pièces avec la rotation la plus élevée.",
    "Le délai moyen fournisseur s'est amélioré de 6 jours sur le trimestre.",
  ];

  return (
    <>
      <PageHeader
        title="Analytics réseau"
        subtitle="Ventes, stock, fournisseurs et SAV consolidés."
        actions={
          <>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30j">30 jours</SelectItem>
                <SelectItem value="3m">3 mois</SelectItem>
                <SelectItem value="6m">6 mois</SelectItem>
                <SelectItem value="12m">12 mois</SelectItem>
              </SelectContent>
            </Select>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <SectionCard title="Insights IA" action={<Sparkles className="h-4 w-4 text-primary" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((t) => (
            <div key={t} className="flex gap-2 rounded-lg border bg-accent/40 p-3 text-sm">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="CA réseau (kMAD)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesSeries}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip formatter={(v: number) => mad(v)} />
              <Line type="monotone" dataKey="ca" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Ventes par revendeur (kMAD)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDealer}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="ca" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Ventes par modèle">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byModel} layout="vertical" margin={{ left: 30 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={100} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="ventes" fill="var(--chart-3)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Rotation du stock">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={rotation}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} height={60} textAnchor="end" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="rotation" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Performance fournisseurs">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={supplierPerf}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="delai" name="Délai moyen (j)" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ponctualite" name="Ponctualité (%)" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="SAV par modèle">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={savByModel} dataKey="value" nameKey="name" outerRadius={95} label>
                {savByModel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>
    </>
  );
}
