import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiBadge, KpiCard, PageHeader, Pill } from "@/components/ui-kit";
import { Catalogue, ProductThumb } from "@/components/Catalogue";
import { SupplyWizard } from "@/components/SupplyWizard";
import { productInsight, rankSuppliers } from "@/lib/ai";
import { num } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { AlertTriangle, Bike, Package, Ship } from "lucide-react";

export const Route = createFileRoute("/sinophra/catalogue")({
  head: () => ({
    meta: [
      { title: "Catalogue & Stock — SINOPHRA" },
      { name: "description", content: "Catalogue motos et pièces, niveaux de stock et alertes IA de réapprovisionnement." },
      { property: "og:title", content: "Catalogue & Stock — SINOPHRA" },
      { property: "og:description", content: "Stock disponible, réservé, en transit et recommandations IA." },
    ],
  }),
  component: CatalogueStockPage,
});

function CatalogueStockPage() {
  const { products, dealerStock, suppliers, ratings } = useStore();
  const [drawer, setDrawer] = useState(false);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [wizard, setWizard] = useState<{ p: Product; mode: "Importation" | "Fournisseur" } | null>(null);

  const withIns = products.map((p) => ({ p, i: productInsight(p, dealerStock) }));
  const atRisk = withIns.filter((x) => x.i.coverage <= 15 && x.p.centralStock > 0);
  const low = withIns.filter((x) => x.i.status === "Stock faible" || x.i.status === "Rupture");
  const find = (n: string) => withIns.find((x) => x.p.name === n);
  const v10 = find("V10");
  const btx = find("Batterie BTX7");
  const cr = find("CR50");
  const recos = low.filter((x) => !ignored.includes(x.p.id)).sort((a, b) => a.i.coverage - b.i.coverage);

  const insights = [
    `${atRisk.length} références risquent une rupture dans les 15 prochains jours.`,
    v10 && `V10 : stock suffisant pour environ ${v10.i.coverage} jours.`,
    btx && `Batterie BTX7 : ${btx.p.centralStock <= btx.p.minThreshold ? "réapprovisionnement urgent recommandé" : "stock correct"}.`,
    cr && `CR50 : +18 % de rotation sur les 30 derniers jours.`,
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title="Catalogue & Stock"
        subtitle="Catalogue, niveaux de stock et réapprovisionnement piloté par l'IA."
        actions={<Button onClick={() => setDrawer(true)}><Sparkles className="h-4 w-4" /> Voir recommandations IA</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Motos disponibles" value={num(products.filter((p) => p.kind === "moto").reduce((s, p) => s + p.centralStock, 0))} icon={Bike} />
        <KpiCard label="Pièces disponibles" value={num(products.filter((p) => p.kind === "piece").reduce((s, p) => s + p.centralStock, 0))} icon={Package} />
        <KpiCard label="En transit" value={num(products.reduce((s, p) => s + p.inTransit, 0))} icon={Ship} tone="accent" />
        <KpiCard label="Alertes stock" value={low.length} icon={AlertTriangle} tone="warning" onClick={() => setDrawer(true)} />
      </div>

      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold">Assistant Stock <AiBadge /></p>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setDrawer(true)}>Voir recommandations IA →</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {insights.map((t) => (
            <div key={t} className="rounded-lg border bg-card/60 px-3 py-2.5 text-sm transition-colors hover:border-primary/40">{t}</div>
          ))}
        </div>
      </div>

      <Tabs defaultValue="moto">
        <TabsList>
          <TabsTrigger value="moto">Motos</TabsTrigger>
          <TabsTrigger value="piece">Matériel & Pièces</TabsTrigger>
        </TabsList>
        <TabsContent value="moto" className="pt-4"><Catalogue kind="moto" /></TabsContent>
        <TabsContent value="piece" className="pt-4"><Catalogue kind="piece" /></TabsContent>
      </Tabs>

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">Recommandations IA <AiBadge /></SheetTitle>
            <SheetDescription>{recos.length} produits nécessitent un réapprovisionnement.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-10">
            {recos.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Aucune recommandation en attente.</p>}
            {recos.map(({ p, i }) => {
              const sup = rankSuppliers(p, suppliers, ratings, i.recommended)[0];
              const action = p.kind === "moto" || i.recommended >= 50 ? "Importation" : "Fournisseur";
              return (
                <div key={p.id} className="rounded-xl border p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <ProductThumb product={p} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.ref}</p>
                    </div>
                    <Pill tone={i.status === "Rupture" ? "danger" : "warning"}>{i.status}</Pill>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
                    <Metric l="Stock actuel" v={num(p.centralStock)} />
                    <Metric l="Conso. moyenne" v={`${i.cons}/mois`} />
                    <Metric l="Couverture" v={`${i.coverage} j`} />
                    <Metric l="Qté recommandée" v={num(i.recommended)} />
                    <Metric l="Fournisseur" v={sup?.supplier.name ?? "—"} />
                    <Metric l="Délai moyen" v={`${sup?.supplier.avgDelay ?? "—"} j`} />
                    <Metric l="Action" v={action === "Importation" ? "Importer" : "Commander"} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={action === "Fournisseur" ? "default" : "outline"} onClick={() => setWizard({ p, mode: "Fournisseur" })}>Commander fournisseur</Button>
                    <Button size="sm" variant={action === "Importation" ? "default" : "outline"} onClick={() => setWizard({ p, mode: "Importation" })}>Créer importation</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIgnored((x) => [...x, p.id]); toast.info(`Recommandation ${p.name} ignorée`); }}>Ignorer</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <SupplyWizard product={wizard?.p ?? null} open={!!wizard} onOpenChange={(o) => !o && setWizard(null)} {...(wizard ? { startMode: wizard.mode } : {})} />
    </>
  );
}

function Metric({ l, v }: { l: string; v: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{l}</p>
      <p className="truncate font-medium">{v}</p>
    </div>
  );
}
