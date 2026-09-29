import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiNote, DataTable, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { ProductThumb } from "@/components/Catalogue";
import { mad, num } from "@/lib/format";
import { useDealerScope, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/revendeur/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue & Stock — MOTOPARK" },
      { name: "description", content: "Stock local, disponibilité SINOPHRA et commandes de réapprovisionnement." },
      { property: "og:title", content: "Catalogue & Stock — MOTOPARK" },
      { property: "og:description", content: "Catalogue Motopark et stock du point de vente." },
    ],
  }),
  component: DealerCatalogue,
});

type Row = Product & { local: number; min: number; sold: number };

function DealerCatalogue() {
  const { products, createOrder } = useStore();
  const { stock, dealerId } = useDealerScope();
  const [order, setOrder] = useState<Row | null>(null);
  const [qty, setQty] = useState(1);

  const rows = (kind: "moto" | "piece"): Row[] =>
    products.filter((p) => p.kind === kind).map((p) => {
      const l = stock.find((x) => x.productId === p.id);
      return { ...p, local: l?.available ?? 0, min: l?.minThreshold ?? (kind === "moto" ? 4 : 15), sold: l?.sold ?? 0 };
    });
  const status = (r: Row) => (r.local === 0 ? "Rupture" : r.local <= r.min ? "Stock faible" : "Disponible");
  const low = [...rows("moto"), ...rows("piece")].filter((r) => r.local <= r.min);

  const columns: Column<Row>[] = [
    { key: "p", header: "Modèle", render: (r) => <div className="flex items-center gap-3"><ProductThumb product={r} /><div><p className="font-medium">{r.name}</p><p className="text-xs text-muted-foreground">{r.category}</p></div></div>, sortValue: (r) => r.name },
    { key: "l", header: "Stock local", render: (r) => <span className="font-semibold">{r.local}</span>, sortValue: (r) => r.local },
    { key: "m", header: "Seuil", render: (r) => r.min },
    { key: "s", header: "Dispo SINOPHRA", render: (r) => (r.centralStock > 0 ? `${num(r.centralStock)} u.` : "Sur commande"), sortValue: (r) => r.centralStock },
    { key: "pr", header: "Prix", render: (r) => mad(r.pricePublic), sortValue: (r) => r.pricePublic },
    { key: "v", header: "Ventes", render: (r) => r.sold, sortValue: (r) => r.sold },
    { key: "rot", header: "Rotation", render: (r) => `${Math.round((r.sold / Math.max(1, r.local)) * 10) / 10}×`, sortValue: (r) => r.sold / Math.max(1, r.local) },
    { key: "st", header: "Statut", render: (r) => <div className="space-y-1"><StatusBadge status={status(r)} />{r.local <= r.min && <p className="flex items-center gap-1 text-[11px] text-warning"><Sparkles className="h-3 w-3" /> Réapprovisionnement recommandé</p>}</div> },
    { key: "a", header: "", render: (r) => <Button size="sm" variant={r.local <= r.min ? "default" : "outline"} className="h-7" onClick={(e) => { e.stopPropagation(); setOrder(r); setQty(Math.max(1, r.min * 2 - r.local)); }}><ShoppingCart className="h-3 w-3" /> Commander à SINOPHRA</Button> },
  ];

  return (
    <>
      <PageHeader title="Catalogue & Stock" subtitle="Votre stock local et la disponibilité chez SINOPHRA." />
      {low.length > 0 && <AiNote tone="warning">{low.length} références sous le seuil. Priorité : {low.slice(0, 3).map((r) => `${r.name} (${r.local})`).join(", ")}.</AiNote>}
      <Tabs defaultValue="moto">
        <TabsList><TabsTrigger value="moto">Motos</TabsTrigger><TabsTrigger value="piece">Matériel & Pièces</TabsTrigger></TabsList>
        {(["moto", "piece"] as const).map((k) => (
          <TabsContent key={k} value={k} className="pt-4">
            <DataTable rows={rows(k)} columns={columns} searchText={(r) => `${r.name} ${r.category}`} exportName={`stock-${k}`} />
          </TabsContent>
        ))}
      </Tabs>
      <Dialog open={!!order} onOpenChange={(o) => !o && setOrder(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Commander {order?.name} à SINOPHRA</DialogTitle></DialogHeader>
          <div className="space-y-2"><Label>Quantité</Label><Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} /></div>
          {order && <p className="text-sm text-muted-foreground">Montant estimé : {mad(order.priceDealer * qty)}</p>}
          <DialogFooter>
            <Button onClick={() => { if (order) createOrder(dealerId, [{ productId: order.id, qty, unitPrice: order.priceDealer }]); setOrder(null); }}>Envoyer la commande</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
