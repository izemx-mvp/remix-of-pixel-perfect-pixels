import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { DataTable, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Supplier } from "@/lib/types";

export const Route = createFileRoute("/sinophra/fournisseurs")({
  head: () => ({
    meta: [
      { title: "Fournisseurs — SINOPHRA" },
      { name: "description", content: "Fournisseurs, performances, délais et commandes fournisseurs." },
      { property: "og:title", content: "Fournisseurs — SINOPHRA" },
      { property: "og:description", content: "Suivi des fournisseurs et création de commandes fournisseurs." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { suppliers, products, imports } = useStore();
  const [selected, setSelected] = useState<Supplier | null>(null);

  const columns: Column<Supplier>[] = [
    { key: "name", header: "Fournisseur", render: (s) => <span className="font-medium">{s.name}</span>, sortValue: (s) => s.name },
    { key: "country", header: "Pays", render: (s) => s.country, sortValue: (s) => s.country },
    { key: "contact", header: "Contact", render: (s) => s.contact },
    { key: "cat", header: "Catégories", render: (s) => s.categories.join(", ") },
    { key: "orders", header: "Commandes", render: (s) => num(s.orders), sortValue: (s) => s.orders },
    { key: "amount", header: "Montant", render: (s) => mad(s.amount), sortValue: (s) => s.amount },
    { key: "delay", header: "Délai moyen", render: (s) => `${s.avgDelay} j`, sortValue: (s) => s.avgDelay },
    { key: "status", header: "Statut", render: (s) => <StatusBadge status={s.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Fournisseurs"
        subtitle="Performances, délais et historique des commandes fournisseurs."
        actions={<SupplierOrderDialog />}
      />

      <DataTable
        rows={suppliers}
        columns={columns}
        searchText={(s) => `${s.name} ${s.country} ${s.categories.join(" ")}`}
        onRowClick={setSelected}
        exportName="fournisseurs"
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-10">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Pays" value={selected.country} />
                  <Info label="Contact" value={selected.contact} />
                  <Info label="Email" value={selected.email} />
                  <Info label="Délai moyen" value={`${selected.avgDelay} jours`} />
                  <Info label="Commandes" value={num(selected.orders)} />
                  <Info label="Montant total" value={mad(selected.amount)} />
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-2 text-sm font-medium">Performance livraison</p>
                  <Progress value={selected.onTimeRate} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selected.onTimeRate}% de livraisons dans les délais · {selected.incidents} incident(s)
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Dossiers d'importation</p>
                  {imports.filter((i) => i.supplierId === selected.id).map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-0">
                      <span>{i.id}</span>
                      <span className="text-muted-foreground">{shortDate(i.orderDate)}</span>
                      <StatusBadge status={i.status} />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Produits fournis</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {products
                      .filter((p) => selected.categories.includes(p.category) || p.brand.includes(selected.name.split(" ")[0]!))
                      .slice(0, 8)
                      .map((p) => (
                        <span key={p.id} className="rounded-full border px-2.5 py-1">{p.name}</span>
                      ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function SupplierOrderDialog() {
  const { suppliers, products } = useStore();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]!.id);
  const [productId, setProductId] = useState(products[0]!.id);
  const [qty, setQty] = useState(20);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Créer commande fournisseur</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle commande fournisseur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fournisseur</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Produit</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72">
                {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantité</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={() => {
              setOpen(false);
              toast.success("Commande fournisseur envoyée (simulation)");
            }}
          >
            Envoyer la commande
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
