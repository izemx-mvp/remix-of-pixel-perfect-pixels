import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Boxes, MessagesSquare, ShoppingCart } from "lucide-react";
import { AiNote, KpiCard, PageHeader, SectionCard, StatusBadge } from "@/components/ui-kit";
import { dealerMetrics } from "@/lib/ai";
import { mad, num, shortDate } from "@/lib/format";
import { useDealerScope, useStore } from "@/lib/store";

export const Route = createFileRoute("/revendeur/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MOTOPARK" },
      { name: "description", content: "Vue d'ensemble du point de vente Motopark : stock, commandes et réclamations." },
      { property: "og:title", content: "Dashboard — MOTOPARK" },
      { property: "og:description", content: "Tableau de bord revendeur Motopark." },
    ],
  }),
  component: DealerDashboard,
});

function DealerDashboard() {
  const store = useStore();
  const { dealer, stock, orders, tickets, conversations } = useDealerScope();
  const navigate = useNavigate();
  const m = dealerMetrics(dealer, store);
  return (
    <>
      <PageHeader title={dealer.name} subtitle={`${dealer.city} · ${dealer.manager}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Stock local" value={num(stock.reduce((s, l) => s + l.available, 0))} icon={Boxes} onClick={() => navigate({ to: "/revendeur/catalogue" })} />
        <KpiCard label="Alertes stock" value={m.low.length} icon={AlertTriangle} tone="warning" onClick={() => navigate({ to: "/revendeur/catalogue" })} />
        <KpiCard label="Commandes en cours" value={orders.filter((o) => o.status !== "Réception confirmée" && o.status !== "Refusée").length} icon={ShoppingCart} tone="accent" onClick={() => navigate({ to: "/revendeur/commandes" })} />
        <KpiCard label="Conversations / tickets" value={conversations.reduce((s, c) => s + c.unread, 0) + tickets.filter((t) => t.status !== "Résolu").length} icon={MessagesSquare} onClick={() => navigate({ to: "/revendeur/reclamations" })} />
      </div>
      <div className="grid gap-2 md:grid-cols-3">{m.insights.map((t) => <AiNote key={t}>{t}</AiNote>)}</div>
      <SectionCard title="Dernières commandes">
        <div className="space-y-2">
          {orders.slice(0, 6).map((o) => (
            <div key={o.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">{o.id} <span className="font-normal text-muted-foreground">· {shortDate(o.date)}</span></span>
              <span>{mad(o.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))}</span>
              <StatusBadge status={o.status} />
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}
