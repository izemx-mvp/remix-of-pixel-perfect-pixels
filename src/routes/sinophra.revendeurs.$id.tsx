import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, KpiCard, PageHeader, StatusBadge, type Column } from "@/components/ui-kit";
import { Info } from "@/components/Catalogue";
import { orderAmount } from "@/routes/sinophra.commandes";
import { mad, num, shortDate } from "@/lib/format";
import { stockStatus, useStore } from "@/lib/store";
import type { Customer, DealerOrder, DealerStockLine, Invoice, Ticket } from "@/lib/types";

export const Route = createFileRoute("/sinophra/revendeurs/$id")({
  head: () => ({
    meta: [
      { title: "Fiche revendeur — SINOPHRA" },
      { name: "description", content: "Stock, commandes, clients, SAV et factures d'un revendeur du réseau." },
      { property: "og:title", content: "Fiche revendeur — SINOPHRA" },
      { property: "og:description", content: "Vue détaillée d'un point de vente Motopark." },
    ],
  }),
  component: DealerDetail,
});

function DealerDetail() {
  const { id } = useParams({ from: "/sinophra/revendeurs/$id" });
  const store = useStore();
  const navigate = useNavigate();
  const dealer = store.dealers.find((d) => d.id === id);

  if (!dealer) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Revendeur introuvable.</p>
        <Link to="/sinophra/revendeurs" className="text-sm text-primary underline">Retour au réseau</Link>
      </div>
    );
  }

  const stock = store.dealerStock.filter((l) => l.dealerId === id);
  const orders = store.orders.filter((o) => o.dealerId === id);
  const customers = store.customers.filter((c) => c.dealerId === id);
  const tickets = store.tickets.filter((t) => t.dealerId === id);
  const invoices = store.invoices.filter((i) => i.dealerId === id);
  const conversations = store.conversations.filter((c) => c.dealerId === id);
  const pname = (pid: string) => store.products.find((p) => p.id === pid)?.name ?? pid;

  const stockCols: Column<DealerStockLine & { id: string }>[] = [
    { key: "p", header: "Produit", render: (l) => pname(l.productId) },
    { key: "a", header: "Disponible", render: (l) => num(l.available), sortValue: (l) => l.available },
    { key: "r", header: "Réservé", render: (l) => num(l.reserved) },
    { key: "s", header: "Vendu", render: (l) => num(l.sold), sortValue: (l) => l.sold },
    { key: "st", header: "Statut", render: (l) => <StatusBadge status={stockStatus(l.available, l.minThreshold)} /> },
  ];

  const orderCols: Column<DealerOrder>[] = [
    { key: "id", header: "Commande", render: (o) => o.id },
    { key: "date", header: "Date", render: (o) => shortDate(o.date), sortValue: (o) => o.date },
    { key: "amount", header: "Montant", render: (o) => mad(orderAmount(o)), sortValue: (o) => orderAmount(o) },
    { key: "st", header: "Statut", render: (o) => <StatusBadge status={o.status} /> },
  ];

  const customerCols: Column<Customer>[] = [
    { key: "n", header: "Client", render: (c) => c.name, sortValue: (c) => c.name },
    { key: "p", header: "Téléphone", render: (c) => c.phone },
    { key: "m", header: "Moto", render: (c) => pname(c.productId) },
    { key: "s", header: "N° série", render: (c) => c.serial },
    { key: "d", header: "Achat", render: (c) => shortDate(c.purchaseDate), sortValue: (c) => c.purchaseDate },
  ];

  const ticketCols: Column<Ticket>[] = [
    { key: "id", header: "Ticket", render: (t) => t.id },
    { key: "s", header: "Sujet", render: (t) => t.subject },
    { key: "p", header: "Priorité", render: (t) => <StatusBadge status={t.priority} /> },
    { key: "st", header: "Statut", render: (t) => <StatusBadge status={t.status} /> },
    { key: "d", header: "Date", render: (t) => shortDate(t.date), sortValue: (t) => t.date },
  ];

  const invoiceCols: Column<Invoice>[] = [
    { key: "id", header: "Facture", render: (i) => i.id },
    { key: "a", header: "Montant", render: (i) => mad(i.amount), sortValue: (i) => i.amount },
    { key: "d", header: "Échéance", render: (i) => shortDate(i.dueDate), sortValue: (i) => i.dueDate },
    { key: "st", header: "Statut", render: (i) => <StatusBadge status={i.status} /> },
  ];

  return (
    <>
      <PageHeader
        title={dealer.name}
        subtitle={`${dealer.city} · ${dealer.manager} · ${dealer.phone}`}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate({ to: "/sinophra/revendeurs" })}>
              <ArrowLeft className="h-4 w-4" /> Réseau
            </Button>
            <Button
              onClick={() => {
                store.switchToDealer(dealer.id);
                navigate({ to: "/revendeur" });
              }}
            >
              <LogIn className="h-4 w-4" /> Accéder comme ce revendeur
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="CA du mois" value={mad(dealer.monthRevenue)} tone="accent" />
        <KpiCard label="Stock disponible" value={num(stock.reduce((s, l) => s + l.available, 0))} />
        <KpiCard label="Commandes" value={orders.length} />
        <KpiCard label="SAV ouverts" value={tickets.filter((t) => t.status !== "Résolu").length} tone="warning" />
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex-wrap">
          <TabsTrigger value="general">Vue générale</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="orders">Commandes</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="sav">SAV</TabsTrigger>
          <TabsTrigger value="invoices">Factures</TabsTrigger>
          <TabsTrigger value="conv">Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="pt-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Info label="Responsable" value={dealer.manager} />
            <Info label="Téléphone" value={dealer.phone} />
            <Info label="Email" value={dealer.email} />
            <Info label="Adresse" value={dealer.address} />
            <Info label="Partenaire depuis" value={shortDate(dealer.since)} />
            <Info label="Clients suivis" value={String(customers.length)} />
          </div>
        </TabsContent>

        <TabsContent value="stock" className="pt-4">
          <DataTable
            rows={stock.map((l) => ({ ...l, id: `${l.dealerId}-${l.productId}` }))}
            columns={stockCols}
            searchText={(l) => pname(l.productId)}
            exportName={`stock-${dealer.id}`}
          />
        </TabsContent>

        <TabsContent value="orders" className="pt-4">
          <DataTable rows={orders} columns={orderCols} searchText={(o) => o.id} exportName={`commandes-${dealer.id}`} />
        </TabsContent>

        <TabsContent value="clients" className="pt-4">
          <DataTable rows={customers} columns={customerCols} searchText={(c) => `${c.name} ${c.phone}`} exportName={`clients-${dealer.id}`} />
        </TabsContent>

        <TabsContent value="sav" className="pt-4">
          <DataTable rows={tickets} columns={ticketCols} searchText={(t) => `${t.id} ${t.subject}`} exportName={`sav-${dealer.id}`} />
        </TabsContent>

        <TabsContent value="invoices" className="pt-4">
          <DataTable rows={invoices} columns={invoiceCols} searchText={(i) => i.id} exportName={`factures-${dealer.id}`} />
        </TabsContent>

        <TabsContent value="conv" className="space-y-2 pt-4">
          {conversations.map((c) => (
            <div key={c.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{c.customerName}</p>
                <span className="text-xs text-muted-foreground">{shortDate(c.lastAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{c.topic}</p>
              <p className="mt-2 truncate text-sm">{c.messages[c.messages.length - 1]?.text}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}
