import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MoreHorizontal, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge, AiNote, DataTable, PageHeader, ScoreBar, StatusBadge, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { SupplierCompare } from "@/components/SupplierCompare";
import { SupplyWizard } from "@/components/SupplyWizard";
import { SupplyBoard } from "@/components/SupplyBoard";
import { supplierAnalysis } from "@/lib/ai";
import { mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Product, Supplier } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sinophra/fournisseurs")({
  head: () => ({
    meta: [
      { title: "Fournisseurs & Approvisionnement — SINOPHRA" },
      { name: "description", content: "Performance, évaluations internes et score IA des fournisseurs et importateurs." },
      { property: "og:title", content: "Fournisseurs & Approvisionnement — SINOPHRA" },
      { property: "og:description", content: "Analyse, comparaison et recommandation IA des fournisseurs." },
    ],
  }),
  component: SuppliersSupplyPage,
});

const CRITERIA = ["Qualité", "Prix", "Délai", "Communication", "Conformité", "Service", "Fiabilité"];

function SuppliersSupplyPage() {
  return (
    <Tabs defaultValue="fournisseurs" className="space-y-4">
      <TabsList>
        <TabsTrigger value="fournisseurs">Fournisseurs</TabsTrigger>
        <TabsTrigger value="appro">Approvisionnements & Importations</TabsTrigger>
      </TabsList>
      <TabsContent value="fournisseurs" className="space-y-6"><SuppliersPage /></TabsContent>
      <TabsContent value="appro" className="space-y-6"><SupplyBoard /></TabsContent>
    </Tabs>
  );
}

