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
  SupplierRating,
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
  ratings: SupplierRating[];

  transferToDealer: (productId: string, dealerId: string, qty: number) => void;
  adjustStock: (productId: string, qty: number, reason: string) => void;
  createOrder: (dealerId: string, lines: OrderLine[], opts?: { status?: OrderStatus; silent?: boolean }) => string;
  createSupply: (s: { productId: string; qty: number; supplierId: string; mode: "Importation" | "Fournisseur"; unitPrice: number; delayDays: number }) => string;
  createInvoice: (orderId: string) => string | null;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  rateSupplier: (r: Omit<SupplierRating, "id" | "date">) => void;
  escalateConversation: (conversationId: string, subject: string, type: Ticket["type"]) => void;
  advanceOrder: (orderId: string, status: OrderStatus) => void;
  confirmReception: (orderId: string) => void;
  advanceImport: (importId: string) => void;
  createTicket: (t: Omit<Ticket, "id" | "messages" | "notes" | "escalated" | "status" | "date">, escalated?: boolean) => void;
  submitClaim: (t: Omit<Ticket, "id" | "messages" | "notes" | "escalated" | "status" | "date" | "assignee" | "parts">) => string;
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
  "Commande reçue",
  "Validée",
  "Préparation",
  "Prête",
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
  const [ratings, setRatings] = useState<SupplierRating[]>([
    { id: "R1", supplierId: "S9", scores: { Qualité: 5, Prix: 5, Délai: 3, Communication: 4, Conformité: 5, Service: 4, Fiabilité: 5 }, comment: "Très bonne qualité, délais maritimes longs.", author: "Imane Tazi", date: mock.imports[0]!.orderDate },
    { id: "R2", supplierId: "S10", scores: { Qualité: 4, Prix: 4, Délai: 5, Communication: 5, Conformité: 5, Service: 5, Fiabilité: 5 }, comment: "Réactif, idéal pour les urgences batteries.", author: "Yassine Berrada", date: mock.imports[1]!.orderDate },
    { id: "R3", supplierId: "S2", scores: { Qualité: 3, Prix: 4, Délai: 2, Communication: 3, Conformité: 3, Service: 3, Fiabilité: 3 }, comment: "Retards répétés au dernier trimestre.", author: "Mehdi Naciri", date: mock.imports[2]!.orderDate },
  ]);

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
      ratings,

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

      createOrder: (dealerId, lines, opts) => {
        const id = `CMD-${1100 + orders.length}`;
        const now = new Date().toISOString();
        const status: OrderStatus = opts?.status ?? "Commande reçue";
        setOrders((prev) => [
          {
            id,
            dealerId,
            date: now,
            lines,
            status,
            expectedDelivery: new Date(Date.now() + 7 * 864e5).toISOString(),
            history: [{ status: "Commande reçue", date: now }, ...(status !== "Commande reçue" ? [{ status, date: now }] : [])],
          },
          ...prev,
        ]);
        if (!opts?.silent) toast.success(`Commande ${id} envoyée à SINOPHRA`);
        return id;
      },

      createSupply: ({ productId, qty, supplierId, mode, unitPrice, delayDays }) => {
        const supplier = mock.suppliers.find((x) => x.id === supplierId);
        const id = `${mode === "Importation" ? "IMP" : "APP"}-${2026}${300 + imports.length}`;
        const now = new Date().toISOString();
        setImports((prev) => [
          {
            id,
            supplierId,
            orderDate: now,
            origin: supplier?.country === "Chine" ? "Ningbo, Chine" : (supplier?.country ?? "—"),
            lines: [{ productId, qty, unitPrice }],
            status: "Commandé",
            eta: new Date(Date.now() + delayDays * 864e5).toISOString(),
            semiAssembled: false,
            mode,
            timeline: [{ status: "Commandé", date: now }],
          },
          ...prev,
        ]);
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, inTransit: p.inTransit + qty } : p)));
        toast.success(mode === "Importation" ? "Dossier d'importation créé avec succès." : `Commande fournisseur ${id} envoyée à ${supplier?.name ?? ""}.`);
        return id;
      },

      createInvoice: (orderId) => {
        const order = orders.find((o) => o.id === orderId);
        if (!order) return null;
        const existing = invoices.find((i) => i.orderId === orderId);
        if (existing) {
          toast.info(`Facture ${existing.id} déjà rattachée à cette commande`);
          return existing.id;
        }
        const ht = order.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
        const id = `FAC-${2026}${200 + invoices.length}`;
        setInvoices((prev) => [
          {
            id,
            dealerId: order.dealerId,
            orderId,
            amount: Math.round(ht * 1.2),
            date: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 864e5).toISOString(),
            status: "Envoyée",
          },
          ...prev,
        ]);
        toast.success(`Facture ${id} créée et rattachée à ${orderId}`);
        return id;
      },

      updateInvoice: (id, patch) => {
        setInvoices((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
        toast.success(`Facture ${id} mise à jour`);
      },

      rateSupplier: (r) => {
        setRatings((prev) => [{ ...r, id: nextId("R"), date: new Date().toISOString() }, ...prev]);
        toast.success("Évaluation enregistrée — analyse IA mise à jour");
      },

      escalateConversation: (conversationId, subject, type) => {
        const conv = conversations.find((c) => c.id === conversationId);
        if (!conv) return;
        const customer = mock.customers.find((c) => c.dealerId === conv.dealerId && c.name === conv.customerName) ??
          mock.customers.find((c) => c.dealerId === conv.dealerId)!;
        const id = nextId("SAV");
        setTickets((prev) => [
          {
            id,
            dealerId: conv.dealerId,
            customerId: customer.id,
            productId: customer.productId,
            serial: customer.serial,
            subject,
            priority: "Haute",
            status: "Nouveau",
            date: new Date().toISOString(),
            escalated: true,
            type,
            assignee: "Sofia Kabbaj",
            warranty: true,
            parts: [],
            messages: conv.messages.map((m) => ({ from: m.from === "client" ? ("Client" as const) : ("Revendeur" as const), text: m.text, date: m.at })),
            notes: [`Créé depuis la conversation ${conv.id}`],
          },
          ...prev,
        ]);
        toast.success(`Réclamation ${id} escaladée à SINOPHRA`);
      },

      advanceOrder: (orderId, status) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, status, history: [...o.history, { status, date: new Date().toISOString() }] }
              : o,
          ),
        );
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

      createTicket: (t, escalated = false) => {
        const id = nextId("SAV");
        setTickets((prev) => [
          { ...t, id, status: "Nouveau", escalated, date: new Date().toISOString(), messages: [], notes: [] },
          ...prev,
        ]);
        toast.success(`Ticket ${id} créé`);
      },

      submitClaim: (t) => {
        const id = `REC-2026-${String(tickets.filter((x) => x.id.startsWith("REC-")).length + 1).padStart(3, "0")}`;
        setTickets((prev) => [
          { ...t, id, status: "Envoyée à SINOPHRA", escalated: true, assignee: "Sofia Kabbaj", parts: [], date: new Date().toISOString(), messages: t.description ? [{ from: "Revendeur", text: t.description, date: new Date().toISOString() }] : [], notes: [] },
          ...prev,
        ]);
        toast.success(`Réclamation ${id} envoyée à SINOPHRA`);
        return id;
      },

      updateTicket: (id, patch) => {
        setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
        if (patch.escalated) toast.success("Réclamation escaladée à SINOPHRA");
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
    [session, products, dealerStock, orders, moves, imports, tickets, invoices, conversations, ratings, addMove, bumpDealerStock, login],
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
