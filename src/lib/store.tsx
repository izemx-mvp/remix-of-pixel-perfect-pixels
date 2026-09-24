import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import * as mock from "./mock-data";
import type {
  Conversation,
  Dealer,
  DealerOrder,
  DealerStockLine,
  ImportFile,
  ImportStatus,
  Invoice,
  OrderLine,
  OrderStatus,
  Product,
  Role,
  StockMove,
  Ticket,
  TicketStatus,
} from "./types";

interface Session {
  role: Role;
  name: string;
  dealerId: string | null;
}

interface StoreValue {
  session: Session | null;
  login: (role: Role, dealerId?: string) => void;
  logout: () => void;
  switchToDealer: (dealerId: string) => void;
  switchToAdmin: () => void;

  products: Product[];
  dealers: Dealer[];
  suppliers: typeof mock.suppliers;
  customers: typeof mock.customers;
  dealerStock: DealerStockLine[];
  orders: DealerOrder[];
  moves: StockMove[];
  imports: ImportFile[];
  tickets: Ticket[];
  invoices: Invoice[];
  conversations: Conversation[];

  transferToDealer: (productId: string, dealerId: string, qty: number) => void;
  adjustStock: (productId: string, qty: number, reason: string) => void;
  createOrder: (dealerId: string, lines: OrderLine[]) => void;
  advanceOrder: (orderId: string, status: OrderStatus) => void;
  confirmReception: (orderId: string) => void;
  advanceImport: (importId: string) => void;
  createTicket: (t: Omit<Ticket, "id" | "messages" | "notes" | "escalated" | "status" | "date">) => void;
  updateTicket: (id: string, patch: Partial<Ticket>) => void;
  replyTicket: (id: string, from: "Revendeur" | "SINOPHRA", text: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const IMPORT_FLOW: ImportStatus[] = [
  "Commandé",
  "En préparation",
  "Expédié",
  "En transit",
  "Arrivé",
  "Réceptionné",
  "Assemblage",
  "Contrôle",
  "Disponible",
];

export const ORDER_FLOW: OrderStatus[] = [
  "Demande envoyée",
  "Validée",
  "Préparation",
  "Expédiée",
  "Livrée",
  "Réception confirmée",
];

export const TICKET_FLOW: TicketStatus[] = [
  "Nouveau",
  "Diagnostic",
  "En analyse",
  "Pièce requise",
  "En traitement",
  "Résolu",
];

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${9000 + ++counter}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>(mock.products);
  const [dealerStock, setDealerStock] = useState<DealerStockLine[]>(mock.dealerStock);
  const [orders, setOrders] = useState<DealerOrder[]>(mock.dealerOrders);
  const [moves, setMoves] = useState<StockMove[]>(mock.stockMoves);
  const [imports, setImports] = useState<ImportFile[]>(mock.imports);
  const [tickets, setTickets] = useState<Ticket[]>(mock.tickets);
  const [invoices, setInvoices] = useState<Invoice[]>(mock.invoices);
  const [conversations, setConversations] = useState<Conversation[]>(mock.conversations);

  const addMove = useCallback((m: Omit<StockMove, "id" | "date" | "ref">) => {
    setMoves((prev) => [
      { ...m, id: nextId("MV"), date: new Date().toISOString(), ref: nextId("REF") },
      ...prev,
    ]);
  }, []);

  const bumpDealerStock = useCallback((dealerId: string, productId: string, qty: number) => {
    setDealerStock((prev) => {
      const found = prev.find((l) => l.dealerId === dealerId && l.productId === productId);
      if (found) {
        return prev.map((l) =>
          l === found ? { ...l, available: Math.max(0, l.available + qty) } : l,
        );
      }
      return [...prev, { dealerId, productId, available: Math.max(0, qty), reserved: 0, sold: 0, minThreshold: 4 }];
    });
  }, []);

  const login = useCallback((role: Role, dealerId?: string) => {
    setSession({
      role,
      name: role === "Revendeur" ? "Responsable revendeur" : "Équipe SINOPHRA",
      dealerId: role === "Revendeur" ? (dealerId ?? mock.dealers[0]!.id) : null,
    });
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      session,
      login,
      logout: () => setSession(null),
      switchToDealer: (dealerId: string) =>
        setSession({ role: "Revendeur", name: "Responsable revendeur", dealerId }),
      switchToAdmin: () =>
        setSession({ role: "Administrateur SINOPHRA", name: "Équipe SINOPHRA", dealerId: null }),

      products,
      dealers: mock.dealers,
      suppliers: mock.suppliers,
      customers: mock.customers,
      dealerStock,
      orders,
      moves,
      imports,
      tickets,
      invoices,
      conversations,

      transferToDealer: (productId, dealerId, qty) => {
        const product = products.find((p) => p.id === productId);
        const dealer = mock.dealers.find((d) => d.id === dealerId);
        if (!product || !dealer) return;
        if (qty > product.centralStock) {
          toast.error("Stock central insuffisant pour ce transfert.");
          return;
        }
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, centralStock: p.centralStock - qty, lastOut: new Date().toISOString() } : p)),
        );
        bumpDealerStock(dealerId, productId, qty);
        addMove({
          type: "Transfert revendeur",
          productId,
          qty,
          from: "Stock central",
          to: dealer.name,
          dealerId,
        });
        toast.success(`${qty} × ${product.name} transférés vers ${dealer.name}`);
      },

      adjustStock: (productId, qty, reason) => {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, centralStock: Math.max(0, p.centralStock + qty) } : p)),
        );
        addMove({ type: "Ajustement", productId, qty, from: reason, to: "Stock central" });
        toast.success("Stock ajusté");
      },

      createOrder: (dealerId, lines) => {
        const id = `CMD-${1100 + orders.length}`;
        const now = new Date().toISOString();
        setOrders((prev) => [
          {
            id,
            dealerId,
            date: now,
            lines,
            status: "Demande envoyée",
            expectedDelivery: new Date(Date.now() + 7 * 864e5).toISOString(),
            history: [{ status: "Demande envoyée", date: now }],
          },
          ...prev,
        ]);
        toast.success(`Commande ${id} envoyée à SINOPHRA`);
      },

      advanceOrder: (orderId, status) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status, history: [...o.history, { status, date: new Date().toISOString() }] }
              : o,
          ),
        );
        if (status === "Validée") {
          const order = orders.find((o) => o.id === orderId);
          if (order) {
            const amount = order.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
            setInvoices((prev) => [
              {
                id: `FAC-${2026}${200 + prev.length}`,
                dealerId: order.dealerId,
                orderId,
                amount,
                date: new Date().toISOString(),
                dueDate: new Date(Date.now() + 30 * 864e5).toISOString(),
                status: "Envoyée",
              },
              ...prev,
            ]);
          }
        }
        toast.success(`Commande ${orderId} : ${status}`);
      },

      confirmReception: (orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return;
        order.lines.forEach((l) => {
          bumpDealerStock(order.dealerId, l.productId, l.qty);
          addMove({
            type: "Transfert revendeur",
            productId: l.productId,
            qty: l.qty,
            from: "Stock central",
            to: mock.dealers.find((d) => d.id === order.dealerId)?.name ?? "Revendeur",
            dealerId: order.dealerId,
          });
        });
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "Réception confirmée",
                  history: [...o.history, { status: "Réception confirmée", date: new Date().toISOString() }],
                }
              : o,
          ),
        );
        toast.success("Réception confirmée — stock mis à jour");
      },

      advanceImport: (importId) => {
        const imp = imports.find((i) => i.id === importId);
        if (!imp) return;
        const idx = IMPORT_FLOW.indexOf(imp.status);
        let next = IMPORT_FLOW[Math.min(idx + 1, IMPORT_FLOW.length - 1)]!;
        if (!imp.semiAssembled && (next === "Assemblage" || next === "Contrôle")) next = "Disponible";
        setImports((prev) =>
          prev.map((i) =>
            i.id === importId
              ? { ...i, status: next, timeline: [...i.timeline, { status: next, date: new Date().toISOString() }] }
              : i,
          ),
        );
        if (next === "Disponible") {
          imp.lines.forEach((l) => {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === l.productId
                  ? { ...p, centralStock: p.centralStock + l.qty, inTransit: Math.max(0, p.inTransit - l.qty), lastIn: new Date().toISOString() }
                  : p,
              ),
            );
            addMove({
              type: imp.semiAssembled ? "Assemblage terminé" : "Réception fournisseur",
              productId: l.productId,
              qty: l.qty,
              from: imp.origin,
              to: "Stock central",
            });
          });
          toast.success(`${importId} disponible — stock central mis à jour`);
        } else {
          toast.success(`${importId} : ${next}`);
        }
      },

      createTicket: (t) => {
        const id = nextId("SAV");
        setTickets((prev) => [
          { ...t, id, status: "Nouveau", escalated: false, date: new Date().toISOString(), messages: [], notes: [] },
          ...prev,
        ]);
        toast.success(`Ticket ${id} créé`);
      },

      updateTicket: (id, patch) => {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        if (patch.escalated) toast.success("Ticket escaladé au SAV réseau SINOPHRA");
        else if (patch.status) toast.success(`Ticket ${id} : ${patch.status}`);
      },

      replyTicket: (id, from, text) => {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, messages: [...t.messages, { from, text, date: new Date().toISOString() }] } : t,
          ),
        );
        toast.success("Réponse envoyée");
      },

      sendMessage: (conversationId, text) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  unread: 0,
                  lastAt: new Date().toISOString(),
                  messages: [...c.messages, { from: "dealer" as const, text, at: new Date().toISOString() }],
                }
              : c,
          ),
        );
      },
    }),
    [session, products, dealerStock, orders, moves, imports, tickets, invoices, conversations, addMove, bumpDealerStock, login],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export function useDealerScope() {
  const store = useStore();
  const dealerId = store.session?.dealerId ?? mock.dealers[0]!.id;
  const dealer = store.dealers.find((d) => d.id === dealerId)!;
  return {
    dealer,
    dealerId,
    stock: store.dealerStock.filter((l) => l.dealerId === dealerId),
    orders: store.orders.filter((o) => o.dealerId === dealerId),
    customers: store.customers.filter((c) => c.dealerId === dealerId),
    tickets: store.tickets.filter((t) => t.dealerId === dealerId),
    conversations: store.conversations.filter((c) => c.dealerId === dealerId),
    invoices: store.invoices.filter((i) => i.dealerId === dealerId),
    moves: store.moves.filter((m) => m.dealerId === dealerId),
  };
}

export const productById = (products: Product[], id: string) => products.find((p) => p.id === id);
export const stockStatus = (available: number, min: number) =>
  available === 0 ? "Rupture" : available <= min ? "Stock faible" : available > min * 8 ? "Surstock" : "Disponible";
