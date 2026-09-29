import { daysAgo, daysAhead } from "./format";
import type {
  Conversation,
  Customer,
  Dealer,
  DealerOrder,
  DealerStockLine,
  ImportFile,
  Invoice,
  OrderStatus,
  Product,
  StockMove,
  Supplier,
  Ticket,
} from "./types";

/** Deterministic pseudo-random so the demo data is stable between renders. */
let seed = 42;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)] as T;
const at = <T,>(arr: T[], i: number) => arr[i % arr.length] as T;

const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

const motoDefs: [string, string, string, number, number, string][] = [
  ["CR50", "Sinophra", "Cross", 50, 11900, "oklch(0.575 0.215 27.5)"],
  ["V10", "Sinophra", "Urbaine", 110, 13500, "oklch(0.3 0.02 255)"],
  ["X-Ride 125", "Motopark", "Sport", 125, 18900, "oklch(0.72 0.15 62)"],
  ["Urban 150", "Motopark", "Urbaine", 150, 21500, "oklch(0.62 0.09 220)"],
  ["Trail 250", "Zongshen", "Trail", 250, 34900, "oklch(0.5 0.12 145)"],
  ["Scooter City", "Haojue", "Scooter", 125, 15900, "oklch(0.6 0.05 300)"],
  ["Scooter Max 150", "Haojue", "Scooter", 150, 19900, "oklch(0.55 0.07 330)"],
  ["Enduro 300", "Zongshen", "Trail", 300, 42900, "oklch(0.45 0.13 120)"],
  ["Street 200", "Sinophra", "Urbaine", 200, 26500, "oklch(0.4 0.03 255)"],
  ["Cargo 150", "Lifan", "Utilitaire", 150, 23900, "oklch(0.65 0.1 85)"],
  ["Tricycle Pro", "Lifan", "Utilitaire", 200, 38900, "oklch(0.58 0.08 60)"],
  ["Sport R 400", "Sinophra", "Sport", 400, 58900, "oklch(0.52 0.2 25)"],
  ["Mini Bike 70", "Sinophra", "Cross", 70, 8900, "oklch(0.68 0.13 45)"],
  ["Retro 125", "Motopark", "Urbaine", 125, 17900, "oklch(0.5 0.06 200)"],
  ["E-Scoot 2000W", "Motopark", "Électrique", 0, 24900, "oklch(0.6 0.14 170)"],
];

const pieceDefs: [string, string, string, number][] = [
  ["Casque intégral MX", "Casques", "Motopark", 690],
  ["Casque jet urbain", "Casques", "Motopark", 420],
  ["Pneu 90/90-18", "Pneus", "Deli", 340],
  ["Pneu 120/70-17", "Pneus", "Deli", 520],
  ["Pneu cross 110/100", "Pneus", "Deli", 610],
  ["Batterie BTX7", "Batteries", "Yuasa", 380],
  ["Batterie BTX9", "Batteries", "Yuasa", 450],
  ["Batterie gel 12V", "Batteries", "Yuasa", 520],
  ["Plaquettes avant CR50", "Freinage", "Sinophra", 160],
  ["Plaquettes arrière V10", "Freinage", "Sinophra", 145],
  ["Disque de frein 240mm", "Freinage", "Sinophra", 390],
  ["Huile moteur 10W40 1L", "Lubrifiants", "Motul", 95],
  ["Huile 4T semi-synth 4L", "Lubrifiants", "Motul", 320],
  ["Filtre à huile universel", "Filtration", "Sinophra", 55],
  ["Filtre à air CR50", "Filtration", "Sinophra", 75],
  ["Kit chaîne X-Ride", "Transmission", "DID", 480],
  ["Bougie NGK CR7", "Moteur", "NGK", 45],
  ["Rétroviseur chromé", "Accessoires", "Motopark", 120],
  ["Top case 40L", "Accessoires", "Motopark", 690],
  ["Gants cuir racing", "Accessoires", "Motopark", 290],
];

