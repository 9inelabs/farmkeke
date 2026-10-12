// F-23 Add listing: price, unit and stock (and F-27 edit). Each unit has its
// own price, stock and minimum order, e.g. basket ₦4,500 · derica ₦1,200.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Plus, Trash2 } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Button, SelectField, Text, TextField } from "@/components/ui";
import { ListingStep } from "@/features/listings/ListingStep";
import { useListing } from "@/features/listings/useListing";
import { errorMessage } from "@/lib/errors";
import { nairaInput, parseNaira } from "@/lib/money";
import { borders, colors, radii, spacing } from "@/theme/tokens";

type Row = { key: string; unitId?: string; price: string; stock: string; minOrder: string };

const MAX_UNITS = 6;
let nextKey = 0;
const blankRow = (): Row => ({ key: `row-${nextKey++}`, price: "", stock: "", minOrder: "1" });

export default function ListingPricing() {
  const { listingId, listing, editing } = useListing();
  const allUnits = useQuery(api.catalog.listUnits);
  const save = useMutation(api.listings.savePricing);
  const [rows, setRows] = useState<Row[]>([blankRow()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadedId = listing?._id;
  useEffect(() => {
    if (!listing || listing.units.length === 0) return;
    setRows(
      listing.units.map((u) => ({
        key: `row-${nextKey++}`,
        unitId: u.unitId,
        price: nairaInput(u.priceKobo),
        stock: String(u.stock),
        minOrder: String(u.minOrder),
      })),
    );
  }, [loadedId]); // load once

  // Units already on the listing stay selectable even if staff retired them.
  const unitOptions = [
    ...(allUnits ?? []).map((u) => ({ value: u._id as string, label: u.singular })),
    ...(listing?.units ?? [])
      .filter((u) => !(allUnits ?? []).some((a) => a._id === u.unitId))
      .map((u) => ({ value: u.unitId as string, label: u.singular })),
  ];

  const update = (key: string, change: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...change } : r)));

  const onSave = async (mode: "continue" | "draft") => {
    const problems: Record<string, string> = {};
    const parsed = rows.map((r) => {
      const priceKobo = parseNaira(r.price);
      const stock = Number(r.stock);
      const minOrder = Number(r.minOrder || "1");
      if (!r.unitId) problems[`${r.key}.unit`] = "Choose a unit.";
      if (priceKobo === null) problems[`${r.key}.price`] = "Enter a price, like 4500.";
      if (r.stock === "" || !Number.isInteger(stock) || stock < 0) problems[`${r.key}.stock`] = "How many do you have?";
      if (!Number.isInteger(minOrder) || minOrder < 1) problems[`${r.key}.minOrder`] = "At least 1.";
      return { unitId: r.unitId as Id<"units">, priceKobo: priceKobo ?? 0, stock, minOrder };
    });
    if (new Set(rows.map((r) => r.unitId).filter(Boolean)).size !== rows.filter((r) => r.unitId).length) {
      setBanner("Each unit can only be listed once.");
      return false;
    }
    setErrors(problems);
    setBanner(null);
    if (Object.keys(problems).length > 0) return mode === "draft" && rows.every((r) => !r.unitId && !r.price);
    setBusy(true);
    try {
      await save({ listingId, units: parsed });
      return true;
    } catch (e) {
      setBanner(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListingStep
      stepKey="pricing"
      listingId={listingId}
      editing={editing}
      intro="Add each way you sell it. Buyers pick a unit and quantity."
      loading={listing === undefined || allUnits === undefined}
      banner={banner}
      staffNote={listing?.status === "needs_changes" ? listing.reviewNote : null}
      busy={busy}
      onSave={onSave}
    >
      {rows.map((row, i) => {
        const unitLabel = unitOptions.find((o) => o.value === row.unitId)?.label;
        return (
          <View key={row.key} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text variant="bodyMedium" style={styles.flex}>
                {i === 0 ? "Main unit" : `Unit ${i + 1}`}
              </Text>
              {rows.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${unitLabel ?? "this unit"}`}
                  hitSlop={8}
                  onPress={() => setRows((list) => list.filter((r) => r.key !== row.key))}
                >
                  <Trash2 size={18} color={colors.error} />
                </Pressable>
              )}
            </View>
            <SelectField
              label="Sold per"
              placeholder="Choose a unit"
              options={unitOptions.filter((o) => o.value === row.unitId || !rows.some((r) => r.unitId === o.value))}
              value={row.unitId}
              onChange={(unitId) => update(row.key, { unitId })}
              error={errors[`${row.key}.unit`]}
            />
            <TextField
              label={`Price per ${unitLabel ?? "unit"}`}
              prefix="₦"
              value={row.price}
              onChangeText={(price) => update(row.key, { price: price.replace(/[^\d.]/g, "") })}
              keyboardType="decimal-pad"
              placeholder="4500"
              error={errors[`${row.key}.price`]}
            />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label="In stock"
                  value={row.stock}
                  onChangeText={(stock) => update(row.key, { stock: stock.replace(/\D/g, "") })}
                  keyboardType="number-pad"
                  placeholder="18"
                  error={errors[`${row.key}.stock`]}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Minimum order"
                  value={row.minOrder}
                  onChangeText={(minOrder) => update(row.key, { minOrder: minOrder.replace(/\D/g, "") })}
                  keyboardType="number-pad"
                  error={errors[`${row.key}.minOrder`]}
                />
              </View>
            </View>
          </View>
        );
      })}
      {rows.length < MAX_UNITS && (
        <Button label="Add another unit" icon={Plus} variant="secondary" onPress={() => setRows((list) => [...list, blankRow()])} />
      )}
    </ListingStep>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: borders.hairline, borderColor: colors.lime, padding: spacing.md, gap: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
});
