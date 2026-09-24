import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { ProductThumb } from "@/components/Catalogue";
import { TransferDialog } from "@/components/TransferDialog";
import { num, shortDate } from "@/lib/format";
import { stockStatus, useStore } from "@/lib/store";
import type { Product, StockMove } from "@/lib/types";

export const Route = createFileRoute("/sinophra/stock")({
  head: () => ({
    meta: [
      { title: "Stock central — SINOPHRA" },
      { name: "description", content: "Stock physique, réservé, disponible, transit et mouvements du stock central." },
      { property: "og:title", content: "Stock central — SINOPHRA" },
      { property: "og:description", content: "Suivi du stock central et de tous les mouvements." },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { products, moves, adjustStock } = useStore();
  const [tab, setTab] = useState("stock");

  const columns: Column<Product>[] = [
    {
      key: "p",
      header: "Produit",
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductThumb product={p} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">{p.ref}</p>
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    { key: "cat", header: "Catégorie", render: (p) => p.category, sortValue: (p) => p.category },
    { key: "phys", header: "Physique", render: (p) => num(p.centralStock + p.reserved), sortValue: (p) => p.centralStock },
    { key: "res", header: "Réservé", render: (p) => num(p.reserved) },
    { key: "dispo", header: "Disponible", render: (p) => <span className="font-medium">{num(p.centralStock)}</span>, sortValue: (p) => p.centralStock },
    { key: "transit", header: "En transit", render: (p) => num(p.inTransit) },
    { key: "min", header: "Seuil", render: (p) => p.minThreshold },
    { key: "st", header: "Statut", render: (p) => <StatusBadge status={stockStatus(p.centralStock, p.minThreshold)} /> },
    { key: "in", header: "Dernière entrée", render: (p) => shortDate(p.lastIn), sortValue: (p) => p.lastIn },
    {
      key: "act",
      header: "Actions",
      render: (p) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <TransferDialog product={p} trigger={<Button size="sm" variant="outline">Transférer</Button>} />
          <Button size="sm" variant="ghost" onClick={() => adjustStock(p.id, 5, "Inventaire")}>
            +5
          </Button>
          <Button size="sm" variant="ghost" onClick={() => toast.success(`Alerte créée sur ${p.name}`)}>
            Alerte
          </Button>
        </div>
      ),
    },
  ];

  const moveColumns: Column<StockMove>[] = [
    { key: "date", header: "Date", render: (m) => shortDate(m.date), sortValue: (m) => m.date },
    { key: "type", header: "Type", render: (m) => <StatusBadge status={m.type === "Transfert revendeur" ? "Expédiée" : "Disponible"} className="capitalize" />, },
    { key: "lib", header: "Mouvement", render: (m) => m.type },
    {
      key: "prod",
      header: "Produit",
      render: (m) => products.find((p) => p.id === m.productId)?.name ?? m.productId,
    },
    { key: "qty", header: "Quantité", render: (m) => num(m.qty), sortValue: (m) => m.qty },
    { key: "from", header: "Origine", render: (m) => m.from },
    { key: "to", header: "Destination", render: (m) => m.to },
    { key: "ref", header: "Référence", render: (m) => <span className="text-muted-foreground">{m.ref}</span> },
  ];

  return (
    <>
      <PageHeader title="Stock central" subtitle="Disponibilité, réservations, transit et historique des mouvements." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="moves">Mouvements</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="pt-4">
          <DataTable
            rows={products}
            columns={columns}
            searchText={(p) => `${p.name} ${p.ref} ${p.category}`}
            exportName="stock-central"
            pageSize={12}
          />
        </TabsContent>
        <TabsContent value="moves" className="pt-4">
          <DataTable
            rows={moves}
            columns={moveColumns}
            searchText={(m) => `${m.type} ${m.to} ${m.from} ${m.ref}`}
            exportName="mouvements-stock"
            pageSize={12}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
