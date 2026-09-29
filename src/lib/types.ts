export type ProductKind = "moto" | "piece";

export interface Product {
  id: string;
  ref: string;
  name: string;
  brand: string;
  kind: ProductKind;
  category: string;
  cc?: number;
  priceDealer: number;
  pricePublic: number;
  centralStock: number;
  reserved: number;
  inTransit: number;
  minThreshold: number;
  lastIn: string;
  lastOut: string;
  color: string;
  specs: { label: string; value: string }[];
}

export interface Dealer {
  id: string;
  name: string;
  city: string;
  manager: string;
  phone: string;
  email: string;
  address: string;
  status: "Actif" | "Inactif" | "En attente";
  since: string;
  monthRevenue: number;
}

export interface DealerStockLine {
  dealerId: string;
  productId: string;
  available: number;
  reserved: number;
  sold: number;
  minThreshold: number;
}

export type OrderStatus =
  | "Commande reçue"
  | "Validée"
  | "Préparation"
  | "Prête"
  | "Expédiée"
  | "Livrée"
  | "Réception confirmée"
  | "Refusée";

export interface OrderLine {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface DealerOrder {
  id: string;
  dealerId: string;
  date: string;
  lines: OrderLine[];
  status: OrderStatus;
  expectedDelivery: string;
  history: { status: string; date: string }[];
}

export type StockMoveType =
  | "Réception fournisseur"
  | "Assemblage terminé"
  | "Transfert revendeur"
  | "Retour"
  | "Ajustement"
  | "Vente revendeur";

export interface StockMove {
  id: string;
  date: string;
  type: StockMoveType;
  productId: string;
  qty: number;
  from: string;
  to: string;
  dealerId?: string;
  ref: string;
}

export type ImportStatus =
  | "Commandé"
  | "En préparation"
  | "Expédié"
  | "En transit"
  | "Arrivé"
  | "Réceptionné"
  | "Assemblage"
  | "Contrôle"
  | "Disponible";

export interface ImportFile {
  id: string;
  supplierId: string;
  orderDate: string;
  origin: string;
  lines: OrderLine[];
  status: ImportStatus;
  eta: string;
  realDate?: string;
  semiAssembled: boolean;
  mode: "Importation" | "Fournisseur";
  timeline: { status: string; date: string }[];
}

export interface Supplier {
  id: string;
  name: string;
  country: string;
  contact: string;
  email: string;
  categories: string[];
  orders: number;
  amount: number;
  avgDelay: number;
  status: "Actif" | "Suspendu";
  incidents: number;
  onTimeRate: number;
}

export interface Customer {
  id: string;
  dealerId: string;
  name: string;
  phone: string;
  city: string;
  productId: string;
  serial: string;
  purchaseDate: string;
  warrantyUntil: string;
  lastContact: string;
}

export type TicketStatus =
  | "Nouveau"
  | "Diagnostic"
  | "En analyse"
  | "Pièce requise"
  | "En traitement"
  | "Résolu";

export interface Ticket {
  id: string;
  dealerId: string;
  customerId: string;
  productId: string;
  serial: string;
  subject: string;
  priority: "Basse" | "Normale" | "Haute" | "Critique";
  status: TicketStatus;
  date: string;
  escalated: boolean;
  type: TicketType;
  assignee: string;
  warranty: boolean;
  parts: string[];
  messages: { from: "Revendeur" | "SINOPHRA" | "Client"; text: string; date: string }[];
  notes: string[];
}

export interface Invoice {
  id: string;
  dealerId: string;
  orderId: string;
  amount: number;
  date: string;
  dueDate: string;
  status: "Brouillon" | "Envoyée" | "Payée" | "En retard";
}

export interface Conversation {
  id: string;
  dealerId: string;
  customerName: string;
  phone: string;
  topic: "Disponibilité moto" | "Demande prix" | "SAV" | "Garantie" | "Commande" | "Pièces détachées";
  unread: number;
  lastAt: string;
  messages: { from: "client" | "dealer"; text: string; at: string }[];
}

export type Role =
  | "Administrateur SINOPHRA"
  | "Responsable Stock"
  | "Responsable Commercial"
  | "Responsable SAV"
  | "Revendeur";

export type TicketType = "SAV" | "Garantie" | "Pièce" | "Produit" | "Livraison" | "Facturation" | "Autre";

export interface SupplierRating {
  id: string;
  supplierId: string;
  scores: Record<string, number>;
  comment: string;
  author: string;
  date: string;
}
