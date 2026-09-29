/**
 * Simulated AI layer — deterministic insights computed from the frontend datasets.
 * No real model is called; everything is derived so screens stay coherent.
 */
import type { Dealer, DealerOrder, DealerStockLine, Invoice, Product, Supplier, SupplierRating, Ticket } from "./types";

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7);

/* ---------------- Products ---------------- */

export function monthlyConsumption(p: Product, dealerStock: DealerStockLine[]) {
  const sold = dealerStock.filter((l) => l.productId === p.id).reduce((s, l) => s + l.sold, 0);
  const base = Math.round(sold / 6);
  return Math.max(p.kind === "moto" ? 4 : 9, base);
}

export function productStatus(p: Product) {
  if (p.centralStock === 0 && p.inTransit > 0) return "En transit";
  if (p.centralStock === 0) return "Rupture";
  if (p.centralStock <= p.minThreshold) return "Stock faible";
  if (p.centralStock > p.minThreshold * 8) return "Surstock";
  return "Disponible";
}

export function productInsight(p: Product, dealerStock: DealerStockLine[]) {
  const cons = monthlyConsumption(p, dealerStock);
  const coverage = Math.round((p.centralStock / cons) * 30);
  const recommended = Math.max(0, Math.ceil(cons * 2 + p.minThreshold - p.centralStock - p.inTransit));
  const rotation = Math.round(((cons * 12) / Math.max(1, p.centralStock + p.reserved)) * 10) / 10;
  const recentSales = Math.round(cons * 0.9 + (hash(p.id) % 5));
  const trend = (hash(p.name) % 30) - 8;
  const status = productStatus(p);
  const alert =
    status === "Rupture"
      ? `Rupture de stock. Consommation moyenne : ${cons} unités/mois. Réapprovisionnement urgent : ${recommended} unités.`
      : status === "Stock faible"
        ? `Stock faible : ${p.centralStock} unités restantes. Consommation moyenne : ${cons} unités/mois. Réapprovisionnement recommandé.`
        : null;
  return { cons, coverage, recommended, rotation, recentSales, trend, status, alert };
}

/* ---------------- Suppliers ---------------- */

const MOTO_CATS = ["Motos", "Scooters", "Utilitaires", "Tricycles", "Cross"];

export function suppliersForProduct(p: Product, suppliers: Supplier[]) {
  const list = suppliers.filter((s) =>
    p.kind === "moto"
      ? s.categories.some((c) => MOTO_CATS.includes(c)) || s.categories.includes(p.category)
      : s.categories.includes(p.category) || s.categories.includes("Pièces"),
  );
  return list.length ? list : suppliers.slice(0, 3);
}

const LABEL = (v: number) => (v >= 90 ? "Excellent" : v >= 80 ? "Très bonne" : v >= 70 ? "Bon" : v >= 60 ? "Moyen" : "Faible");

export function supplierAnalysis(s: Supplier, ratings: SupplierRating[]) {
  const mine = ratings.filter((r) => r.supplierId === s.id);
  const avgRating = mine.length
    ? mine.reduce((sum, r) => sum + Object.values(r.scores).reduce((a, b) => a + b, 0) / Object.values(r.scores).length, 0) / mine.length
    : 3.6 + (hash(s.id) % 12) / 10;
  const quality = Math.min(99, Math.round(70 + (hash(s.name) % 25) + (avgRating - 3.5) * 4));
  const price = Math.min(99, Math.round(s.country === "Chine" ? 84 + (hash(s.id) % 14) : 70 + (hash(s.id) % 16)));
  const conformity = Math.min(99, Math.max(70, 100 - s.incidents * 3 - (hash(s.contact) % 5)));
  const reliability = s.onTimeRate;
  const lateRate = 100 - s.onTimeRate;
  const score = Math.round(quality * 0.25 + price * 0.2 + conformity * 0.2 + reliability * 0.25 + (avgRating / 5) * 100 * 0.1);
  const reasons: string[] = [];
  if (conformity >= 94) reasons.push(`Excellent taux de conformité (${conformity} %)`);
  if (reliability >= 90) reasons.push(`Respect des délais à ${reliability} %`);
  if (reliability < 75) reasons.push(`Taux de retard élevé (${lateRate} %)`);
  if (s.avgDelay <= 10) reasons.push(`Délai très court (${s.avgDelay} j)`);
  if (s.avgDelay > 40) reasons.push(`Délai moyen long (${s.avgDelay} j)`);
  if (price >= 88) reasons.push("Prix très compétitifs");
  if (s.incidents >= 3) reasons.push(`${s.incidents} incidents enregistrés`);
  if (mine.length) reasons.push(`Note interne moyenne ${avgRating.toFixed(1)}/5 (${mine.length} avis)`);
  const summary =
    score >= 85
      ? `Fournisseur fiable avec un taux de conformité de ${conformity} %${s.avgDelay > 30 ? `, mais délai moyen de ${s.avgDelay} jours à anticiper` : " et des délais maîtrisés"}.`
      : score >= 75
        ? `Fournisseur correct : ${reasons[0] ?? "performance stable"}. À surveiller sur ${reliability < 85 ? "les délais" : "les prix"}.`
        : `Performance insuffisante : ${reasons.filter((r) => /retard|incident|long/.test(r)).join(", ") || "résultats en baisse"}. Diversification recommandée.`;
  return {
    score,
    quality,
    price,
    conformity,
    reliability,
    lateRate,
    avgRating,
    reasons,
    summary,
    qualityLabel: LABEL(quality),
    priceLabel: LABEL(price),
    status: score >= 85 ? "Recommandé" : score >= 75 ? "Fiable" : "À surveiller",
  };
}

