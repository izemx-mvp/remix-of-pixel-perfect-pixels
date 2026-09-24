import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Bike, Building2, ShieldCheck, Store, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SINOPHRA · MOTOPARK — Plateforme de gestion moto" },
      {
        name: "description",
        content:
          "Plateforme de démonstration SINOPHRA : importations, stock central, réseau de revendeurs Motopark, SAV et agents IA.",
      },
      { property: "og:title", content: "SINOPHRA · MOTOPARK — Plateforme de gestion moto" },
      {
        property: "og:description",
        content: "Importations, stock, revendeurs, commandes, SAV et analytics — démonstration commerciale.",
      },
    ],
  }),
  component: LoginPage,
});

const ROLES: { role: Role; icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { role: "Administrateur SINOPHRA", icon: ShieldCheck, desc: "Accès complet à la plateforme" },
  { role: "Responsable Stock", icon: Building2, desc: "Stock central, importations" },
  { role: "Responsable Commercial", icon: Bike, desc: "Réseau, commandes, facturation" },
  { role: "Responsable SAV", icon: Wrench, desc: "Tickets et garanties réseau" },
  { role: "Revendeur", icon: Store, desc: "Espace Motopark revendeur" },
];

function LoginPage() {
  const { login, dealers } = useStore();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("Administrateur SINOPHRA");
  const [dealerId, setDealerId] = useState(dealers[0]!.id);

  const submit = () => {
    login(role, dealerId);
    navigate({ to: role === "Revendeur" ? "/revendeur" : "/sinophra" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between p-12 lg:flex" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Bike className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-primary-foreground">SINOPHRA</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl leading-tight font-semibold text-primary-foreground">
            Du fournisseur au client final, un seul pilotage.
          </h2>
          <p className="mt-4 text-sm text-primary-foreground/70">
            Importations, assemblage, stock central, réseau de revendeurs Motopark, SAV et agents IA — réunis dans une
            plateforme unique.
          </p>
          <div className="mt-8 flex flex-wrap gap-2 text-xs text-primary-foreground/70">
            {["Importation", "Stock central", "Revendeurs", "Clients", "SAV"].map((s) => (
              <span key={s} className="rounded-full border border-primary-foreground/20 px-3 py-1">
                {s}
              </span>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/50">Version démonstration — données simulées</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Connexion</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choisissez un profil de démonstration.</p>
          </div>

          <div className="space-y-2">
            {ROLES.map((r) => (
              <Card
                key={r.role}
                onClick={() => setRole(r.role)}
                className={cn(
                  "cursor-pointer py-0 shadow-none transition-all hover:border-primary/40",
                  role === r.role && "border-primary ring-1 ring-primary/30",
                )}
              >
                <CardContent className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-md",
                      role === r.role ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                    )}
                  >
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.role}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {role === "Revendeur" && (
            <div className="space-y-2">
              <Label>Revendeur</Label>
              <Select value={dealerId} onValueChange={setDealerId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input type="password" defaultValue="demo1234" readOnly />
          </div>

          <Button className="w-full" size="lg" onClick={submit}>
            Se connecter
          </Button>
        </div>
      </div>
    </div>
  );
}
