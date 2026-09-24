import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Boxes, Truck, TrendingUp } from "lucide-react";
import { AgentCard, AgentChat } from "@/components/AgentChat";
import { PageHeader } from "@/components/ui-kit";
import { mad, num } from "@/lib/format";
import { stockStatus, useStore } from "@/lib/store";

export const Route = createFileRoute("/sinophra/agents")({
  head: () => ({
    meta: [
      { title: "Agents IA — SINOPHRA" },
      { name: "description", content: "Agents IA stock, approvisionnement, fournisseurs et analytics conversationnel." },
      { property: "og:title", content: "Agents IA — SINOPHRA" },
      { property: "og:description", content: "Assistance IA pour le stock, les achats et l'analyse du réseau." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const { products, dealers, dealerStock, suppliers } = useStore();

  const answer = (q: string) => {
    const low = q.toLowerCase();
    if (low.includes("vend le plus") || low.includes("revendeur")) {
      const best = [...dealers].sort((a, b) => b.monthRevenue - a.monthRevenue)[0]!;
      return `${best.name} est en tête ce mois-ci avec ${mad(best.monthRevenue)} de chiffre d'affaires.`;
    }
    if (low.includes("rupture")) {
      const out = products.filter((p) => stockStatus(p.centralStock, p.minThreshold) !== "Disponible" && p.centralStock <= p.minThreshold);
      return `${out.length} référence(s) à risque : ${out.slice(0, 5).map((p) => p.name).join(", ")}.`;
    }
    if (low.includes("cr50")) {
      const p = products.find((x) => x.name === "CR50")!;
      const net = dealerStock.filter((l) => l.productId === p.id).reduce((s, l) => s + l.available, 0);
      return `CR50 : ${p.centralStock} unités au stock central et ${net} unités chez les revendeurs, soit ${p.centralStock + net} au total réseau.`;
    }
    if (low.includes("90 jours") || low.includes("dormant")) {
      const dormant = products.filter((p) => p.centralStock > p.minThreshold * 6).slice(0, 5);
      return `Stock dormant identifié sur : ${dormant.map((p) => p.name).join(", ")}. Une remise réseau de 5 % accélérerait l'écoulement.`;
    }
    if (low.includes("fournisseur")) {
      const s = [...suppliers].sort((a, b) => b.onTimeRate - a.onTimeRate)[0]!;
      return `${s.name} est le fournisseur le plus fiable : ${s.onTimeRate}% de livraisons à l'heure, délai moyen ${s.avgDelay} jours.`;
    }
    return `Sur la base des données réseau : ${num(products.reduce((s, p) => s + p.centralStock, 0))} unités en stock central, ${dealers.length} revendeurs actifs. Précisez un modèle, une ville ou une période pour une analyse ciblée.`;
  };

  return (
    <>
      <PageHeader title="Agents IA" subtitle="Quatre agents assistent les équipes SINOPHRA au quotidien." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AgentCard
          name="Agent Stock IA"
          description="Surveille le stock central et le réseau en continu."
          icon={Boxes}
          features={["Surveillance stock", "Détection de rupture", "Recommandations de réapprovisionnement", "Analyse du stock dormant"]}
        />
        <AgentCard
          name="Agent Approvisionnement IA"
          description="Anticipe les besoins et prépare les commandes."
          icon={TrendingUp}
          features={["Prévisions de ventes", "Quantités recommandées", "Suggestions de commandes fournisseurs"]}
        />
        <AgentCard
          name="Agent Fournisseur IA"
          description="Suit les commandes et les délais fournisseurs."
          icon={Truck}
          features={["Suivi des commandes", "Détection des retards", "Relances automatiques", "Résumé fournisseur"]}
        />
        <AgentCard
          name="Agent Analytics IA"
          description="Répond en langage naturel sur les données réseau."
          icon={BarChart3}
          features={["Questions libres", "Analyses croisées", "Réponses chiffrées"]}
        />
      </div>

      <AgentChat
        title="Agent Analytics IA"
        intro="Bonjour, je peux analyser les ventes, les stocks et la performance du réseau. Que souhaitez-vous savoir ?"
        suggestions={[
          "Quel revendeur vend le plus ?",
          "Quels produits risquent une rupture ?",
          "Combien de CR50 avons-nous dans tout le réseau ?",
          "Quels produits sont immobilisés depuis plus de 90 jours ?",
        ]}
        answer={answer}
      />
    </>
  );
}
