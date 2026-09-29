import { useEffect, useRef, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dealerMetrics, invoiceInsight, productInsight, supplierAnalysis } from "@/lib/ai";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Msg { from: "user" | "ai"; text: string; actions?: { label: string; to: string }[] }

type Ctx = "stock" | "fournisseurs" | "revendeurs" | "commandes" | "factures" | "reclamations" | "general";

const SUGGEST: Record<Ctx, string> = {
  stock: "Quels produits dois-je commander cette semaine ?",
  fournisseurs: "Quel est notre fournisseur le plus fiable pour les batteries ?",
  revendeurs: "Quels revendeurs ont besoin de stock ?",
  commandes: "Quelles commandes nécessitent mon attention ?",
  factures: "Quelles factures risquent un retard ?",
  reclamations: "Résume-moi les réclamations urgentes.",
  general: "Quelles sont les priorités du jour ?",
};

function ctxOf(path: string): Ctx {
  if (/catalogue|approvisionnement/.test(path)) return "stock";
  if (/fournisseurs/.test(path)) return "fournisseurs";
  if (/revendeurs/.test(path)) return "revendeurs";
  if (/commandes/.test(path)) return "commandes";
  if (/factur/.test(path)) return "factures";
  if (/reclamations/.test(path)) return "reclamations";
  return "general";
}

export function ChatBubble() {
  const store = useStore();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const dealerSpace = path.startsWith("/revendeur");
  const base = dealerSpace ? "/revendeur" : "/sinophra";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const ctx = ctxOf(path);

  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs, typing]);

  const answer = (q: string): Msg => {
    const t = q.toLowerCase();
    const c: Ctx = /command|achet|stock|rupture|produit/.test(t) && !/revendeur/.test(t) && !/commandes? n/.test(t) ? "stock"
      : /fournisseur|batterie|fiable/.test(t) ? "fournisseurs"
      : /revendeur/.test(t) ? "revendeurs"
      : /commande/.test(t) ? "commandes"
      : /factur|paiement|retard/.test(t) ? "factures"
      : /réclam|reclam|sav|urgent/.test(t) ? "reclamations" : ctx;
    if (c === "stock") {
      const low = store.products.map((p) => ({ p, i: productInsight(p, store.dealerStock) })).filter((x) => x.i.status === "Stock faible" || x.i.status === "Rupture").sort((a, b) => a.i.coverage - b.i.coverage).slice(0, 4);
      return { from: "ai", text: `Je recommande de commander cette semaine :\n${low.map((x) => `• ${x.p.name} — stock ${x.p.centralStock}, besoin ${x.i.recommended} u. (couverture ${x.i.coverage} j)`).join("\n")}`, actions: dealerSpace ? [{ label: "Voir produit", to: "/revendeur/catalogue" }, { label: "Créer commande", to: "/revendeur/commandes" }] : [{ label: "Voir produit", to: "/sinophra/catalogue" }, { label: "Créer importation", to: "/sinophra/approvisionnement" }] };
    }
    if (c === "fournisseurs") {
      const bat = store.suppliers.filter((s) => s.categories.includes("Batteries")).map((s) => ({ s, a: supplierAnalysis(s, store.ratings) })).sort((a, b) => b.a.score - a.a.score);
      const best = bat[0]!;
      return { from: "ai", text: `Pour les batteries, ${best.s.name} est le plus fiable (score ${best.a.score}/100, fiabilité ${best.a.reliability} %, délai ${best.s.avgDelay} j). ${best.a.summary}${bat[1] ? `\nAlternative : ${bat[1].s.name} (${bat[1].a.score}/100).` : ""}`, actions: [{ label: "Voir fournisseur", to: "/sinophra/fournisseurs" }] };
    }
    if (c === "revendeurs") {
      const need = store.dealers.map((d) => ({ d, m: dealerMetrics(d, store) })).filter((x) => x.m.topLow).sort((a, b) => b.m.low.length - a.m.low.length).slice(0, 3);
      return { from: "ai", text: `Revendeurs à réapprovisionner :\n${need.map((x) => `• ${x.d.name} — ${x.m.topLow!.product.name} : ${x.m.topLow!.line.available} en stock`).join("\n")}`, actions: [{ label: "Envoyer stock", to: "/sinophra/revendeurs" }] };
    }
    if (c === "commandes") {
      const pending = store.orders.filter((o) => o.status === "Commande reçue" || o.status === "Préparation" || o.status === "Prête");
      return { from: "ai", text: `${pending.length} commandes nécessitent votre attention : ${pending.slice(0, 4).map((o) => `${o.id} (${o.status})`).join(", ")}.`, actions: [{ label: "Voir commandes", to: `${base}/commandes` }] };
    }
    if (c === "factures") {
      const risky = store.invoices.filter((i) => i.status !== "Payée").map((i) => ({ i, x: invoiceInsight(i, store.invoices) })).filter((r) => r.x.tone !== "info").slice(0, 4);
      return { from: "ai", text: `Factures à risque :\n${risky.map((r) => `• ${r.i.id} — ${r.x.text}`).join("\n")}`, actions: [{ label: "Voir facture", to: dealerSpace ? "/revendeur/factures" : "/sinophra/facturation" }] };
    }
    if (c === "reclamations") {
      const u = store.tickets.filter((x) => x.status !== "Résolu" && (x.priority === "Critique" || x.priority === "Haute"));
      return { from: "ai", text: `${u.length} réclamations urgentes. Principales : ${u.slice(0, 3).map((x) => `${x.id} « ${x.subject} »`).join(" ; ")}.`, actions: [{ label: "Voir réclamation", to: `${base}/reclamations` }] };
    }
    return { from: "ai", text: "Priorités du jour : réapprovisionner les produits en stock faible, valider les commandes reçues et traiter les réclamations urgentes.", actions: [{ label: "Voir produit", to: `${base}/catalogue` }] };
  };

  const ask = (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setInput("");
    setTyping(true);
    setTimeout(() => { setMsgs((m) => [...m, answer(q)]); setTyping(false); }, 700);
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Assistant IA"
        className="fixed right-5 bottom-5 z-40 grid h-13 w-13 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
        style={{ width: 52, height: 52 }}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
      {open && (
        <div className="fixed right-5 bottom-22 z-40 flex h-[520px] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4" style={{ bottom: 84 }}>
          <div className="flex items-center gap-2 border-b bg-gradient-to-r from-primary/15 to-transparent px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-semibold">Assistant IA {dealerSpace ? "MOTOPARK" : "SINOPHRA"}</p>
              <p className="text-[11px] text-muted-foreground">Contexte : {ctx === "general" ? "vue générale" : ctx}</p>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Bonjour, je connais les données de cette page. Essayez :</p>
                {[SUGGEST[ctx], ...Object.values(SUGGEST).filter((s) => s !== SUGGEST[ctx]).slice(0, 2)].map((s) => (
                  <button key={s} onClick={() => ask(s)} className="block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5">{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={cn("max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-line", m.from === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                {m.text}
                {m.actions && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.actions.map((a) => (
                      <Button key={a.label} size="sm" variant="outline" className="h-7 bg-card text-xs" onClick={() => navigate({ to: a.to })}>{a.label}</Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {typing && <div className="w-14 rounded-xl bg-muted px-3 py-2 text-sm"><span className="animate-pulse">•••</span></div>}
            <div ref={end} />
          </div>
          <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Posez une question…" />
            <Button type="submit" size="icon" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      )}
    </>
  );
}
