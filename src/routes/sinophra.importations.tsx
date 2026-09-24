import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable, Info as _Info, PageHeader, StatusBadge, Timeline, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { mad, num, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { ImportFile } from "@/lib/types";

export const Route = createFileRoute("/sinophra/importations")({
  head: () => ({
    meta: [
      { title: "Importations — SINOPHRA" },
      { name: "description", content: "Dossiers d'importation, transit, assemblage et mise en stock." },
      { property: "og:title", content: "Importations — SINOPHRA" },
      { property: "og:description", content: "Suivi des dossiers d'importation du fournisseur au stock central." },
    ],
  }),
  component: ImportsPage,
});

const FULL_FLOW = ["Commandé", "En préparation", "Expédié", "En transit", "Arrivé", "Réceptionné", "Assemblage", "Contrôle", "Disponible"];

function ImportsPage() {
  const { imports, suppliers, products, advanceImport } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = imports.find((i) => i.id === selectedId) ?? null;

  const value = (imp: ImportFile) => imp.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const units = (imp: ImportFile) => imp.lines.reduce((s, l) => s + l.qty, 0);

  const columns: Column<ImportFile>[] = [
    { key: "id", header: "Dossier", render: (i) => <span className="font-medium">{i.id}</span>, sortValue: (i) => i.id },
    { key: "sup", header: "Fournisseur", render: (i) => suppliers.find((s) => s.id === i.supplierId)?.name ?? "—" },
    { key: "date", header: "Date commande", render: (i) => shortDate(i.orderDate), sortValue: (i) => i.orderDate },
    { key: "origin", header: "Origine", render: (i) => i.origin },
    { key: "units", header: "Unités", render: (i) => num(units(i)), sortValue: (i) => units(i) },
    { key: "value", header: "Valeur", render: (i) => mad(value(i)), sortValue: (i) => value(i) },
    { key: "status", header: "Statut", render: (i) => <StatusBadge status={i.status} /> },
    { key: "eta", header: "Arrivée estimée", render: (i) => shortDate(i.eta), sortValue: (i) => i.eta },
  ];

  return (
    <>
      <PageHeader
        title="Importations"
        subtitle="Du bon de commande fournisseur à la mise en stock, assemblage inclus."
        actions={<Button onClick={() => toast.success("Nouveau dossier d'importation créé (simulation)")}>Nouveau dossier</Button>}
      />

      <DataTable
        rows={imports}
        columns={columns}
        searchText={(i) => `${i.id} ${i.origin} ${i.status}`}
        onRowClick={(i) => setSelectedId(i.id)}
        exportName="importations"
      />

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.id}</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 px-4 pb-10">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  {selected.semiAssembled && <span className="text-xs text-muted-foreground">Motos semi-montées</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info label="Fournisseur" value={suppliers.find((s) => s.id === selected.supplierId)?.name ?? "—"} />
                  <Info label="Origine" value={selected.origin} />
                  <Info label="Commandé le" value={shortDate(selected.orderDate)} />
                  <Info label="Arrivée estimée" value={shortDate(selected.eta)} />
                  <Info label="Unités" value={num(units(selected))} />
                  <Info label="Valeur" value={mad(value(selected))} />
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Références</p>
                  <ul className="space-y-2 text-sm">
                    {selected.lines.map((l) => (
                      <li key={l.productId} className="flex justify-between gap-3">
                        <span className="truncate">{products.find((p) => p.id === l.productId)?.name}</span>
                        <span className="font-medium">{l.qty}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Progression</p>
                  <Timeline
                    steps={selected.semiAssembled ? FULL_FLOW : FULL_FLOW.filter((s) => s !== "Assemblage" && s !== "Contrôle")}
                    currentIndex={FULL_FLOW.indexOf(selected.status)}
                  />
                  <Button
                    className="w-full"
                    disabled={selected.status === "Disponible"}
                    onClick={() => advanceImport(selected.id)}
                  >
                    <Play className="h-4 w-4" /> Faire avancer le dossier
                  </Button>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="mb-3 text-sm font-medium">Documents</p>
                  {["Facture proforma.pdf", "Connaissement maritime.pdf", "Certificat de conformité.pdf"].map((d) => (
                    <button
                      key={d}
                      onClick={() => toast.success(`${d} téléchargé (simulation)`)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" /> {d}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
