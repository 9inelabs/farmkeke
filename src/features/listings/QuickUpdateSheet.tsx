// F-28 Quick update: stock and price for each unit, applied at once.
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BottomSheet, Button, Notice, Text, TextField } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { nairaInput, parseNaira } from "@/lib/money";
import { spacing } from "@/theme/tokens";

type Unit = { unitId: Id<"units">; priceKobo: number; stock: number; singular: string; plural: string };

export function QuickUpdateSheet({
  listingId,
  units,
  visible,
  onClose,
}: {
  listingId: Id<"listings">;
  units: Unit[];
  visible: boolean;
  onClose: () => void;
}) {
  const quickUpdate = useMutation(api.listings.quickUpdate);
  const [values, setValues] = useState<Record<string, { price: string; stock: string }>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValues(Object.fromEntries(units.map((u) => [u.unitId, { price: nairaInput(u.priceKobo), stock: String(u.stock) }])));
      setError(null);
    }
  }, [visible, units]);

  const save = async () => {
    const changes = units.map((u) => {
      const v = values[u.unitId];
      return { unitId: u.unitId, priceKobo: parseNaira(v?.price ?? "") ?? -1, stock: Number(v?.stock) };
    });
    if (changes.some((c) => c.priceKobo <= 0 || !Number.isInteger(c.stock) || c.stock < 0)) {
      setError("Check each price and stock. Prices must be above ₦0; stock can be 0 or more.");
      return;
    }
    setBusy(true);
    try {
      await quickUpdate({ listingId, units: changes });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text variant="heading">Quick update</Text>
      <Text variant="caption">Changes go live straight away.</Text>
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {units.map((u) => (
          <View key={u.unitId} style={styles.unit}>
            <Text variant="label">Per {u.singular}</Text>
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField
                  label="Price"
                  prefix="₦"
                  keyboardType="decimal-pad"
                  value={values[u.unitId]?.price ?? ""}
                  onChangeText={(t) => setValues((v) => ({ ...v, [u.unitId]: { ...v[u.unitId], price: t.replace(/[^\d.]/g, "") } }))}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label={`${u.plural} left`}
                  keyboardType="number-pad"
                  value={values[u.unitId]?.stock ?? ""}
                  onChangeText={(t) => setValues((v) => ({ ...v, [u.unitId]: { ...v[u.unitId], stock: t.replace(/\D/g, "") } }))}
                />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {error !== null && <Notice tone="error">{error}</Notice>}
      <Button label="Save" fullWidth loading={busy} onPress={() => void save()} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { maxHeight: 360 },
  unit: { gap: spacing.sm, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
});
