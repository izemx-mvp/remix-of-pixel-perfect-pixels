import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

export function TransferDialog({ product, trigger }: { product: Product; trigger?: React.ReactNode }) {
  const { dealers, transferToDealer } = useStore();
  const [open, setOpen] = useState(false);
  const [dealerId, setDealerId] = useState(dealers[0]!.id);
  const [qty, setQty] = useState(1);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <ArrowRightLeft className="h-4 w-4" /> Transférer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transférer vers un revendeur</DialogTitle>
          <DialogDescription>
            {product.name} — {product.centralStock} unité(s) disponibles au stock central.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Revendeur</Label>
            <Select value={dealerId} onValueChange={setDealerId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {dealers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantité</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            onClick={() => {
              transferToDealer(product.id, dealerId, qty);
              setOpen(false);
            }}
          >
            Confirmer le transfert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
