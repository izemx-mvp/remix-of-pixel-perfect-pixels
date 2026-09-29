import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiConfigPanel } from "@/components/AdminPanels";
import { PageHeader, SectionCard } from "@/components/ui-kit";
import { useDealerScope } from "@/lib/store";

export const Route = createFileRoute("/revendeur/configuration")({
  head: () => ({
    meta: [
      { title: "Configuration — MOTOPARK" },
      { name: "description", content: "Paramètres du point de vente et assistants IA." },
      { property: "og:title", content: "Configuration — MOTOPARK" },
      { property: "og:description", content: "Configuration de l'espace revendeur." },
    ],
  }),
  component: DealerConfig,
});

function DealerConfig() {
  const { dealer } = useDealerScope();
  return (
    <>
      <PageHeader title="Configuration" subtitle="Point de vente, IA et base de connaissance." />
      <Tabs defaultValue="pdv">
        <TabsList><TabsTrigger value="pdv">Point de vente</TabsTrigger><TabsTrigger value="ia">Configuration IA & Base de connaissance</TabsTrigger></TabsList>
        <TabsContent value="pdv" className="pt-4">
          <SectionCard title="Informations">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Nom</Label><Input defaultValue={dealer.name} /></div>
              <div className="space-y-2"><Label>Adresse</Label><Input defaultValue={dealer.address} /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input defaultValue={dealer.phone} /></div>
              <div className="space-y-2"><Label>Email</Label><Input defaultValue={dealer.email} /></div>
            </div>
            <Button className="mt-4" onClick={() => toast.success("Paramètres enregistrés")}>Enregistrer</Button>
          </SectionCard>
        </TabsContent>
        <TabsContent value="ia" className="pt-4"><AiConfigPanel /></TabsContent>
      </Tabs>
    </>
  );
}
