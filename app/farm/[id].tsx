// M-21 Farm profile: who's selling, how they do, and everything they sell.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Clock, Pin, Shop, Star, Truck, Verified } from "@/components/icons";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Chip, Notice, ScreenHeader, Skeleton, StatusScreen, Text } from "@/components/ui";
import { ProductGrid } from "@/features/shop/ProductGrid";
import { useShopContext } from "@/features/shop/useShopContext";
import { borders, colors, radii, spacing } from "@/theme/tokens";

export default function FarmPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { today } = useShopContext();
  const farm = useQuery(api.storefront.farm, { id, today });
  const [category, setCategory] = useState<string | null>(null);

  if (farm === null) {
    return (
      <StatusScreen
        icon={Shop}
        title="This farm isn't selling right now"
        message="It may have paused its shop on Farmkeke. Other farms near you have fresh produce."
        actions={<Button label="Keep shopping" onPress={() => router.replace("/home")} />}
      />
    );
  }

  const items = farm?.listings.filter((l) => category === null || l.category?.slug === category);
  const since = farm ? new Date(farm.joinedAt).getFullYear() : null;

  const header = (
    <View style={styles.head}>
      {farm === undefined ? (
        <View style={styles.loading}>
          <Skeleton width={72} height={72} radius={36} />
          <Skeleton height={24} width={200} />
          <Skeleton height={18} width={140} />
        </View>
      ) : (
        <>
          <View style={styles.identity}>
            {farm.photoUrl ? (
              <Image source={{ uri: farm.photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <Avatar name={farm.name} size={72} />
            )}
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text variant="section" numberOfLines={2} style={styles.flexShrink}>
                  {farm.name}
                </Text>
                {farm.verified ? <Verified size={18} color={colors.success} accessibilityLabel="Verified farm" /> : null}
              </View>
              <View style={styles.meta}>
                <Pin size={13} color={colors.inkSoft} />
                <Text variant="caption">
                  {farm.lga}, {farm.state}
                  {since ? ` · Selling since ${since}` : ""}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat label="Rating" value={farm.rating != null ? `${farm.rating.toFixed(1)} (${farm.ratingCount})` : "New"} icon={Star} />
            <Stat label="Products" value={String(farm.productCount)} />
            <Stat label="Accepts within" value={`${farm.acceptsWithinHours} hours`} icon={Clock} />
          </View>

          <View style={styles.ways}>
            {farm.delivery ? <Chip label="Home delivery" icon={Truck} /> : null}
            {farm.pickup ? <Chip label="Pickup at the farm" icon={Shop} /> : null}
          </View>

          {farm.description ? (
            <Text variant="body" color={colors.inkSoft}>
              {farm.description}
            </Text>
          ) : null}

          {farm.onBreak ? <Notice tone="pending">{farm.name} is taking a short break. Its produce will be back soon.</Notice> : null}

          {farm.categories.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cats}>
              <Chip label={`All (${farm.listings.length})`} selected={category === null} onPress={() => setCategory(null)} />
              {farm.categories.map((c) => (
                <Chip key={c.slug} label={`${c.name} (${c.count})`} selected={category === c.slug} onPress={() => setCategory(c.slug)} />
              ))}
            </ScrollView>
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <ScreenHeader title={farm?.name ?? "Farm"} />
      <ProductGrid
        items={items}
        header={header}
        empty={
          farm?.onBreak ? null : (
            <Text variant="caption" align="center" style={styles.empty}>
              Nothing for sale right now. Check back soon.
            </Text>
          )
        }
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Star }) {
  return (
    <View style={styles.stat}>
      <View style={styles.statValue}>
        {Icon ? <Icon size={13} color={colors.forest} /> : null}
        <Text variant="label" numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text variant="small">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  head: { gap: spacing.lg, paddingBottom: spacing.lg },
  loading: { gap: spacing.md },
  identity: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  photo: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.placeholder },
  flex: { flex: 1, gap: 4 },
  flexShrink: { flexShrink: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  stats: {
    flexDirection: "row",
    borderRadius: radii.lg,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  ways: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cats: { gap: spacing.sm },
  empty: { paddingVertical: spacing.xxxl },
});