export const products: Product[] = [
  ...motoDefs.map(([name, brand, category, cc, price, color], i) => ({
    id: `M${i + 1}`,
    ref: `MT-${1000 + i * 7}`,
    name,
    brand,
    kind: "moto" as const,
    category,
    cc,
    priceDealer: price,
    pricePublic: Math.round(price * 1.22),
    centralStock: int(0, 90),
    reserved: int(0, 12),
    inTransit: int(0, 40),
    minThreshold: 10,
    lastIn: daysAgo(int(1, 40)),
    lastOut: daysAgo(int(0, 20)),
    color,
    specs: [
      { label: "Cylindrée", value: cc ? `${cc} cc` : "Électrique 2000W" },
      { label: "Démarrage", value: "Électrique / kick" },
      { label: "Freinage", value: "Disque avant / tambour arrière" },
      { label: "Réservoir", value: "12 L" },
      { label: "Garantie", value: "12 mois" },
    ],
  })),
  ...pieceDefs.map(([name, category, brand, price], i) => ({
    id: `P${i + 1}`,
    ref: `PC-${2000 + i * 5}`,
    name,
    brand,
    kind: "piece" as const,
    category,
    priceDealer: price,
    pricePublic: Math.round(price * 1.35),
    centralStock: int(0, 320),
    reserved: int(0, 30),
    inTransit: int(0, 150),
    minThreshold: 40,
    lastIn: daysAgo(int(1, 30)),
    lastOut: daysAgo(int(0, 15)),
    color: "oklch(0.45 0.02 255)",
    specs: [
      { label: "Catégorie", value: category },
      { label: "Marque", value: brand },
      { label: "Conditionnement", value: "Unité" },
      { label: "Garantie", value: "6 mois" },
    ],
  })),
];

export const dealers: Dealer[] = [
  ["D1", "Motopark Casablanca Centre", "Casablanca", "Youssef Benali", "0661 24 18 90", "Bd Zerktouni, Casablanca"],
  ["D2", "Motopark Ain Sebaâ", "Casablanca", "Salma Oukacha", "0662 77 41 03", "Zone industrielle Ain Sebaâ"],
  ["D3", "Atlas Moto Marrakech", "Marrakech", "Hicham Aït Ali", "0663 55 12 74", "Av. Mohammed V, Guéliz"],
  ["D4", "Rif Moto Tanger", "Tanger", "Nadia Bouhaddou", "0664 33 87 21", "Rue de Fès, Tanger"],
  ["D5", "Speed Moto Agadir", "Agadir", "Karim El Idrissi", "0665 19 62 48", "Av. Hassan II, Agadir"],
  ["D6", "Fès Moto Distribution", "Fès", "Rachid Lamrani", "0666 90 35 17", "Route de Sefrou, Fès"],
].map(([id, name, city, manager, phone, address]: string[]) => ({
  id: id!,
  name: name!,
  city: city!,
  manager: manager!,
  phone: phone!,
  email: `${id!.toLowerCase()}@motopark.ma`,
  address: address!,

  status: "Actif" as const,
  since: daysAgo(int(200, 900)),
  monthRevenue: int(180, 920) * 1000,
}));

export const suppliers: Supplier[] = [
  ["S1", "Zongshen Industrial", "Chine", "Li Wei", ["Motos", "Moteurs"]],
  ["S2", "Haojue Motor Co.", "Chine", "Chen Hua", ["Scooters"]],
  ["S3", "Lifan Power", "Chine", "Zhang Min", ["Utilitaires", "Tricycles"]],
  ["S4", "Deli Tyres", "Chine", "Wang Jun", ["Pneus"]],
  ["S5", "Yuasa Batteries MENA", "Turquie", "Emre Yilmaz", ["Batteries"]],
  ["S6", "Motul Distribution", "France", "Claire Dubois", ["Lubrifiants"]],
  ["S7", "NGK Parts", "Espagne", "Pablo Ruiz", ["Moteur", "Filtration"]],
  ["S8", "Shineray Group", "Chine", "Liu Yang", ["Motos", "Pièces"]],
  ["S9", "Guangzhou Moto Manufacturing", "Chine", "Huang Bo", ["Motos", "Cross", "Pièces", "Batteries"]],
  ["S10", "Atlas Parts Maroc", "Maroc", "Omar Filali", ["Batteries", "Freinage", "Pneus", "Accessoires", "Casques", "Transmission", "Filtration", "Pièces"]],
].map(([id, name, country, contact, categories]) => ({
  id: id as string,
  name: name as string,
  country: country as string,
  contact: contact as string,
  email: `contact@${(name as string).split(" ")[0]!.toLowerCase()}.com`,
  categories: categories as string[],
  orders: int(4, 28),
  amount: int(900, 7400) * 1000,
  avgDelay: int(18, 62),
  status: "Actif" as const,
  incidents: int(0, 4),
  onTimeRate: int(62, 98),
}));

const motos = products.filter((p) => p.kind === "moto");
const pieces = products.filter((p) => p.kind === "piece");

export const dealerStock: DealerStockLine[] = dealers.flatMap((d) => [
  ...motos.slice(0, 10).map((p) => ({
    dealerId: d.id,
    productId: p.id,
    available: int(0, 16),
    reserved: int(0, 3),
    sold: int(2, 40),
    minThreshold: 4,
  })),
  ...pieces.slice(0, 14).map((p) => ({
    dealerId: d.id,
    productId: p.id,
    available: int(0, 60),
    reserved: int(0, 6),
    sold: int(5, 120),
    minThreshold: 15,
  })),
]);

const orderStatuses: OrderStatus[] = [
  "Commande reçue",
  "Validée",
  "Préparation",
  "Expédiée",
  "Livrée",
  "Réception confirmée",
];

