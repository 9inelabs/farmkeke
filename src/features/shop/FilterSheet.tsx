// M-16 Filter and sort: sort order, how to get it, price, freshness and farm
// rating. Applies to category and search results.
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { BottomSheet, Button, ChipGroup, Text } from "@/components/ui";
import { spacing } from "@/theme/tokens";

export type Sort = "newest" | "price_low" | "price_high" | "freshest" | "top_rated";
export type Filters = {
  sort?: Sort;
  get?: "delivery" | "pickup";
  price?: "under2k" | "2to5k" | "5to10k" | "over10k";
  harvestedWithinDays?: 1 | 3 | 7;
  minRating?: 4;
};

const PRICE: Record<NonNullable<Filters["price"]>, { minPriceKobo?: number; maxPriceKobo?: number }> = {
  under2k: { maxPriceKobo: 200_000 },
  "2to5k": { minPriceKobo: 200_000, maxPriceKobo: 500_000 },
  "5to10k": { minPriceKobo: 500_000, maxPriceKobo: 1_000_000 },
  over10k: { minPriceKobo: 1_000_000 },
};

/** The filters as storefront query arguments. */
export function filterArgs(f: Filters) {
  return {
    ...(f.sort ? { sort: f.sort } : {}),
    ...(f.get === "delivery" ? { delivery: true } : f.get === "pickup" ? { pickup: true } : {}),
    ...(f.price ? PRICE[f.price] : {}),
    ...(f.harvestedWithinDays ? { harvestedWithinDays: f.harvestedWithinDays } : {}),
    ...(f.minRating ? { minRating: f.minRating } : {}),
  };
}

/** How many filters (not counting sort) are on, for the button badge. */
export const activeCount = (f: Filters) => [f.get, f.price, f.harvestedWithinDays, f.minRating].filter((x) => x !== undefined).length;

type Props = { visible: boolean; value: Filters; onClose: () => void; onApply: (f: Filters) => void };

export function FilterSheet({ visible, value, onClose, onApply }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? <Body initial={value} onApply={onApply} /> : null}
    </BottomSheet>
  );
}

function Body({ initial, onApply }: { initial: Filters; onApply: (f: Filters) => void }) {
  const [f, setF] = useState<Filters>(initial);
  const set = <K extends keyof Filters>(k: K) => (v: Filters[K]) => setF((x) => ({ ...x, [k]: x[k] === v ? undefined : v }));
  return (
    <View style={styles.wrap}>
      <Text variant="section" accessibilityRole="header">
        Filter and sort
      </Text>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.groups} showsVerticalScrollIndicator={false}>
        <ChipGroup
          label="Sort by"
          value={f.sort ?? "newest"}
          onChange={(sort) => setF((x) => ({ ...x, sort }))}
          options={[
            { value: "newest", label: "Newest" },
            { value: "freshest", label: "Freshest" },
            { value: "price_low", label: "Price: low to high" },
            { value: "price_high", label: "Price: high to low" },
            { value: "top_rated", label: "Top rated farms" },
          ]}
        />
        <ChipGroup
          label="Get it by"
          value={f.get}
          onChange={set("get")}
          options={[
            { value: "delivery", label: "Home delivery" },
            { value: "pickup", label: "Pickup at the farm" },
          ]}
        />
        <ChipGroup
          label="Price"
          value={f.price}
          onChange={set("price")}
          options={[
            { value: "under2k", label: "Under ₦2,000" },
            { value: "2to5k", label: "₦2,000 to ₦5,000" },
            { value: "5to10k", label: "₦5,000 to ₦10,000" },
            { value: "over10k", label: "Over ₦10,000" },
          ]}
        />
        <ChipGroup
          label="Harvested"
          value={f.harvestedWithinDays}
          onChange={set("harvestedWithinDays")}
          options={[
            { value: 1, label: "Today or yesterday" },
            { value: 3, label: "In the last 3 days" },
            { value: 7, label: "This week" },
          ]}
        />
        <ChipGroup label="Farm rating" value={f.minRating} onChange={set("minRating")} options={[{ value: 4, label: "4 stars and up" }]} />
      </ScrollView>
      <View style={styles.actions}>
        <Button label="Reset" variant="outline" onPress={() => onApply({})} style={styles.flex} />
        <Button label="Show results" onPress={() => onApply(f)} style={styles.flex} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg, paddingTop: spacing.md, maxHeight: 620 },
  scroll: { flexGrow: 0 },
  groups: { gap: spacing.xl },
  actions: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1 },
});
