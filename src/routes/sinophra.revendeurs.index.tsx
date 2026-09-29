import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Boxes, ShoppingCart, Store, TrendingUp } from "lucide-react";
import { DataTable, KpiCard, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { mad, num } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Dealer } from "@/lib/types";

export const Route = createFileRoute("/sinophra/revendeurs/")({
  head: () => ({
    meta: [
      { title: "Réseau revendeurs — SINOPHRA" },
      { name: "description", content: "Vue consolidée du réseau Motopark : stock, commandes, ventes et SAV." },
      { property: "og:title", content: "Réseau revendeurs — SINOPHRA" },
      { property: "og:description", content: "Performance et stock de chaque revendeur du réseau." },
    ],
  }),
  component: DealersPage,
});

function DealersPage() {
  const { dealers, dealerStock, orders, tickets } = useStore();
  const navigate = useNavigate();

  const stockOf = (id: string) => dealerStock.filter((l) => l.dealerId === id).reduce((s, l) => s + l.available, 0);
  const soldOf = (id: string) => dealerStock.filter((l) => l.dealerId === id).reduce((s, l) => s + l.sold, 0);
  const ordersOf = (id: string) => orders.filter((o) => o.dealerId === id).length;
  const savOf = (id: string) => tickets.filter((t) => t.dealerId === id && t.status !== "Résolu").length;

  const columns: Column<Dealer>[] = [
    { key: "name", header: "Revendeur", render: (d) => <span className="font-medium">{d.name}</span>, sortValue: (d) => d.name },
    { key: "city", header: "Ville", render: (d) => d.city, sortValue: (d) => d.city },
    { key: "manager", header: "Responsable", render: (d) => d.manager },
    { key: "phone", header: "Téléphone", render: (d) => d.phone },
    { key: "stock", header: "Stock", render: (d) => num(stockOf(d.id)), sortValue: (d) => stockOf(d.id) },
    { key: "orders", header: "Commandes", render: (d) => ordersOf(d.id), sortValue: (d) => ordersOf(d.id) },
    { key: "sales", header: "Ventes", render: (d) => num(soldOf(d.id)), sortValue: (d) => soldOf(d.id) },
    { key: "ca", header: "CA du mois", render: (d) => mad(d.monthRevenue), sortValue: (d) => d.monthRevenue },
    { key: "sav", header: "SAV ouverts", render: (d) => savOf(d.id), sortValue: (d) => savOf(d.id) },
    { key: "status", header: "Statut", render: (d) => <StatusBadge status={d.status} /> },
  ];

  return (
    <>
      <PageHeader title="Réseau revendeurs" subtitle="Performance, stock et activité de chaque point de vente." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revendeurs actifs" value={dealers.length} icon={Store} tone="accent" />
        <KpiCard label="CA réseau" value={mad(dealers.reduce((s, d) => s + d.monthRevenue, 0))} icon={TrendingUp} />
        <KpiCard label="Stock réseau" value={num(dealerStock.reduce((s, l) => s + l.available, 0))} icon={Boxes} />
        <KpiCard
          label="Commandes en attente"
          value={orders.filter((o) => o.status === "Commande reçue").length}
          icon={ShoppingCart}
          tone="warning"
        />
      </div>

      <DataTable
        rows={dealers}
        columns={columns}
        searchText={(d) => `${d.name} ${d.city} ${d.manager}`}
        onRowClick={(d) => navigate({ to: "/sinophra/revendeurs/$id", params: { id: d.id } })}
        exportName="revendeurs"
      />
    </>
  );
}