export const dealerOrders: DealerOrder[] = Array.from({ length: 26 }, (_, i) => {
  const dealer = pick(dealers);
  const status = i < 4 ? "Commande reçue" : pick(orderStatuses);
  const lines = Array.from({ length: int(1, 4) }, () => {
    const p = pick(products);
    return { productId: p.id, qty: p.kind === "moto" ? int(1, 8) : int(5, 40), unitPrice: p.priceDealer };
  });
  const date = daysAgo(int(1, 75));
  return {
    id: `CMD-${1001 + i}`,
    dealerId: dealer.id,
    date,
    lines,
    status,
    expectedDelivery: daysAhead(int(-20, 18)),
    history: [{ status: "Commande reçue", date }],
  };
});

export const stockMoves: StockMove[] = Array.from({ length: 48 }, (_, i) => {
  const p = pick(products);
  const type = pick([
    "Réception fournisseur",
    "Assemblage terminé",
    "Transfert revendeur",
    "Retour",
    "Ajustement",
  ] as const);
  const dealer = pick(dealers);
  return {
    id: `MV-${5000 + i}`,
    date: daysAgo(int(0, 60)),
    type,
    productId: p.id,
    qty: p.kind === "moto" ? int(1, 20) : int(10, 120),
    from: type === "Transfert revendeur" ? "Stock central" : type === "Réception fournisseur" ? "Fournisseur" : "Atelier",
    to: type === "Transfert revendeur" ? dealer.name : "Stock central",
    ...(type === "Transfert revendeur" ? { dealerId: dealer.id } : {}),
    ref: `REF-${8000 + i}`,
  };
}).sort((a, b) => b.date.localeCompare(a.date));