export function rankSuppliers(p: Product, suppliers: Supplier[], ratings: SupplierRating[], qty: number) {
  return suppliersForProduct(p, suppliers)
    .map((s) => {
      const a = supplierAnalysis(s, ratings);
      const urgency = qty <= 30 && s.avgDelay <= 10 ? 8 : 0;
      const why =
        s.avgDelay <= 10
          ? `Recommandé pour ce besoin grâce à son délai de livraison rapide (${s.avgDelay} j) et ${s.incidents === 0 ? "son historique sans incident" : "sa fiabilité"} sur ${p.category.toLowerCase()}.`
          : `Recommandé pour les volumes importants : prix ${a.priceLabel.toLowerCase()} et conformité de ${a.conformity} %, délai de ${s.avgDelay} jours à anticiper.`;
      return { supplier: s, analysis: a, rank: a.score + urgency, why };
    })
    .sort((a, b) => b.rank - a.rank);
}

export function recommendMode(p: Product, qty: number) {
  const value = qty * p.priceDealer;
  if (p.kind === "moto" || value > 60000 || qty >= 50)
    return {
      mode: "Importation" as const,
      reason: `Une importation est recommandée car la quantité nécessaire est élevée (${qty} u.) et le coût moyen unitaire est inférieur de 14 %.`,
    };
  return {
    mode: "Fournisseur" as const,
    reason: `Un fournisseur local est recommandé : besoin modéré (${qty} u.) et délai de livraison de quelques jours face au risque de rupture.`,
  };
}

/* ---------------- Dealers ---------------- */

export function dealerMetrics(
  d: Dealer,
  data: { dealerStock: DealerStockLine[]; orders: DealerOrder[]; tickets: Ticket[]; products: Product[] },
) {
  const stock = data.dealerStock.filter((l) => l.dealerId === d.id);
  const units = stock.reduce((s, l) => s + l.available, 0);
  const sold = stock.reduce((s, l) => s + l.sold, 0);
  const rotation = Math.round((sold / Math.max(1, units)) * 10) / 10;
  const margin = 14 + (hash(d.id) % 12);
  const orders = data.orders.filter((o) => o.dealerId === d.id).length;
  const claims = data.tickets.filter((t) => t.dealerId === d.id && t.status !== "Résolu").length;
  const growth = (hash(d.name) % 34) - 6;
  const low = stock
    .filter((l) => l.available <= l.minThreshold)
    .map((l) => ({ line: l, product: data.products.find((p) => p.id === l.productId)! }))
    .filter((x) => x.product)
    .sort((a, b) => a.line.available - b.line.available);
  const score = Math.max(40, Math.min(98, Math.round(d.monthRevenue / 12000 + margin + rotation * 3 - claims * 3 + growth / 2)));
  const profitability = margin >= 22 ? "Élevée" : margin >= 17 ? "Moyenne" : "Faible";
  const badges: string[] = [];
  if (d.monthRevenue >= 400000) badges.push("Leader");
  if (margin >= 22) badges.push("Très rentable");
  if (growth >= 15) badges.push("En progression");
  const cr50 = low.find((x) => x.product.name === "CR50");
  if (cr50 || low.filter((x) => x.product.kind === "moto").length >= 3) badges.push("Stock faible");
  if (score < 60 || claims >= 3) badges.push("À surveiller");
  const topLow = low.find((x) => x.product.kind === "moto") ?? low[0];
  const insights = [
    `Ce revendeur affiche une ${growth >= 0 ? "croissance" : "baisse"} de ${growth >= 0 ? "+" : ""}${growth} % sur 3 mois.`,
    topLow
      ? `Le stock ${topLow.product.name} sera probablement épuisé sous ${Math.max(2, topLow.line.available * 4 + 1)} jours.`
      : "Aucun risque de rupture détecté à 30 jours.",
    topLow ? `Transfert recommandé : ${Math.max(4, topLow.line.minThreshold * 2 - topLow.line.available)} unités ${topLow.product.name}.` : `Rotation stock de ${rotation}, supérieure à la moyenne réseau.`,
  ];
  return { units, sold, rotation, margin, orders, claims, growth, low, score, profitability, badges, insights, topLow };
}

/* ---------------- Invoices ---------------- */

export function invoiceInsight(inv: Invoice, all: Invoice[]) {
  const days = Math.round((new Date(inv.dueDate).getTime() - Date.now()) / 864e5);
  const history = all.filter((i) => i.dealerId === inv.dealerId);
  const late = history.filter((i) => i.status === "En retard").length;
  const payDelay = 3 + (hash(inv.dealerId) % 9) + late * 6;
  let text: string;
  let tone: "success" | "warning" | "danger" | "info" = "info";
  if (inv.status === "Payée") {
    text = `Payée. Revendeur historiquement fiable : délai moyen de paiement ${payDelay} jours.`;
    tone = "success";
  } else if (inv.status === "En retard" || days < 0) {
    text = `Facture en retard de ${Math.abs(days)} jours.${late >= 2 ? " Risque de retard élevé selon l'historique." : ""}`;
    tone = "danger";
  } else if (days <= 5) {
    text = `Échéance dans ${days} jour${days > 1 ? "s" : ""}.${late >= 1 ? " Relance préventive conseillée." : ""}`;
    tone = "warning";
  } else if (late >= 2) {
    text = "Risque de retard élevé selon l'historique.";
    tone = "warning";
  } else {
    text = `Revendeur historiquement fiable : délai moyen de paiement ${payDelay} jours.`;
  }
  return { days, text, tone, payDelay };
}

export const TVA = 0.2;
