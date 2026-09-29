import { useState } from "react";
import { toast } from "sonner";
import { Eye, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AiBadge, DataTable, PageHeader, Pill, SectionCard, StatusBadge, type Column } from "@/components/ui-kit";

/* ---------------- Utilisateurs ---------------- */

interface U { id: string; name: string; role: string; email: string; status: string }

export function UsersPanel({ roles, initial, title = "Utilisateurs" }: { roles: string[]; initial: [string, string, string][]; title?: string }) {
  const [users, setUsers] = useState<U[]>(initial.map(([name, role, email], i) => ({ id: `U${i}`, name, role, email, status: "Actif" })));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: roles[0]! });
  const cols: Column<U>[] = [
    { key: "n", header: "Nom", render: (u) => <span className="font-medium">{u.name}</span>, sortValue: (u) => u.name },
    { key: "e", header: "Email", render: (u) => u.email },
    {
      key: "r",
      header: "Rôle",
      render: (u) => (
        <span onClick={(e) => e.stopPropagation()}>
          <Select value={u.role} onValueChange={(v) => { setUsers((p) => p.map((x) => (x.id === u.id ? { ...x, role: v } : x))); toast.success("Rôle mis à jour"); }}>
            <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </span>
      ),
    },
    { key: "s", header: "Statut", render: (u) => <StatusBadge status={u.status} /> },
    {
      key: "a",
      header: "",
      render: (u) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setUsers((p) => p.filter((x) => x.id !== u.id)); toast.success(`${u.name} supprimé`); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader title={title} subtitle="Comptes, rôles et accès." actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Inviter</Button>} />
      <DataTable rows={users} columns={cols} searchText={(u) => `${u.name} ${u.email} ${u.role}`} exportName="utilisateurs" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Inviter un utilisateur</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2"><Label>Nom</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={!form.name || !form.email} onClick={() => { setUsers((p) => [...p, { id: `U${Date.now()}`, ...form, status: "En attente" }]); setOpen(false); setForm({ name: "", email: "", role: roles[0]! }); toast.success("Invitation envoyée"); }}>Envoyer l'invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- Configuration IA & base de connaissance ---------------- */

const ASSISTANTS = [
  ["Assistant Stock", "Détecte les ruptures, calcule la couverture et recommande les quantités.", ["Catalogue", "Stock", "Ventes"]],
  ["Assistant Approvisionnement", "Choisit entre importation et fournisseur, prépare les dossiers.", ["Approvisionnement", "Fournisseurs", "Procédure importation.pdf"]],
  ["Assistant Fournisseurs", "Analyse performance, notes internes et recommande le meilleur fournisseur.", ["Fournisseurs", "Évaluations", "Conditions fournisseurs.pdf"]],
  ["Assistant Revendeurs", "Mesure rentabilité et rotation, propose des transferts de stock.", ["Revendeurs", "Commandes", "Stock réseau"]],
  ["Assistant Facturation", "Anticipe les retards de paiement et prépare les relances.", ["Factures", "Historique paiements"]],
  ["Assistant Réclamations", "Résume les tickets, détecte les défauts récurrents.", ["Réclamations", "Procédure SAV.pdf", "Politique garantie.pdf"]],
  ["Assistant Analytics", "Explique les tendances et répond aux questions de direction.", ["Ventes", "Analytics"]],
] as const;

interface Doc { id: string; name: string; size: string; active: boolean }

export function AiConfigPanel() {
  const [state, setState] = useState<Record<string, { on: boolean; tone: string; instructions: string }>>(
    Object.fromEntries(ASSISTANTS.map(([n]) => [n, { on: true, tone: "Professionnel", instructions: "Réponds en français, de façon concise, avec une action recommandée." }])),
  );
  const [docs, setDocs] = useState<Doc[]>(
    ["Catalogue produits.pdf", "Politique commerciale.pdf", "Procédure importation.pdf", "Conditions fournisseurs.pdf", "Procédure SAV.pdf", "Politique garantie.pdf"].map((n, i) => ({ id: `K${i}`, name: n, size: `${(1.2 + i * 0.7).toFixed(1)} Mo`, active: true })),
  );
  const [edit, setEdit] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState("");

  return (
    <div className="space-y-6">
      <SectionCard title="Assistants métier" action={<AiBadge label="IA intégrée" />}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ASSISTANTS.map(([name, desc, sources]) => {
            const s = state[name]!;
            return (
              <div key={name} className="rounded-xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{name}</p>
                  <Switch checked={s.on} onCheckedChange={(v) => { setState((p) => ({ ...p, [name]: { ...s, on: v } })); toast.success(`${name} ${v ? "activé" : "désactivé"}`); }} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                <div className="mt-3 flex flex-wrap gap-1">{sources.map((x) => <Pill key={x}>{x}</Pill>)}</div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ton : {s.tone} · {docs.filter((d) => d.active).length} docs</span>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setEdit(name)}>Configurer</Button>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Base de connaissance"
        action={
          <div className="flex gap-2">
            <Input className="h-8 w-48" placeholder="Nom du document.pdf" value={newDoc} onChange={(e) => setNewDoc(e.target.value)} />
            <Button size="sm" onClick={() => { const n = newDoc || `Document ${docs.length + 1}.pdf`; setDocs((p) => [...p, { id: `K${Date.now()}`, name: n, size: "0.8 Mo", active: true }]); setNewDoc(""); toast.success(`${n} ajouté à la base`); }}>
              <Plus className="h-4 w-4" /> Ajouter document
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-md border px-3 py-2">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.name}</span>
              <span className="text-xs text-muted-foreground">{d.size}</span>
              <Switch checked={d.active} onCheckedChange={(v) => setDocs((p) => p.map((x) => (x.id === d.id ? { ...x, active: v } : x)))} />
              <Button variant="ghost" size="icon" onClick={() => toast.info(`Aperçu de ${d.name} (simulation)`)}><Eye className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => { setDocs((p) => p.filter((x) => x.id !== d.id)); toast.success(`${d.name} supprimé`); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {docs.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun document dans la base.</p>}
        </div>
      </SectionCard>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div className="space-y-2"><Label>Ton</Label>
                <Select value={state[edit]!.tone} onValueChange={(v) => setState((p) => ({ ...p, [edit]: { ...p[edit]!, tone: v } }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Professionnel", "Direct", "Pédagogique", "Commercial"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Instructions</Label>
                <Textarea rows={4} value={state[edit]!.instructions} onChange={(e) => setState((p) => ({ ...p, [edit]: { ...p[edit]!, instructions: e.target.value } }))} />
              </div>
              <p className="text-xs text-muted-foreground">Base de connaissance : {docs.filter((d) => d.active).map((d) => d.name).join(", ")}</p>
            </div>
          )}
          <DialogFooter><Button onClick={() => { setEdit(null); toast.success("Assistant mis à jour"); }}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