export const imports: ImportFile[] = Array.from({ length: 10 }, (_, i) => {
  const supplier = pick(suppliers);
  const statuses: ImportFile["status"][] = [
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
  const status = at(statuses, i);
  const lines = Array.from({ length: int(2, 4) }, () => {
    const p = pick(motos);
    return { productId: p.id, qty: int(15, 90), unitPrice: Math.round(p.priceDealer * 0.62) };
  });
  const orderDate = daysAgo(int(20, 120));
  return {
    id: `IMP-${2026}${10 + i}`,
    supplierId: supplier.id,
    orderDate,
    origin: supplier.country === "Chine" ? "Ningbo, Chine" : supplier.country,
    lines,
    status,
    eta: daysAhead(int(-30, 45)),
    semiAssembled: i % 2 === 0,
    mode: "Importation" as const,
    timeline: [{ status: "Commandé", date: orderDate }],
  };
});

const firstNames = ["Ahmed", "Fatima", "Youssef", "Salma", "Omar", "Meryem", "Hamza", "Khadija", "Reda", "Imane", "Anas", "Sofia", "Mehdi", "Nawal", "Yassine", "Hind", "Bilal", "Loubna", "Adil", "Ghita"];
const lastNames = ["Alaoui", "Bennani", "Chraibi", "Daoudi", "El Amrani", "Fassi", "Ghali", "Haddad", "Idrissi", "Jaouhari", "Kabbaj", "Lahlou", "Mansouri", "Naciri", "Ouazzani", "Rahmani", "Sabri", "Tazi", "Ziani", "Berrada"];

export const customers: Customer[] = dealers.flatMap((d, di) =>
  Array.from({ length: 20 }, (_, i) => {
    const p = pick(motos);
    const purchase = daysAgo(int(10, 500));
    const w = new Date(purchase);
    w.setMonth(w.getMonth() + 12);
    return {
      id: `C${di + 1}-${i + 1}`,
      dealerId: d.id,
      name: `${at(firstNames, i + di)} ${at(lastNames, i * 3 + di)}`,
      phone: `06${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
      city: d.city,
      productId: p.id,
      serial: `VIN${int(100000, 999999)}`,
      purchaseDate: purchase,
      warrantyUntil: w.toISOString(),
      lastContact: daysAgo(int(0, 60)),
    };
  }),
);

const subjects = [
  "Problème de démarrage",
  "Bruit anormal moteur",
  "Freins peu réactifs",
  "Batterie déchargée rapidement",
  "Fuite d'huile",
  "Tableau de bord défectueux",
  "Vibrations à haute vitesse",
  "Pièce manquante à la livraison",
];

export const tickets: Ticket[] = Array.from({ length: 16 }, (_, i) => {
  const dealer = at(dealers, i);
  const customer = at(customers.filter((c) => c.dealerId === dealer.id), i);
  const status = pick(["Nouveau", "Diagnostic", "En analyse", "Pièce requise", "En traitement", "Résolu"] as const);
  return {
    id: `SAV-${3001 + i}`,
    dealerId: dealer.id,
    customerId: customer.id,
    productId: customer.productId,
    serial: customer.serial,
    subject: at(subjects, i),

    priority: pick(["Basse", "Normale", "Haute", "Critique"] as const),
    status,
    date: daysAgo(int(0, 45)),
    escalated: i % 3 === 0,
    type: at(["SAV", "Garantie", "Pièce", "Produit", "Livraison", "Facturation", "SAV", "Autre"] as const, i),
    assignee: at(["Sofia Kabbaj", "Imane Tazi", "Mehdi Naciri"], i),
    warranty: rnd() > 0.3,
    parts: i % 2 === 0 ? ["Batterie BTX7"] : [],
    messages: [
      { from: "Client" as const, text: "Bonjour, ma moto présente un souci depuis hier.", date: daysAgo(int(1, 10)) },
      { from: "Revendeur" as const, text: "Merci, nous ouvrons un diagnostic aujourd'hui.", date: daysAgo(int(0, 1)) },
    ],
    notes: ["Vérifier historique d'entretien."],
  };
});

export const invoices: Invoice[] = Array.from({ length: 30 }, (_, i) => {
  const order = at(dealerOrders, i);
  const amount = order.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const date = daysAgo(int(2, 90));
  const due = new Date(date);
  due.setDate(due.getDate() + 30);
  return {
    id: `FAC-${2026}${100 + i}`,
    dealerId: order.dealerId,
    orderId: order.id,
    amount,
    date,
    dueDate: due.toISOString(),
    status: pick(["Brouillon", "Envoyée", "Payée", "Payée", "En retard"] as const),
  };
});

export const conversations: Conversation[] = dealers.flatMap((d, di) =>
  Array.from({ length: 4 }, (_, i) => {
    const topic = pick([
      "Disponibilité moto",
      "Demande prix",
      "SAV",
      "Garantie",
      "Commande",
      "Pièces détachées",
    ] as const);
    const name = `${firstNames[(i * 5 + di) % firstNames.length]} ${lastNames[(i * 7 + di) % lastNames.length]}`;
    return {
      id: `CV-${di + 1}${i + 1}`,
      dealerId: d.id,
      customerName: name,
      phone: `06${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`,
      topic,
      unread: i === 0 ? int(1, 3) : 0,
      lastAt: daysAgo(i),
      messages: [
        { from: "client" as const, text: `Bonjour, je voulais des infos : ${topic.toLowerCase()}.`, at: daysAgo(i + 1) },
        { from: "dealer" as const, text: "Bonjour, avec plaisir. Je vérifie tout de suite.", at: daysAgo(i) },
        { from: "client" as const, text: "Super, merci beaucoup !", at: daysAgo(i) },
      ],
    };
  }),
);

export const salesSeries = [
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
].map((m, i) => ({
  month: m,
  ca: 2200000 + i * 210000 + int(-180000, 240000),
  commandes: 38 + i * 4 + int(-6, 9),
}));

/* ---- Demo scenario overrides (keep story coherent) ---- */
const setStock = (name: string, stock: number, transit = 0) => {
  const p = products.find((x) => x.name === name);
  if (p) {
    p.centralStock = stock;
    p.inTransit = transit;
  }
};
setStock("CR50", 6);
setStock("Batterie BTX7", 4);
setStock("Plaquettes avant CR50", 22);
setStock("Pneu cross 110/100", 0);
setStock("V10", 48);
const rif = dealerStock.find((l) => l.dealerId === "D4" && l.productId === "M1");
if (rif) rif.available = 2;
dealers[0]!.monthRevenue = 420000;
dealers[3]!.monthRevenue = 198000;
const s10 = suppliers.find((s) => s.id === "S10")!;
Object.assign(s10, { avgDelay: 4, onTimeRate: 94, incidents: 0, orders: 22 });
const s9 = suppliers.find((s) => s.id === "S9")!;
Object.assign(s9, { avgDelay: 32, onTimeRate: 96, incidents: 1, orders: 18 });
imports.push(
  {
    id: "APP-202601",
    supplierId: "S10",
    orderDate: daysAgo(3),
    origin: "Casablanca, Maroc",
    lines: [{ productId: "P7", qty: 30, unitPrice: 310 }],
    status: "Expédié",
    eta: daysAhead(2),
    semiAssembled: false,
    mode: "Fournisseur",
    timeline: [{ status: "Commandé", date: daysAgo(3) }],
  },
  {
    id: "APP-202602",
    supplierId: "S7",
    orderDate: daysAgo(6),
    origin: "Espagne",
    lines: [{ productId: "P17", qty: 200, unitPrice: 30 }],
    status: "En préparation",
    eta: daysAhead(9),
    semiAssembled: false,
    mode: "Fournisseur",
    timeline: [{ status: "Commandé", date: daysAgo(6) }],
  },
);
