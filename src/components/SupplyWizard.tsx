import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, FileCheck2, Plane, Ship, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AiNote, Pill, ScoreBar } from "@/components/ui-kit";
import { Info, ProductThumb } from "@/components/Catalogue";
import { SupplierCompare } from "@/components/SupplierCompare";
import { productInsight, rankSuppliers, recommendMode } from "@/lib/ai";
import { mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type Mode = "Importation" | "Fournisseur";

const CHECKLIST = ["Bon de commande", "Facture proforma", "Packing list", "Certificat origine", "Document transport", "Documents douaniers"];

/**
 * Assistant d'approvisionnement : produit → choix du mode → dossier import ou fournisseur recommandé.
 * `startMode` permet d'ouvrir directement le dossier import généré par IA ou la liste fournisseurs.
 */
export function SupplyWizard({
  product,
  open,
  onOpenChange,
  startMode,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  startMode?: Mode;
}) {
  const { dealerStock, suppliers, ratings, createSupply } = useStore();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>("Importation");
  const [qty, setQty] = useState(0);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [compare, setCompare] = useState<string[] | null>(null);
  const [checks, setChecks] = useState<string[]>(["Bon de commande", "Facture proforma"]);

  const ins = product ? productInsight(product, dealerStock) : null;
  const rec = product && ins ? recommendMode(product, Math.max(1, ins.recommended)) : null;

  useEffect(() => {
    if (open && product && ins && rec) {
      setQty(Math.max(product.kind === "moto" ? 10 : 20, ins.recommended));
      setMode(startMode ?? rec.mode);
      setStep(startMode ? 3 : 1);
      setSupplierId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const ranked = useMemo(
    () => (product ? rankSuppliers(product, suppliers, ratings, qty) : []),
    [product, suppliers, ratings, qty],
  );
  const importSuppliers = ranked.filter((r) => r.supplier.country !== "Maroc");
  const bestImport = importSuppliers[0] ?? ranked[0];

  if (!product || !ins || !rec) return null;

  const unitImport = Math.round(product.priceDealer * 0.62);
  const unitLocal = Math.round(product.priceDealer * 0.78);
  const importDelay = bestImport?.supplier.avgDelay ?? 35;
  const arrival = new Date(Date.now() + importDelay * 864e5).toISOString();
  const priority = ins.status === "Rupture" ? "Critique" : ins.status === "Stock faible" ? "Haute" : "Normale";

  const createImport = () => {
    if (!bestImport) return;
    createSupply({ productId: product.id, qty, supplierId: bestImport.supplier.id, mode: "Importation", unitPrice: unitImport, delayDays: importDelay });
    onOpenChange(false);
  };
  const createSupplierOrder = () => {
    const chosen = ranked.find((r) => r.supplier.id === supplierId);
    if (!chosen) return;
    createSupply({ productId: product.id, qty, supplierId: chosen.supplier.id, mode: "Fournisseur", unitPrice: unitLocal, delayDays: chosen.supplier.avgDelay });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <ProductThumb product={product} size={36} />
              <span className="min-w-0 truncate">
                {step === 3 && mode === "Importation" ? "Dossier d'importation généré par IA" : `Approvisionner ${product.name}`}
              </span>
            </DialogTitle>
            <DialogDescription>Étape {step} / 3 — {step === 1 ? "Besoin produit" : step === 2 ? "Choix du mode" : mode === "Importation" ? "Préparation du dossier" : "Fournisseurs recommandés"}</DialogDescription>
          </DialogHeader>

          <div className="flex gap-1.5">
            {[1, 2, 3].map((s) => (
              <span key={s} className={cn("h-1 flex-1 rounded-full transition-colors", s <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Info label="Stock disponible" value={num(product.centralStock)} />
                <Info label="Seuil minimum" value={num(product.minThreshold)} />
                <Info label="En transit" value={num(product.inTransit)} />
                <Info label="Consommation" value={`${ins.cons} u./mois`} />
                <Info label="Couverture" value={`${ins.coverage} jours`} />
                <Info label="Besoin prévisionnel" value={`${ins.recommended} u.`} />
              </div>
              {ins.alert && <AiNote tone={ins.status === "Rupture" ? "danger" : "warning"}>{ins.alert}</AiNote>}
              <div className="space-y-2">
                <Label>Quantité à approvisionner</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
                <p className="text-xs text-muted-foreground">Quantité recommandée par l'IA : {ins.recommended} unités (2 mois de consommation + seuil).</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <AiNote title={`Mode recommandé : ${rec.mode === "Importation" ? "Importation" : "Fournisseur local"}`}>{rec.reason}</AiNote>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["Importation", Ship, "Dossier import direct usine", `${mad(unitImport)} / u. · ~${importDelay} j`],
                    ["Fournisseur", Truck, "Commande fournisseur", `${mad(unitLocal)} / u. · ${ranked.find((r) => r.supplier.country === "Maroc")?.supplier.avgDelay ?? 7} j`],
                  ] as const
                ).map(([m, Icon, label, meta]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "relative rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md",
                      mode === m ? "border-primary bg-primary/5 ring-1 ring-primary" : "",
                    )}
                  >
                    {rec.mode === m && <span className="absolute top-3 right-3"><Pill tone="accent">Recommandé</Pill></span>}
                    <Icon className="h-6 w-6 text-primary" />
                    <p className="mt-3 font-semibold">{m === "Importation" ? "A. Importation" : "B. Fournisseur"}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-2 text-xs font-medium">{meta}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && mode === "Importation" && bestImport && (
            <div className="space-y-4">
              <AiNote>L'IA a préparé ce dossier à partir de l'historique fournisseur, des prix moyens et de la couverture de stock.</AiNote>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Info label="Produit" value={product.name} />
                <div className="rounded-md border px-3 py-2">
                  <p className="text-xs text-muted-foreground">Quantité recommandée</p>
                  <Input type="number" className="mt-1 h-7" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
                </div>
                <Info label="Fournisseur recommandé" value={bestImport.supplier.name} />
                <Info label="Pays" value={bestImport.supplier.country} />
                <Info label="Prix estimé" value={`${mad(unitImport)} / u.`} />
                <Info label="Coût total estimé" value={mad(unitImport * qty)} />
                <Info label="Délai estimé" value={`${importDelay} jours`} />
                <Info label="Arrivée estimée" value={shortDate(arrival)} />
                <Info label="Transport" value={qty * product.priceDealer > 150000 ? "Maritime (conteneur)" : "Maritime groupage"} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                Priorité : <Pill tone={priority === "Critique" ? "danger" : priority === "Haute" ? "warning" : "info"}>{priority}</Pill>
                <Plane className="ml-auto h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Option aérien : +9 % coût, −24 j</span>
              </div>
              <div className="rounded-lg border p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium"><FileCheck2 className="h-4 w-4" /> Checklist documentaire</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CHECKLIST.map((c) => (
                    <label key={c} className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={checks.includes(c)}
                        onCheckedChange={(v) => setChecks((prev) => (v ? [...prev, c] : prev.filter((x) => x !== c)))}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && mode === "Fournisseur" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Fournisseurs recommandés</p>
                <Button variant="outline" size="sm" onClick={() => setCompare(ranked.slice(0, 3).map((r) => r.supplier.id))}>
                  Comparer le top 3
                </Button>
              </div>
              {ranked.slice(0, 3).map((r, i) => (
                <div
                  key={r.supplier.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    supplierId === r.supplier.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/40",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {r.supplier.name} {i === 0 && <Pill tone="accent">Top IA</Pill>}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.supplier.country}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score IA</p>
                      <ScoreBar value={r.analysis.score} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    <span>Prix : <b>{r.analysis.priceLabel}</b></span>
                    <span>Qualité : <b>{r.analysis.qualityLabel}</b></span>
                    <span>Délai : <b>{r.supplier.avgDelay} jours</b></span>
                    <span>Fiabilité : <b>{r.analysis.reliability} %</b></span>
                  </div>
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-primary">Pourquoi ce fournisseur ?</summary>
                    <p className="mt-1 flex gap-1.5 text-muted-foreground"><Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />{r.why}</p>
                  </details>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant={supplierId === r.supplier.id ? "default" : "outline"} onClick={() => setSupplierId(r.supplier.id)}>
                      {supplierId === r.supplier.id ? <><Check className="h-4 w-4" /> Sélectionné</> : "Sélectionner"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCompare(ranked.slice(0, 3).map((x) => x.supplier.id))}>Comparer</Button>
                    <Button size="sm" variant="ghost" onClick={() => setCompare([r.supplier.id])}>Voir historique</Button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <Label className="shrink-0">Quantité</Label>
                <Input type="number" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className="w-28" />
                <span className="text-sm text-muted-foreground">Total estimé : {mad(unitLocal * qty)}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4" /> Retour
              </Button>
            )}
            {step < 3 && <Button onClick={() => setStep(step + 1)}>Continuer</Button>}
            {step === 3 && mode === "Importation" && <Button onClick={createImport}>Créer le dossier</Button>}
            {step === 3 && mode === "Fournisseur" && (
              <Button disabled={!supplierId} onClick={createSupplierOrder}>Commander chez ce fournisseur</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SupplierCompare ids={compare} onClose={() => setCompare(null)} />
    </>
  );
}
