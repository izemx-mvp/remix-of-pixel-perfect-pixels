import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "@/components/Catalogue";
import { TVA } from "@/lib/ai";
import { mad, shortDate } from "@/lib/format";
import { useStore } from "@/lib/store";

/** Modale "Envoyer du stock" SINOPHRA → revendeur (crée une commande/transfert validée). */
export function SendStockDialog({
  open,
  onOpenChange,
  dealerId,
  productId,
  qty,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dealerId?: string;
  productId?: string;
  qty?: number;
}) {
  const { products, dealers, createOrder } = useStore();
  const [pid, setPid] = useState("");
  const [did, setDid] = useState("");
  const [q, setQ] = useState(1);
  const [comment, setComment] = useState("");
  useEffect(() => {
    if (open) {
      setPid(productId ?? products[0]!.id);
      setDid(dealerId ?? dealers[0]!.id);
      setQ(qty ?? 5);
      setComment("");
    }
  }, [open, productId, dealerId, qty, products, dealers]);
  const product = products.find((p) => p.id === pid);
  const dealer = dealers.find((d) => d.id === did);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Envoyer du stock</DialogTitle>
          <DialogDescription>Crée un transfert validé, suivi dans Commandes revendeurs et visible côté MOTOPARK.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Produit</Label>
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} — {p.centralStock} dispo</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Quantité</Label><Input type="number" min={1} value={q} onChange={(e) => setQ(Math.max(1, Number(e.target.value)))} /></div>
            <div className="space-y-2"><Label>Origine</Label><Input value="Stock central SINOPHRA" readOnly /></div>
          </div>
          <div className="space-y-2">
            <Label>Revendeur destination</Label>
            <Select value={did} onValueChange={setDid}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{dealers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Commentaire</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Réapprovisionnement recommandé par l'IA" /></div>
          {product && q > product.centralStock && <p className="text-sm text-destructive">Stock central insuffisant ({product.centralStock} disponibles).</p>}
        </div>
        <DialogFooter>
          <Button
            disabled={!product || !dealer || q > (product?.centralStock ?? 0)}
            onClick={() => {
              if (!product || !dealer) return;
              const id = createOrder(dealer.id, [{ productId: product.id, qty: q, unitPrice: product.priceDealer }], { status: "Validée", silent: true });
              toast.success(`Transfert ${id} créé : ${q} × ${product.name} → ${dealer.name}`);
              onOpenChange(false);
            }}
          >
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Modale "Générer facture" depuis une commande revendeur. */
export function InvoiceDialog({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { orders, dealers, products, invoices, createInvoice } = useStore();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  const dealer = dealers.find((d) => d.id === order.dealerId);
  const ht = order.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const tva = Math.round(ht * TVA);
  const number = invoices.find((i) => i.orderId === order.id)?.id ?? `FAC-${2026}${200 + invoices.length}`;

  return (
    <Dialog open={!!orderId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Générer la facture</DialogTitle>
          <DialogDescription>Facture rattachée à la commande {order.id}.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Numéro facture" value={number} />
          <Info label="Commande" value={order.id} />
          <Info label="Revendeur" value={dealer?.name ?? "—"} />
          <Info label="Échéance" value={shortDate(new Date(Date.now() + 30 * 864e5).toISOString())} />
        </div>
        <div className="overflow-hidden rounded-lg border text-sm">
          <table className="w-full">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="px-3 py-2 text-left">Produit</th><th className="px-3 py-2 text-right">Qté</th><th className="px-3 py-2 text-right">Prix</th><th className="px-3 py-2 text-right">Total</th></tr>
            </thead>
            <tbody>
              {order.lines.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{products.find((p) => p.id === l.productId)?.name}</td>
                  <td className="px-3 py-2 text-right">{l.qty}</td>
                  <td className="px-3 py-2 text-right">{mad(l.unitPrice)}</td>
                  <td className="px-3 py-2 text-right">{mad(l.qty * l.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 border-t bg-muted/20 px-3 py-2 text-right">
            <p>Sous-total HT : <b>{mad(ht)}</b></p>
            <p>TVA 20 % : <b>{mad(tva)}</b></p>
            <p className="text-base">Total TTC : <b>{mad(ht + tva)}</b></p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={() => { createInvoice(order.id); onClose(); }}>Créer facture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
