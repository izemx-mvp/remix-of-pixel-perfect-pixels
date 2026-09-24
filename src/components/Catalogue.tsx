import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, StatusBadge, type Column } from "@/components/ui-kit";
import { mad, num, shortDate } from "@/lib/format";
import { stockStatus, useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { TransferDialog } from "@/components/TransferDialog";

export function ProductThumb({ product, size = 40 }: { product: Product; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md text-[10px] font-bold text-white"
      style={{ background: product.color, width: size, height: size }}
    >
      {product.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Catalogue({ kind }: { kind: "moto" | "piece" }) {
  const { products, dealerStock, dealers, moves } = useStore();
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);

  const list = products.filter((p) => p.kind === kind);
  const brands = [...new Set(list.map((p) => p.brand))];
  const categories = [...new Set(list.map((p) => p.category))];

  const rows = useMemo(
    () =>
      list.filter((p) => {
        if (brand !== "all" && p.brand !== brand) return false;
        if (category !== "all" && p.category !== category) return false;
        const st = stockStatus(p.centralStock, p.minThreshold);
        if (availability === "dispo" && st !== "Disponible" && st !== "Surstock") return false;
        if (availability === "faible" && st !== "Stock faible") return false;
        if (availability === "rupture" && st !== "Rupture") return false;
        return true;
      }),
    [list, brand, category, availability],
  );

  const networkStock = (id: string) =>
    dealerStock.filter((l) => l.productId === id).reduce((s, l) => s + l.available, 0);

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Produit",
      render: (p) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductThumb product={p} />
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {p.ref} · {p.brand}
            </p>
          </div>
        </div>
      ),
      sortValue: (p) => p.name,
    },
    { key: "category", header: "Catégorie", render: (p) => p.category, sortValue: (p) => p.category },
    ...(kind === "moto"
      ? [{ key: "cc", header: "Cylindrée", render: (p: Product) => (p.cc ? `${p.cc} cc` : "Électrique"), sortValue: (p: Product) => p.cc ?? 0 }]
      : []),
    { key: "price", header: "Prix revendeur", render: (p) => mad(p.priceDealer), sortValue: (p) => p.priceDealer },
    { key: "central", header: "Stock central", render: (p) => num(p.centralStock), sortValue: (p) => p.centralStock },
    { key: "network", header: "Stock réseau", render: (p) => num(networkStock(p.id)), sortValue: (p) => networkStock(p.id) },
    {
      key: "status",
      header: "Statut",
      render: (p) => <StatusBadge status={stockStatus(p.centralStock, p.minThreshold)} />,
    },
  ];

  const detailMoves = selected ? moves.filter((m) => m.productId === selected.id).slice(0, 8) : [];

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        searchText={(p) => `${p.name} ${p.ref} ${p.brand} ${p.category}`}
        onRowClick={setSelected}
        exportName={kind === "moto" ? "catalogue-motos" : "catalogue-pieces"}
        filters={
          <>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Marque" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes marques</SelectItem>
                {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={availability} onValueChange={setAvailability}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Disponibilité" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute disponibilité</SelectItem>
                <SelectItem value="dispo">Disponible</SelectItem>
                <SelectItem value="faible">Stock faible</SelectItem>
                <SelectItem value="rupture">Rupture</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <ProductThumb product={selected} size={44} />
                  <span className="min-w-0 truncate">{selected.name}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-8">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={stockStatus(selected.centralStock, selected.minThreshold)} />
                  <TransferDialog product={selected} />
                  <Button variant="outline" size="sm" onClick={() => toast.success("Fiche produit enregistrée (simulation)")}>
                    Modifier
                  </Button>
                </div>

                <Tabs defaultValue="infos">
                  <TabsList>
                    <TabsTrigger value="infos">Informations</TabsTrigger>
                    <TabsTrigger value="stock">Stock réseau</TabsTrigger>
                    <TabsTrigger value="moves">Mouvements</TabsTrigger>
                  </TabsList>

                  <TabsContent value="infos" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Info label="Référence" value={selected.ref} />
                      <Info label="Marque" value={selected.brand} />
                      <Info label="Catégorie" value={selected.category} />
                      <Info label="Prix revendeur" value={mad(selected.priceDealer)} />
                      <Info label="Prix public conseillé" value={mad(selected.pricePublic)} />
                      <Info label="Stock central" value={num(selected.centralStock)} />
                      <Info label="En transit" value={num(selected.inTransit)} />
                      <Info label="Réservé" value={num(selected.reserved)} />
                      <Info label="Dernière entrée" value={shortDate(selected.lastIn)} />
                      <Info label="Dernière sortie" value={shortDate(selected.lastOut)} />
                    </div>
                    <div className="rounded-lg border p-4">
                      <p className="mb-2 text-sm font-medium">Caractéristiques</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {selected.specs.map((s) => (
                          <li key={s.label} className="flex justify-between gap-4">
                            <span>{s.label}</span>
                            <span className="text-foreground">{s.value}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="stock" className="space-y-2 pt-4">
                    {dealers.map((d) => {
                      const line = dealerStock.find((l) => l.dealerId === d.id && l.productId === selected.id);
                      return (
                        <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="truncate">{d.name}</span>
                          <span className="font-medium">{line?.available ?? 0}</span>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="moves" className="space-y-2 pt-4">
                    {detailMoves.length === 0 && <p className="text-sm text-muted-foreground">Aucun mouvement récent.</p>}
                    {detailMoves.map((m) => (
                      <div key={m.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="font-medium">{m.type}</span>
                          <span className="text-muted-foreground">{shortDate(m.date)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {m.from} → {m.to} · {m.qty} unité(s)
                        </p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
