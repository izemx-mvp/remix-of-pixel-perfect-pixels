import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AiNote, KpiCard, PageHeader, SectionCard } from "@/components/ui-kit";
import { dealerMetrics } from "@/lib/ai";
import { mad } from "@/lib/format";
import { useDealerScope, useStore } from "@/lib/store";

export const Route = createFileRoute("/revendeur/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — MOTOPARK" },
      { name: "description", content: "Ventes, rotation et marge du point de vente." },
      { property: "og:title", content: "Analytics — MOTOPARK" },
      { property: "og:description", content: "Indicateurs de performance revendeur." },
    ],
  }),
  component: DealerAnalytics,
});

function DealerAnalytics() {
  const store = useStore();
  const { dealer, stock } = useDealerScope();
  const m = dealerMetrics(dealer, store);
  const top = [...stock].sort((a, b) => b.sold - a.sold).slice(0, 8).map((l) => ({ name: store.products.find((p) => p.id === l.productId)?.name ?? "", ventes: l.sold }));
  return (
    <>
      <PageHeader title="Analytics" subtitle="Performance de votre point de vente." />
      <div className="grid gap-3 sm:grid-cols-4">
        <KpiCard label="CA mensuel" value={mad(dealer.monthRevenue)} tone="accent" />
        <KpiCard label="Marge estimée" value={`${m.margin} %`} tone="success" />
        <KpiCard label="Rotation" value={m.rotation} />
        <KpiCard label="Progression 3 mois" value={`${m.growth >= 0 ? "+" : ""}${m.growth} %`} />
      </div>
      <AiNote>{m.insights.join(" ")}</AiNote>
      <SectionCard title="Meilleures ventes">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="ventes" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </>
  );
}
