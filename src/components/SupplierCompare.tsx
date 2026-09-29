import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AiNote, ScoreBar } from "@/components/ui-kit";
import { supplierAnalysis } from "@/lib/ai";
import { mad } from "@/lib/format";
import { useStore } from "@/lib/store";

/** Drawer comparant jusqu'à 3 fournisseurs, avec recommandation IA. */
export function SupplierCompare({ ids, onClose }: { ids: string[] | null; onClose: () => void }) {
  const { suppliers, ratings, imports } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    if (ids) setSelected(ids.slice(0, 3));
  }, [ids]);

  const rows = selected
    .map((id) => suppliers.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => !!s)
    .map((s) => ({ s, a: supplierAnalysis(s, ratings), files: imports.filter((i) => i.supplierId === s.id).length }));
  const best = [...rows].sort((x, y) => y.a.score - x.a.score)[0];

  const metrics: [string, (r: (typeof rows)[number]) => React.ReactNode][] = [
    ["Prix", (r) => r.a.priceLabel],
    ["Délai", (r) => `${r.s.avgDelay} j`],
    ["Qualité", (r) => r.a.qualityLabel],
    ["Fiabilité", (r) => `${r.a.reliability} %`],
    ["Taux retard", (r) => `${r.a.lateRate} %`],
    ["Historique", (r) => `${r.s.orders} cmd · ${mad(r.s.amount)}`],
    ["Dossiers en cours", (r) => r.files],
    ["Incidents", (r) => r.s.incidents],
    ["Score IA", (r) => <ScoreBar value={r.a.score} />],
  ];

  return (
    <Sheet open={!!ids} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Comparateur fournisseurs</SheetTitle>
          <SheetDescription>Jusqu'à 3 fournisseurs côte à côte.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-10">
          <div className="flex flex-wrap items-center gap-2">
            {rows.map((r) => (
              <span key={r.s.id} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
                {r.s.name}
                <button onClick={() => setSelected((p) => p.filter((x) => x !== r.s.id))} aria-label="Retirer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {selected.length < 3 && (
              <Select value="" onValueChange={(v) => setSelected((p) => [...p, v])}>
                <SelectTrigger className="h-8 w-48"><SelectValue placeholder="+ Ajouter" /></SelectTrigger>
                <SelectContent>
                  {suppliers.filter((s) => !selected.includes(s.id)).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {rows.length > 0 && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Critère</th>
                    {rows.map((r) => (
                      <th key={r.s.id} className="px-3 py-2 text-left font-semibold">
                        {r.s.name}
                        <p className="text-xs font-normal text-muted-foreground">{r.s.country}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(([label, fn]) => (
                    <tr key={label} className="border-b last:border-0">
                      <td className="px-3 py-2 text-muted-foreground">{label}</td>
                      {rows.map((r) => (
                        <td key={r.s.id} className="px-3 py-2">{fn(r)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {best && (
            <AiNote title={`Recommandation IA : ${best.s.name}`}>
              {best.a.summary} {best.a.reasons.slice(0, 2).join(" · ")}.
            </AiNote>
          )}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Ajoutez des fournisseurs à comparer.</p>}
          <Button variant="outline" className="w-full" onClick={onClose}>Fermer</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