function SuppliersPage() {
  const { suppliers, products, imports, ratings } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("general");
  const [picked, setPicked] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[] | null>(null);
  const [rate, setRate] = useState<Supplier | null>(null);
  const [orderFor, setOrderFor] = useState<Supplier | null>(null);
  const [wizardProduct, setWizardProduct] = useState<Product | null>(null);

  const selected = suppliers.find((s) => s.id === selectedId) ?? null;
  const an = (s: Supplier) => supplierAnalysis(s, ratings);
  const productsOf = (s: Supplier) =>
    products.filter((p) =>
      s.categories.includes(p.category) ||
      (p.kind === "moto" ? s.categories.some((c) => ["Motos", "Scooters", "Utilitaires", "Tricycles"].includes(c) && (c === "Motos" || c.startsWith(p.category))) : s.categories.includes("Pièces")),
    );
  const lastRating = (s: Supplier) => ratings.find((r) => r.supplierId === s.id);

  const actions = (s: Supplier) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => { setSelectedId(s.id); setTab("general"); }}>Voir</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setOrderFor(s)}>Commander</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setCompare(Array.from(new Set([s.id, ...picked])).slice(0, 3))}>Comparer</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setRate(s)}>Noter</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const columns: Column<Supplier>[] = [
    {
      key: "pick",
      header: "",
      className: "w-8",
      render: (s) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={picked.includes(s.id)} onCheckedChange={(v) => setPicked((p) => (v ? [...p, s.id].slice(-3) : p.filter((x) => x !== s.id)))} />
        </span>
      ),
    },
    { key: "name", header: "Fournisseur", render: (s) => <span className="font-medium">{s.name}</span>, sortValue: (s) => s.name },
    { key: "country", header: "Pays", render: (s) => s.country, sortValue: (s) => s.country },
    { key: "cat", header: "Catégories", render: (s) => <span className="text-xs">{s.categories.slice(0, 3).join(", ")}</span> },
    { key: "prod", header: "Produits", render: (s) => productsOf(s).length, sortValue: (s) => productsOf(s).length },
    { key: "orders", header: "Cmd", render: (s) => num(s.orders), sortValue: (s) => s.orders },
    { key: "amount", header: "Valeur", render: (s) => mad(s.amount), sortValue: (s) => s.amount },
    { key: "delay", header: "Délai", render: (s) => `${s.avgDelay} j`, sortValue: (s) => s.avgDelay },
    { key: "late", header: "Retard", render: (s) => `${an(s).lateRate} %`, sortValue: (s) => an(s).lateRate },
    { key: "q", header: "Qualité", render: (s) => an(s).qualityLabel, sortValue: (s) => an(s).quality },
    { key: "price", header: "Prix", render: (s) => an(s).priceLabel, sortValue: (s) => an(s).price },
    { key: "inc", header: "Incidents", render: (s) => s.incidents, sortValue: (s) => s.incidents },
    { key: "note", header: "Note", render: (s) => <span className="inline-flex items-center gap-1 text-xs"><Star className="h-3 w-3 fill-warning text-warning" />{an(s).avgRating.toFixed(1)}</span>, sortValue: (s) => an(s).avgRating },
    { key: "score", header: "Score IA", render: (s) => <ScoreBar value={an(s).score} />, sortValue: (s) => an(s).score },
    { key: "status", header: "Statut", render: (s) => <StatusBadge status={an(s).status} /> },
    { key: "act", header: "", render: actions, className: "w-10" },
  ];

  const a = selected ? an(selected) : null;
  const files = selected ? imports.filter((i) => i.supplierId === selected.id) : [];

  return (
    <>
      <PageHeader
        title="Fournisseurs"
        subtitle="Historique, performance, évaluations internes et analyse IA."
        actions={
          <Button variant="outline" disabled={picked.length < 2} onClick={() => setCompare(picked)}>
            Comparer ({picked.length}/3)
          </Button>
        }
      />

      <DataTable
        rows={suppliers}
        columns={columns}
        searchText={(s) => `${s.name} ${s.country} ${s.categories.join(" ")}`}
        onRowClick={(s) => { setSelectedId(s.id); setTab("general"); }}
        exportName="fournisseurs"
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && a && (
            <>
              <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              <div className="space-y-5 px-4 pb-10">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.status} />
                  <span className="text-sm text-muted-foreground">Score IA</span> <ScoreBar value={a.score} />
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" onClick={() => setOrderFor(selected)}>Commander</Button>
                    <Button size="sm" variant="outline" onClick={() => setRate(selected)}>Noter</Button>
                  </div>
                </div>
                <Tabs value={tab} onValueChange={setTab}>
                  <TabsList className="h-auto flex-wrap">
                    <TabsTrigger value="general">Vue générale</TabsTrigger>
                    <TabsTrigger value="products">Produits</TabsTrigger>
                    <TabsTrigger value="files">Importations / Cmd</TabsTrigger>
                    <TabsTrigger value="perf">Performance</TabsTrigger>
                    <TabsTrigger value="inc">Incidents</TabsTrigger>
                    <TabsTrigger value="rev">Évaluations</TabsTrigger>
                    <TabsTrigger value="ai">Analyse IA</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <Info label="Pays" value={selected.country} />
                      <Info label="Contact" value={selected.contact} />
                      <Info label="Email" value={selected.email} />
                      <Info label="Commandes" value={num(selected.orders)} />
                      <Info label="Montant cumulé" value={mad(selected.amount)} />
                      <Info label="Délai moyen" value={`${selected.avgDelay} jours`} />
                      <Info label="Respect délai" value={`${a.reliability} %`} />
                      <Info label="Conformité" value={`${a.conformity} %`} />
                      <Info label="Incidents" value={String(selected.incidents)} />
                      <Info label="Qualité" value={a.qualityLabel} />
                      <Info label="Compétitivité prix" value={a.priceLabel} />
                      <Info label="Note interne" value={`${a.avgRating.toFixed(1)} / 5`} />
                    </div>
                    <AiNote>{a.summary}</AiNote>
                  </TabsContent>

                  <TabsContent value="products" className="space-y-2 pt-4">
                    {productsOf(selected).slice(0, 14).map((p) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="text-muted-foreground">{p.category} · {mad(Math.round(p.priceDealer * (selected.country === "Maroc" ? 0.78 : 0.62)))}</span>
                      </div>
                    ))}
                    {productsOf(selected).length === 0 && <p className="text-sm text-muted-foreground">Aucun produit référencé.</p>}
                  </TabsContent>

                  <TabsContent value="files" className="space-y-2 pt-4">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                        <span className="font-medium">{f.id}</span>
                        <StatusBadge status={f.mode} />
                        <span className="text-muted-foreground">{shortDate(f.orderDate)}</span>
                        <StatusBadge status={f.status} />
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, Math.min(5, selected.orders - files.length)) }, (_, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                        <span>HIST-{selected.id}-{120 + i}</span>
                        <span>{shortDate(new Date(Date.now() - (i + 2) * 38 * 864e5).toISOString())}</span>
                        <StatusBadge status="Disponible" />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="perf" className="space-y-4 pt-4">
                    {([["Respect des délais", a.reliability], ["Conformité", a.conformity], ["Qualité produit", a.quality], ["Compétitivité prix", a.price]] as const).map(([l, v]) => (
                      <div key={l} className="space-y-1.5">
                        <div className="flex justify-between text-sm"><span>{l}</span><span className="font-medium">{v} %</span></div>
                        <Progress value={v} />
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="inc" className="space-y-2 pt-4">
                    {selected.incidents === 0 && <p className="text-sm text-muted-foreground">Aucun incident enregistré.</p>}
                    {Array.from({ length: selected.incidents }, (_, i) => (
                      <div key={i} className="rounded-md border px-3 py-2 text-sm">
                        <p className="font-medium">{["Retard de livraison", "Colis endommagé", "Non-conformité documentaire", "Pièces manquantes"][i % 4]}</p>
                        <p className="text-xs text-muted-foreground">{shortDate(new Date(Date.now() - (i + 1) * 47 * 864e5).toISOString())} · Résolu</p>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="rev" className="space-y-2 pt-4">
                    <Button size="sm" variant="outline" onClick={() => setRate(selected)}>Ajouter une évaluation</Button>
                    {ratings.filter((r) => r.supplierId === selected.id).map((r) => (
                      <div key={r.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex justify-between"><span className="font-medium">{r.author}</span><span className="text-xs text-muted-foreground">{shortDate(r.date)}</span></div>
                        <p className="mt-1 text-xs text-muted-foreground">{Object.entries(r.scores).map(([k, v]) => `${k} ${v}/5`).join(" · ")}</p>
                        {r.comment && <p className="mt-1">{r.comment}</p>}
                      </div>
                    ))}
                    {!lastRating(selected) && <p className="text-sm text-muted-foreground">Aucune évaluation interne.</p>}
                  </TabsContent>

                  <TabsContent value="ai" className="space-y-3 pt-4">
                    <p className="flex items-center gap-2 text-sm font-semibold">Synthèse <AiBadge /></p>
                    <AiNote>{a.summary}</AiNote>
                    <p className="text-sm font-medium">Raisons</p>
                    <ul className="space-y-1.5 text-sm">
                      {a.reasons.map((r) => <li key={r} className="rounded-md border px-3 py-1.5">{r}</li>)}
                    </ul>
                    <p className="text-xs text-muted-foreground">Sources : historique importations ({files.length}), commandes ({selected.orders}), retards, incidents, prix, notes internes.</p>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <RatingDialog supplier={rate} onClose={() => setRate(null)} />
      <SupplierCompare ids={compare} onClose={() => setCompare(null)} />

      <Dialog open={!!orderFor} onOpenChange={(o) => !o && setOrderFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Commander chez {orderFor?.name}</DialogTitle></DialogHeader>
          <Label>Produit à approvisionner</Label>
          <Select onValueChange={(v) => { const p = products.find((x) => x.id === v); if (p) { setWizardProduct(p); setOrderFor(null); } }}>
            <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
            <SelectContent>
              {(orderFor ? productsOf(orderFor) : []).concat(orderFor && productsOf(orderFor).length === 0 ? products.slice(0, 10) : []).map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} — stock {p.centralStock}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
      <SupplyWizard product={wizardProduct} open={!!wizardProduct} onOpenChange={(o) => !o && setWizardProduct(null)} startMode="Fournisseur" />
    </>
  );
}

function RatingDialog({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const { rateSupplier, session } = useStore();
  const [scores, setScores] = useState<Record<string, number>>(Object.fromEntries(CRITERIA.map((c) => [c, 4])));
  const [comment, setComment] = useState("");
  return (
    <Dialog open={!!supplier} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Évaluer {supplier?.name}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {CRITERIA.map((c) => (
            <div key={c} className="flex items-center justify-between gap-3">
              <span className="text-sm">{c}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setScores((s) => ({ ...s, [c]: n }))} aria-label={`${c} ${n}`}>
                    <Star className={cn("h-5 w-5 transition-colors", n <= (scores[c] ?? 0) ? "fill-warning text-warning" : "text-muted-foreground/40")} />
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Label className="pt-2">Commentaire interne</Label>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (supplier) rateSupplier({ supplierId: supplier.id, scores, comment, author: session?.name ?? "Équipe SINOPHRA" });
              setComment("");
              onClose();
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
