"use client";

// "Add" / "Add to cart" for a listing we only know by id (W-43 Buy again,
// W-47 Saved items). Listings sold in several units, or not available, go to
// the product page to choose instead.
import { useConvex } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/convex/api";
import type { ListingForCart } from "@/convex/returns/common";
import { cart, miniCart } from "@/lib/cart";
import { routes } from "@/lib/routes";

export function AddListing({
  listingId,
  name,
  label = "Add",
  variant = "ghost",
  size = "sm",
}: {
  listingId: string;
  name: string;
  label?: string;
  variant?: "ghost" | "lime";
  size?: "sm" | "md";
}) {
  const convex = useConvex();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const add = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const l = (await convex.query(api.checkout.listingForCart, { listingId })) as ListingForCart | null;
      const unit = l?.units[0];
      if (!l || !l.available || !unit || unit.stock < 1 || l.units.length > 1) {
        router.push(routes.product(listingId));
        return;
      }
      cart.add({
        listingId: l.id,
        unitId: unit.unitId,
        quantity: Math.max(1, unit.minOrder),
        priceKobo: unit.priceKobo,
        name: l.name,
        unitSingular: unit.singular,
        unitPlural: unit.plural,
        farmId: l.farmId,
        farmName: l.farmName,
        imageUrl: l.imageUrl,
        minOrder: unit.minOrder,
        stock: unit.stock,
      });
      miniCart.open();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size === "sm" ? "sm" : "md"} loading={busy} onClick={add}>
      {failed ? "Try again" : label}
      <span className="sr-only"> {name} to cart</span>
    </Button>
  );
}
