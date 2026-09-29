import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CalendarClock, FileText, PackageSearch, Play, Ship, Truck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiBadge, AiNote, DataTable, KpiCard, PageHeader, Pill, StatusBadge, Timeline, type Column } from "@/components/ui-kit";
import { Info, ProductThumb } from "@/components/Catalogue";
import { SupplyWizard } from "@/components/SupplyWizard";
import { productInsight, rankSuppliers, recommendMode } from "@/lib/ai";
import { mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ImportFile, Product } from "@/lib/types";


const FULL_FLOW = ["Commandé", "En préparation", "Expédié", "En transit", "Arrivé", "Réceptionné", "Assemblage", "Contrôle", "Disponible"];

export function SupplyBoard() {
  const { imports, suppliers, products, dealerStock, ratings, advanceImport } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState("all");
  const [wizard, setWizard] = useState<{ p: Product; mode?: "Importation" | "Fournisseur" } | null>(null);
  const selected = imports.find((i) => i.id === selectedId) ?? null;

  const value = (imp: ImportFile) => imp.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const units = (imp: ImportFile) => imp.lines.reduce((s, l) => s + l.qty, 0);
  const open = imports.filter((i) => i.status !== "Disponible");
  const late = open.filter((i) => new Date(i.eta).getTime() < Date.now());
  const soon = open.filter((i) => { const d = (new Date(i.eta).getTime() - Date.now()) / 864e5; return d >= 0 && d <= 14; });
  const needs = products
    .map((p) => ({ p, i: productInsight(p, dealerStock) }))
    .filter((x) => x.i.status === "Stock faible" || x.i.status === "Rupture")
    .sort((a, b) => a.i.coverage - b.i.coverage);
  const supName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—";

  const columns: Column<ImportFile>[] = [
    { key: "id", header: "Dossier", render: (i) => <span className="font-medium">{i.id}</span>, sortValue: (i) => i.id },
    { key: "mode", header: "Type", render: (i) => <StatusBadge status={i.mode} /> },
    { key: "sup", header: "Fournisseur", render: (i) => supName(i.supplierId), sortValue: (i) => supName(i.supplierId) },
    { key: "prod", header: "Produits", render: (i) => <span className="text-xs">{i.lines.map((l) => products.find((p) => p.id === l.productId)?.name).join(", ")}</span> },
    { key: "units", header: "Unités", render: (i) => num(units(i)), sortValue: (i) => units(i) },
    { key: "value", header: "Valeur", render: (i) => mad(value(i)), sortValue: (i) => value(i) },
    { key: "status", header: "Statut", render: (i) => <StatusBadge status={i.status} />, sortValue: (i) => FULL_FLOW.indexOf(i.status) },
    {
      key: "eta",
      header: "Arrivée",
      render: (i) => <span className={i.status !== "Disponible" && new Date(i.eta).getTime() < Date.now() ? "font-medium text-destructive" : ""}>{shortDate(i.eta)}</span>,
      sortValue: (i) => i.eta,
    },
  ];

  const rows = mode === "all" ? imports : imports.filter((i) => i.mode === mode);

  return (
    <>
      <PageHeader
        title="Approvisionnement"
        subtitle="Partez d'un besoin de stock et choisissez : importation directe ou commande fournisseur."
        actions={<Button onClick={() => needs[0] && setWizard({ p: needs[0].p })}>Nouvel approvisionnement</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="À réapprovisionner" value={needs.length} icon={PackageSearch} tone="warning" />
        <KpiCard label="Cmd fournisseurs" value={open.filter((i) => i.mode === "Fournisseur").length} icon={Truck} onClick={() => setMode("Fournisseur")} />
        <KpiCard label="Importations" value={open.filter((i) => i.mode === "Importation").length} icon={Ship} onClick={() => setMode("Importation")} />
        <KpiCard label="Valeur en transit" value={mad(open.reduce((s, i) => s + value(i), 0))} icon={Wallet} tone="accent" />
        <KpiCard label="Retards" value={late.length} icon={AlertTriangle} tone="danger" />
        <KpiCard label="Arrivées 14 j" value={soon.length} icon={CalendarClock} tone="success" />
      </div>

      <div className="space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold">Suggestions IA d'approvisionnement <AiBadge /></p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {needs.slice(0, 6).map(({ p, i }) => {
            const qty = Math.max(p.kind === "moto" ? 20 : 20, i.recommended);
            const rec = recommendMode(p, qty);
            const sup = rankSuppliers(p, suppliers, ratings, qty).find((r) => (rec.mode === "Fournisseur" ? r.supplier.country === "Maroc" || r.supplier.avgDelay < 15 : true));
            return (
              <div key={p.id} className="rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <ProductThumb product={p} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Stock : {p.centralStock} · Besoin recommandé : {qty}</p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
                <AiNote className="mt-3" tone="accent">
                  {rec.mode === "Importation" ? "Importation directe recommandée." : `Commande auprès du fournisseur ${sup?.supplier.name ?? "local"} recommandée.`}
                </AiNote>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant={rec.mode === "Importation" ? "default" : "outline"} onClick={() => setWizard({ p, mode: "Importation" })}>Lancer importation</Button>
                  <Button size="sm" variant={rec.mode === "Fournisseur" ? "default" : "outline"} onClick={() => setWizard({ p, mode: "Fournisseur" })}>Commander fournisseur</Button>
                  <Button size="sm" variant="ghost" onClick={() => setWizard({ p })}>Analyser</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        searchText={(i) => `${i.id} ${supName(i.supplierId)} ${i.status}`}
        onRowClick={(i) => setSelectedId(i.id)}
        exportName="approvisionnements"
        filters={
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les dossiers</SelectItem>
              <SelectItem value="Importation">Importations</SelectItem>
              <SelectItem value="Fournisseur">Commandes fournisseurs</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.id}</SheetTitle></SheetHeader>
              <div className="space-y-6 px-4 pb-10">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <StatusBadge status={selected.mode} />
                  {selected.semiAssembled && <Pill>Motos semi-montées</Pill>}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Fournisseur" value={supName(selected.supplierId)} />
                  <Info label="Origine" value={selected.origin} />
                  <Info label="Commandé le" value={shortDate(selected.orderDate)} />
                  <Info label="Arrivée estimée" value={shortDate(selected.eta)} />
                  <Info label="Unités" value={num(units(selected))} />
                  <Info label="Valeur" value={mad(value(selected))} />
                </div>
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Références</p>
                  {selected.lines.map((l) => (
                    <div key={l.productId} className="flex justify-between gap-3 py-1 text-sm">
                      <span className="truncate">{products.find((p) => p.id === l.productId)?.name}</span>
                      <span className="font-medium">{l.qty}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Progression</p>
                  <Timeline
                    steps={selected.semiAssembled ? FULL_FLOW : FULL_FLOW.filter((s) => s !== "Assemblage" && s !== "Contrôle")}
                    currentIndex={(selected.semiAssembled ? FULL_FLOW : FULL_FLOW.filter((s) => s !== "Assemblage" && s !== "Contrôle")).indexOf(selected.status)}
                  />
                  <Button className="w-full" disabled={selected.status === "Disponible"} onClick={() => advanceImport(selected.id)}>
                    <Play className="h-4 w-4" /> {selected.status === "Réceptionné" || selected.status === "Contrôle" || selected.status === "Arrivé" ? "Réceptionner / avancer" : "Faire avancer le dossier"}
                  </Button>
                  {selected.status !== "Disponible" && <p className="mt-2 text-xs text-muted-foreground">À l'étape « Disponible », le stock central est mis à jour automatiquement.</p>}
                </div>
                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Documents</p>
                  {["Bon de commande", "Facture proforma", "Packing list", "Certificat origine", "Document transport", "Documents douaniers"].map((d) => (
                    <button key={d} onClick={() => toast.success(`${d}.pdf téléchargé (simulation)`)} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                      <FileText className="h-4 w-4 text-muted-foreground" /> {d}.pdf
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <SupplyWizard product={wizard?.p ?? null} open={!!wizard} onOpenChange={(o) => !o && setWizard(null)} {...(wizard?.mode ? { startMode: wizard.mode } : {})} />
    </>
  );
}
