import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";

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

