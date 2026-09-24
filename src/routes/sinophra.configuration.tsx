import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionCard, StatusBadge } from "@/components/ui-kit";

export const Route = createFileRoute("/sinophra/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration & utilisateurs — SINOPHRA" },
      { name: "description", content: "Informations entreprise, seuils, notifications, rôles et connecteurs." },
      { property: "og:title", content: "Configuration & utilisateurs — SINOPHRA" },
      { property: "og:description", content: "Paramétrage de la plateforme SINOPHRA." },
    ],
  }),
  component: ConfigPage,
});

const USERS = [
  ["Yassine Berrada", "Administrateur SINOPHRA", "y.berrada@sinophra.ma"],
  ["Imane Tazi", "Responsable Stock", "i.tazi@sinophra.ma"],
  ["Mehdi Naciri", "Responsable Commercial", "m.naciri@sinophra.ma"],
  ["Sofia Kabbaj", "Responsable SAV", "s.kabbaj@sinophra.ma"],
];

function ConfigPage() {
  return (
    <>
      <PageHeader title="Configuration" subtitle="Entreprise, seuils, utilisateurs, rôles et connecteurs." />

      <Tabs defaultValue="entreprise">
        <TabsList className="flex-wrap">
          <TabsTrigger value="entreprise">Entreprise</TabsTrigger>
          <TabsTrigger value="seuils">Seuils & notifications</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs & rôles</TabsTrigger>
          <TabsTrigger value="connecteurs">Connecteurs</TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise" className="pt-4">
          <SectionCard title="Informations entreprise">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Raison sociale</Label><Input defaultValue="SINOPHRA SARL" /></div>
              <div className="space-y-2"><Label>ICE</Label><Input defaultValue="002458796000041" /></div>
              <div className="space-y-2"><Label>Siège</Label><Input defaultValue="Zone industrielle Ain Sebaâ, Casablanca" /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input defaultValue="+212 522 66 12 00" /></div>
            </div>
            <Button className="mt-4" onClick={() => toast.success("Paramètres enregistrés")}>Enregistrer</Button>
          </SectionCard>
        </TabsContent>

        <TabsContent value="seuils" className="pt-4">
          <SectionCard title="Seuils par défaut et notifications">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Seuil minimum motos</Label><Input type="number" defaultValue={10} /></div>
              <div className="space-y-2"><Label>Seuil minimum pièces</Label><Input type="number" defaultValue={40} /></div>
            </div>
            <div className="mt-4 space-y-3">
              {["Alerte rupture de stock", "Nouvelle commande revendeur", "Ticket SAV escaladé", "Retard fournisseur"].map((n) => (
                <div key={n} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">{n}</span>
                  <Switch defaultChecked onCheckedChange={() => toast.success("Préférence mise à jour")} />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="users" className="pt-4">
          <SectionCard title="Utilisateurs" action={<Button size="sm" onClick={() => toast.success("Invitation envoyée")}>Inviter</Button>}>
            <div className="space-y-2">
              {USERS.map(([name, role, email]) => (
                <div key={email} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2 sm:flex sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                  <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs">{role}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="connecteurs" className="pt-4">
          <SectionCard title="Connecteurs">
            <div className="grid gap-3 sm:grid-cols-3">
              {["Odoo", "Shopify", "WhatsApp"].map((c) => (
                <div key={c} className="rounded-lg border p-4">
                  <p className="font-medium">{c}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Non connecté — Démonstration</p>
                  <StatusBadge status="En attente" className="mt-3" />
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => toast.info(`Connexion ${c} indisponible en démonstration`)}>
                    Configurer
                  </Button>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </>
  );
}
