import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Boxes, Percent, ShoppingCart, Store, TrendingUp } from "lucide-react";
import { AiBadge, DataTable, KpiCard, PageHeader, Pill, ScoreBar, StatusBadge, type Column } from "@/components/ui-kit";
import { dealerMetrics } from "@/lib/ai";
import { mad, num } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Dealer } from "@/lib/types";

export const Route = createFileRoute("/sinophra/revendeurs/")({
  head: () => ({
    meta: [
      { title: "Réseau revendeurs — SINOPHRA" },
      { name: "description", content: "Vue stratégique du réseau Motopark : CA, marge, rotation, rentabilité et score IA." },
      { property: "og:title", content: "Réseau revendeurs — SINOPHRA" },
      { property: "og:description", content: "Rentabilité et besoins en stock de chaque revendeur, analysés par l'IA." },
    ],
  }),
  component: DealersPage,
});

const BADGE_TONE: Record<string, "accent" | "success" | "info" | "warning" | "danger"> = {
  Leader: "accent",
  "Très rentable": "success",
  "En progression": "info",
  "Stock faible": "warning",
  "À surveiller": "danger",
};

function DealersPage() {
  const store = useStore();
  const { dealers, orders, tickets } = store;
  const navigate = useNavigate();
  const m = Object.fromEntries(dealers.map((d) => [d.id, dealerMetrics(d, store)]));
  const get = (d: Dealer) => m[d.id]!;
  const thisMonth = orders.filter((o) => Date.now() - new Date(o.date).getTime() < 30 * 864e5).length;
  const by = (fn: (d: Dealer) => number) => [...dealers].sort((a, b) => fn(b) - fn(a))[0]!;

  const analysis = [
    ["Revendeur le plus rentable", by((d) => get(d).margin * d.monthRevenue), (d: Dealer) => `Marge ${get(d).margin} % · ${mad(d.monthRevenue)}`],
    ["Plus forte progression", by((d) => get(d).growth), (d: Dealer) => `+${get(d).growth} % sur 3 mois`],
    ["Plus forte rotation stock", by((d) => get(d).rotation), (d: Dealer) => `Rotation ${get(d).rotation}`],
    ["Réapprovisionnement nécessaire", by((d) => get(d).low.length), (d: Dealer) => get(d).topLow ? `${get(d).topLow!.product.name} : ${get(d).topLow!.line.available} en stock` : "—"],
    ["Faible performance", by((d) => -get(d).score), (d: Dealer) => `Score IA ${get(d).score}/100`],
    ["Hausse de réclamations", by((d) => get(d).claims), (d: Dealer) => `${get(d).claims} réclamations ouvertes`],
  ] as const;

  const columns: Column<Dealer>[] = [
    {
      key: "name",
      header: "Revendeur",
      render: (d) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{d.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {get(d).badges.map((b) => <Pill key={b} tone={BADGE_TONE[b] ?? "neutral"}>{b === "Stock faible" && get(d).topLow ? `Stock ${get(d).topLow!.product.name} faible` : b}</Pill>)}
          </div>
        </div>
      ),
      sortValue: (d) => d.name,
    },
    { key: "city", header: "Ville", render: (d) => d.city, sortValue: (d) => d.city },
    { key: "ca", header: "CA", render: (d) => mad(d.monthRevenue), sortValue: (d) => d.monthRevenue },
    { key: "margin", header: "Marge est.", render: (d) => `${get(d).margin} %`, sortValue: (d) => get(d).margin },
    { key: "orders", header: "Cmd", render: (d) => get(d).orders, sortValue: (d) => get(d).orders },
    { key: "stock", header: "Stock", render: (d) => num(get(d).units), sortValue: (d) => get(d).units },
    { key: "rot", header: "Rotation", render: (d) => get(d).rotation, sortValue: (d) => get(d).rotation },
    { key: "prof", header: "Rentabilité", render: (d) => <Pill tone={get(d).profitability === "Élevée" ? "success" : get(d).profitability === "Moyenne" ? "info" : "warning"}>{get(d).profitability}</Pill> },
    { key: "claims", header: "Réclam.", render: (d) => get(d).claims, sortValue: (d) => get(d).claims },
    { key: "score", header: "Score IA", render: (d) => <ScoreBar value={get(d).score} />, sortValue: (d) => get(d).score },
    { key: "status", header: "Statut", render: (d) => <StatusBadge status={d.status} /> },
  ];

  return (
    <>
      <PageHeader title="Revendeurs" subtitle="Vue stratégique du réseau Motopark." />
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Revendeurs actifs" value={dealers.filter((d) => d.status === "Actif").length} icon={Store} />
        <KpiCard label="CA réseau" value={mad(dealers.reduce((s, d) => s + d.monthRevenue, 0))} icon={TrendingUp} tone="accent" />
        <KpiCard label="Commandes du mois" value={thisMonth} icon={ShoppingCart} />
        <KpiCard label="Stock réseau" value={num(dealers.reduce((s, d) => s + get(d).units, 0))} icon={Boxes} />
        <KpiCard label="Marge moyenne" value={`${Math.round(dealers.reduce((s, d) => s + get(d).margin, 0) / dealers.length)} %`} icon={Percent} tone="success" />
        <KpiCard label="Réclamations ouvertes" value={tickets.filter((t) => t.status !== "Résolu").length} icon={AlertTriangle} tone="warning" />
      </div>

      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">Analyse IA du réseau <AiBadge /></p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {analysis.map(([label, d, detail]) => (
            <button
              key={label}
              onClick={() => navigate({ to: "/sinophra/revendeurs/$id", params: { id: d.id } })}
              className="rounded-lg border bg-card/60 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="truncate font-semibold">{d.name}</p>
              <p className="text-xs text-primary">{detail(d)}</p>
            </button>
          ))}
        </div>
      </div>

      <DataTable
        rows={dealers}
        columns={columns}
        searchText={(d) => `${d.name} ${d.city}`}
        onRowClick={(d) => navigate({ to: "/sinophra/revendeurs/$id", params: { id: d.id } })}
        exportName="revendeurs"
      />
    </>
  );
}
