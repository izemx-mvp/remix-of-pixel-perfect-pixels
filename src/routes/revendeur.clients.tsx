import { createFileRoute } from "@tanstack/react-router";
import { DataTable, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { shortDate } from "@/lib/format";
import { useDealerScope, useStore } from "@/lib/store";
import type { Customer } from "@/lib/types";

export const Route = createFileRoute("/revendeur/clients")({
  head: () => ({
    meta: [
      { title: "Mes clients — MOTOPARK" },
      { name: "description", content: "Clients finaux, motos vendues et garanties." },
      { property: "og:title", content: "Mes clients — MOTOPARK" },
      { property: "og:description", content: "Base clients du revendeur Motopark." },
    ],
  }),
  component: Clients,
});

function Clients() {
  const { products } = useStore();
  const { customers } = useDealerScope();
  const columns: Column<Customer>[] = [
    { key: "n", header: "Client", render: (c) => <span className="font-medium">{c.name}</span>, sortValue: (c) => c.name },
    { key: "p", header: "Téléphone", render: (c) => c.phone },
    { key: "v", header: "Ville", render: (c) => c.city },
    { key: "m", header: "Moto", render: (c) => products.find((p) => p.id === c.productId)?.name ?? "—" },
    { key: "s", header: "N° série", render: (c) => <span className="font-mono text-xs">{c.serial}</span> },
    { key: "a", header: "Achat", render: (c) => shortDate(c.purchaseDate), sortValue: (c) => c.purchaseDate },
    { key: "g", header: "Garantie", render: (c) => <StatusBadge status={new Date(c.warrantyUntil) > new Date() ? "Actif" : "Inactif"} /> },
  ];
  return (
    <>
      <PageHeader title="Mes clients" subtitle="Clients finaux et motos vendues." />
      <DataTable rows={customers} columns={columns} searchText={(c) => `${c.name} ${c.phone} ${c.serial}`} exportName="clients" />
    </>
  );
}
