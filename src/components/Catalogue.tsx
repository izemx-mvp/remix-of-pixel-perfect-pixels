import { useMemo, useState } from "react";
import { History, MoreHorizontal, PackagePlus, Ship, SlidersHorizontal, Sparkles, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AiNote, DataTable, StatusBadge, type Column } from "@/components/ui-kit";
import { SupplyWizard } from "@/components/SupplyWizard";
import { SupplierCompare } from "@/components/SupplierCompare";
import { productInsight, rankSuppliers } from "@/lib/ai";
import { mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function ProductThumb({ product, size = 40 }: { product: Product; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-md text-[10px] font-bold text-white shadow-sm"
      style={{ background: product.color, width: size, height: size }}
    >
      {product.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

type WizardState = { product: Product; mode?: "Importation" | "Fournisseur" } | null;

export function Catalogue({ kind }: { kind: "moto" | "piece" }) {
  const { products, dealerStock, dealers, moves, suppliers, ratings, imports, adjustStock } = useStore();
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("infos");
  const [wizard, setWizard] = useState<WizardState>(null);
  const [compare, setCompare] = useState<string[] | null>(null);
  const [adjust, setAdjust] = useState<Product | null>(null);
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState("Inventaire");

  const selected = products.find((p) => p.id === selectedId) ?? null;
  const list = products.filter((p) => p.kind === kind);
  const brands = [...new Set(list.map((p) => p.brand))];
  const categories = [...new Set(list.map((p) => p.category))];
  const ins = (p: Product) => productInsight(p, dealerStock);
  const mainSupplier = (p: Product) => rankSuppliers(p, suppliers, ratings, 40)[0]?.supplier;
  const lastOrder = (p: Product) => imports.find((i) => i.lines.some((l) => l.productId === p.id));

  const rows = useMemo(
    () =>
      list.filter((p) => {
        if (brand !== "all" && p.brand !== brand) return false;
        if (category !== "all" && p.category !== category) return false;
        const st = productInsight(p, dealerStock).status;
        if (availability !== "all" && st !== availability) return false;
        return true;
      }),
    [list, brand, category, availability, dealerStock],
  );

  const openHistory = (p: Product) => {
    setSelectedId(p.id);
    setTab("moves");
  };

  const actions = (p: Product) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => setWizard({ product: p })}><PackagePlus className="h-4 w-4" /> {p.kind === "moto" ? "Approvisionner ce modèle" : "Approvisionner"}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setWizard({ product: p, mode: "Fournisseur" })}><Truck className="h-4 w-4" /> Commander chez un fournisseur</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setWizard({ product: p, mode: "Importation" })}><Ship className="h-4 w-4" /> Créer dossier d'importation</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCompare(rankSuppliers(p, suppliers, ratings, 40).slice(0, 3).map((r) => r.supplier.id))}><Users className="h-4 w-4" /> Voir fournisseurs recommandés</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openHistory(p)}><History className="h-4 w-4" /> Voir historique</DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setAdjust(p); setAdjQty(0); }}><SlidersHorizontal className="h-4 w-4" /> Ajuster stock</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<Product>[] = [
    {
      key: "product",
      header: "Produit",
      render: (p) => {
        const i = ins(p);
        return (
          <div className="flex min-w-0 items-center gap-3">
            <ProductThumb product={p} />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {p.name}
                {i.alert && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Sparkles className={`h-3.5 w-3.5 shrink-0 ${i.status === "Rupture" ? "text-destructive" : "text-warning"}`} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{i.alert}</TooltipContent>
                  </Tooltip>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{p.ref} · {p.category}</p>
            </div>
          </div>
        );
      },
      sortValue: (p) => p.name,
    },
    { key: "avail", header: "Disponible", render: (p) => <span className="font-semibold tabular-nums">{num(p.centralStock)}</span>, sortValue: (p) => p.centralStock },
    { key: "res", header: "Réservé", render: (p) => num(p.reserved), sortValue: (p) => p.reserved },
    { key: "transit", header: "Transit", render: (p) => num(p.inTransit), sortValue: (p) => p.inTransit },
    { key: "min", header: "Seuil", render: (p) => num(p.minThreshold) },
    { key: "status", header: "Statut", render: (p) => <StatusBadge status={ins(p).status} />, sortValue: (p) => ins(p).status },
    { key: "sales", header: "Ventes 30j", render: (p) => num(ins(p).recentSales), sortValue: (p) => ins(p).recentSales },
    { key: "rot", header: "Rotation", render: (p) => `${ins(p).rotation}×`, sortValue: (p) => ins(p).rotation },
    { key: "sup", header: "Fournisseur principal", render: (p) => <span className="text-xs">{mainSupplier(p)?.name ?? "—"}</span> },
    { key: "last", header: "Dernière cmd", render: (p) => { const o = lastOrder(p); return o ? shortDate(o.orderDate) : "—"; } },
    {
      key: "ai",
      header: "Recommandation IA",
      render: (p) => {
        const i = ins(p);
        if (i.status === "Rupture" || i.status === "Stock faible")
          return (
            <Button size="sm" variant="outline" className="h-7 border-warning/40 text-xs" onClick={(e) => { e.stopPropagation(); setWizard({ product: p }); }}>
              <Sparkles className="h-3 w-3" /> Commander {i.recommended}
            </Button>
          );
        if (i.status === "Surstock") return <span className="text-xs text-info">Promouvoir auprès du réseau</span>;
        return <span className="text-xs text-muted-foreground">Couverture {i.coverage} j</span>;
      },
    },
    { key: "act", header: "", render: actions, className: "w-10" },
  ];

  const detailMoves = selected ? moves.filter((m) => m.productId === selected.id).slice(0, 10) : [];
  const selIns = selected ? ins(selected) : null;

  return (
    <>
      <DataTable
        rows={rows}
        columns={columns}
        searchText={(p) => `${p.name} ${p.ref} ${p.brand} ${p.category}`}
        onRowClick={(p) => { setSelectedId(p.id); setTab("infos"); }}
        exportName={kind === "moto" ? "catalogue-motos" : "catalogue-pieces"}
        filters={
          <>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Marque" /></SelectTrigger>
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
              <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                {["Disponible", "Stock faible", "Rupture", "Surstock", "En transit"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && selIns && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <ProductThumb product={selected} size={44} />
                  <span className="min-w-0 truncate">{selected.name}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-8">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selIns.status} />
                  <Button size="sm" onClick={() => setWizard({ product: selected })}><PackagePlus className="h-4 w-4" /> Approvisionner</Button>
                  {selIns.alert && (
                    <Button size="sm" variant="outline" onClick={() => setWizard({ product: selected, mode: "Importation" })}>
                      <Sparkles className="h-4 w-4" /> Générer dossier importation
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => { setAdjust(selected); setAdjQty(0); }}>Ajuster</Button>
                </div>

                {selIns.alert ? (
                  <AiNote tone={selIns.status === "Rupture" ? "danger" : "warning"}>{selIns.alert}</AiNote>
                ) : (
                  <AiNote tone="success">Stock suffisant pour environ {selIns.coverage} jours. Rotation {selIns.trend >= 0 ? `+${selIns.trend}` : selIns.trend} % sur 30 jours.</AiNote>
                )}

                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList>
                    <TabsTrigger value="infos">Informations</TabsTrigger>
                    <TabsTrigger value="stock">Stock réseau</TabsTrigger>
                    <TabsTrigger value="moves">Historique</TabsTrigger>
                  </TabsList>

                  <TabsContent value="infos" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Info label="Référence" value={selected.ref} />
                      <Info label="Marque" value={selected.brand} />
                      <Info label="Prix revendeur" value={mad(selected.priceDealer)} />
                      <Info label="Prix public conseillé" value={mad(selected.pricePublic)} />
                      <Info label="Disponible" value={num(selected.centralStock)} />
                      <Info label="Réservé" value={num(selected.reserved)} />
                      <Info label="En transit" value={num(selected.inTransit)} />
                      <Info label="Seuil minimum" value={num(selected.minThreshold)} />
                      <Info label="Consommation" value={`${selIns.cons} u./mois`} />
                      <Info label="Rotation" value={`${selIns.rotation}× / an`} />
                      <Info label="Fournisseur principal" value={mainSupplier(selected)?.name ?? "—"} />
                      <Info label="Dernière entrée" value={shortDate(selected.lastIn)} />
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
                      const low = line && line.available <= line.minThreshold;
                      return (
                        <div key={d.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                          <span className="truncate">{d.name}</span>
                          <span className={low ? "font-semibold text-warning" : "font-medium"}>{line?.available ?? 0}</span>
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
                        <p className="text-xs text-muted-foreground">{m.from} → {m.to} · {m.qty} unité(s)</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <SupplyWizard
        product={wizard?.product ?? null}
        open={!!wizard}
        onOpenChange={(o) => !o && setWizard(null)}
        {...(wizard?.mode ? { startMode: wizard.mode } : {})}
      />
      <SupplierCompare ids={compare} onClose={() => setCompare(null)} />

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajuster le stock — {adjust?.name}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2"><Label>Variation (+/−)</Label><Input type="number" value={adjQty} onChange={(e) => setAdjQty(Number(e.target.value))} /></div>
            <div className="space-y-2"><Label>Motif</Label><Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button disabled={!adjQty} onClick={() => { if (adjust) adjustStock(adjust.id, adjQty, adjReason); setAdjust(null); }}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
