// F-29 (one listing) and F-30 (several): confirm pause, resume, out of stock or delete.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useState } from "react";
import { BottomSheet, Button, Notice, Text } from "@/components/ui";
import { errorMessage } from "@/lib/errors";

export type ListingAction = "pause" | "resume" | "out_of_stock" | "delete";

const COPY: Record<ListingAction, { title: (n: number) => string; body: string; confirm: string }> = {
  pause: {
    title: (n) => (n === 1 ? "Pause this listing?" : `Pause ${n} listings?`),
    body: "Buyers won't see it until you resume. Orders already placed still need to be completed.",
    confirm: "Pause",
  },
  resume: {
    title: (n) => (n === 1 ? "Resume this listing?" : `Resume ${n} listings?`),
    body: "Buyers can see it and order again straight away.",
    confirm: "Resume",
  },
  out_of_stock: {
    title: (n) => (n === 1 ? "Mark as out of stock?" : `Mark ${n} listings out of stock?`),
    body: "Stock is set to 0 for every unit, so nobody can order. Use Quick update to add stock back.",
    confirm: "Mark out of stock",
  },
  delete: {
    title: (n) => (n === 1 ? "Delete this listing?" : `Delete ${n} listings?`),
    body: "It's removed from your farm and from buyers' view. This can't be undone; past orders keep their record.",
    confirm: "Delete",
  },
};

export function ConfirmActionSheet({
  action,
  listingIds,
  onClose,
  onDone,
}: {
  action: ListingAction | null;
  listingIds: Id<"listings">[];
  onClose: () => void;
  onDone?: (action: ListingAction) => void;
}) {
  const bulkAction = useMutation(api.listings.bulkAction);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = action ? COPY[action] : null;

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      await bulkAction({ listingIds, action });
      onClose();
      onDone?.(action);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={action !== null} onClose={onClose}>
      {copy && (
        <>
          <Text variant="heading">{copy.title(listingIds.length)}</Text>
          <Text variant="caption">{copy.body}</Text>
          {error !== null && <Notice tone="error">{error}</Notice>}
          <Button label={copy.confirm} variant={action === "delete" ? "danger" : "dark"} fullWidth loading={busy} onPress={() => void confirm()} />
          <Button label="Cancel" variant="ghost" fullWidth onPress={onClose} />
        </>
      )}
    </BottomSheet>
  );
}
