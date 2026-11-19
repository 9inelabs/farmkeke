// M-14 All farms: "View all" on Home's Farmers Near You. A deep green header
// with the count and a search box, filter chips, then a card for every open
// farm: three of its product photos, the farm's photo, rating, area, what it
// grows, how many products, and whether it delivers or offers pickup. The
// shopper's own area comes first (storefront.farms).
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Close, Pin, Search, Shop, Sprout, Star, Truck, Verified } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { ForestBackdrop, Glass } from "@/components/premium";
import { BackIcon, EmptyState, PressableScale, Skeleton, Text } from "@/components/ui";
import { initials } from "@/components/ui/Avatar";
import { useShopContext } from "@/features/shop/useShopContext";
import { borders, colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useLightStatusBar } from "@/theme/useLightStatusBar";

type Farm = FunctionReturnType<typeof api.storefront.farms>[number];

const FILTERS = [
  { key: "all", label: "All farms" },
  { key: "area", label: "In your area" },
  { key: "top", label: "Top rated" },
  { key: "delivery", label: "Delivers" },
  { key: "pickup", label: "Pickup" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const keep: Record<FilterKey, (f: Farm) => boolean> = {
  all: () => true,
  area: (f) => f.inYourArea || f.inYourState,
  top: (f) => f.rating !== null && f.rating >= 4.5,
  delivery: (f) => f.delivery,
  pickup: (f) => f.pickup,
};

const PHOTO = 58;

export default function AllFarms() {
  useLightStatusBar();
  const insets = useSafeAreaInsets();
  const { today, area } = useShopContext();
  const farms = useQuery(api.storefront.farms, { today, state: area?.state, lga: area?.lga });
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const shown = useMemo(() => {
    const words = text.trim().toLowerCase();
    return (farms ?? []).filter(
      (f) =>
        keep[filter](f) &&
        (words === "" || [f.name, f.lga, f.state, ...f.categories].some((s) => s.toLowerCase().includes(words))),
    );
  }, [farms, text, filter]);

  const header = (
    <>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <ForestBackdrop />
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={8} onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))} style={styles.backWrap}>
          <Glass style={styles.back}>
            <BackIcon color={colors.white} />
          </Glass>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>Farmkeke growers</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Meet the farms
          </Text>
          <Text style={styles.subtitle}>
            {farms === undefined
              ? "Finding farms near you…"
              : `${farms.length} ${farms.length === 1 ? "farm" : "farms"} selling fresh produce${area ? `, nearest to ${area.name} first` : ""}`}
          </Text>
        </View>
        <View style={styles.search}>
          <Search size={18} color={colors.inkMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Search a farm, area or produce"
            placeholderTextColor={colors.inkMuted}
            selectionColor={colors.forest}
            returnKeyType="search"
            accessibilityLabel="Search farms"
            style={styles.searchInput}
          />
          {text ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={8} onPress={() => setText("")}>
              <Close size={16} color={colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="tablist">
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f.key)}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && !on && styles.chipPressed]}
            >
              {f.key === "top" ? <Star size={12} color={on ? colors.lime : colors.pending} variant="solid" /> : null}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {farms !== undefined && shown.length > 0 ? (
        <Text style={styles.count}>
          {shown.length === farms.length ? "Showing every farm" : `${shown.length} of ${farms.length} farms`}
        </Text>
      ) : null}
    </>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={shown}
        keyExtractor={(f) => f.id}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListEmptyComponent={
          farms === undefined ? (
            <View style={styles.list}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={248} radius={20} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <EmptyState
                icon={Shop}
                title={farms.length === 0 ? "No farms open yet" : "No farms match"}
                message={farms.length === 0 ? "Farms are setting up their stalls. Check back soon." : "Try another search or filter."}
                actionLabel={farms.length === 0 ? undefined : "Show all farms"}
                onAction={
                  farms.length === 0
                    ? undefined
                    : () => {
                        setText("");
                        setFilter("all");
                      }
                }
              />
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Reveal index={index} style={styles.item}>
            <FarmCard farm={item} />
          </Reveal>
        )}
      />
    </View>
  );
}

function FarmCard({ farm }: { farm: Farm }) {
  const open = () => router.push(`/farm/${farm.id}`);
  const where = [farm.lga, farm.state].filter(Boolean).join(", ");
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`${farm.name}, ${where}. Visit farm`} onPress={open} pressedScale={0.985} style={styles.card}>
      {/* Three of the farm's products, or deep green when it has none with photos */}
      <View style={styles.strip}>
        {farm.photos.length === 0 ? (
          <>
            <ForestBackdrop grid={false} />
            <View style={styles.stripEmpty}>
              <Sprout size={26} color={colors.lime} />
            </View>
          </>
        ) : (
          <View style={styles.stripRow}>
            <Image source={{ uri: farm.photos[0] }} contentFit="cover" transition={200} style={styles.stripMain} />
            {farm.photos.length > 1 ? (
              <View style={styles.stripSide}>
                {farm.photos.slice(1, 3).map((uri) => (
                  <Image key={uri} source={{ uri }} contentFit="cover" transition={200} style={styles.stripSmall} />
                ))}
              </View>
            ) : null}
          </View>
        )}
        <View style={styles.stripTop}>
          {farm.inYourArea ? (
            <View style={styles.areaTag}>
              <Pin size={11} color={colors.forestDeep} variant="solid" />
              <Text style={styles.areaTagText}>In your area</Text>
            </View>
          ) : (
            <View />
          )}
          {farm.rating !== null ? (
            <View style={styles.ratingTag}>
              <Star size={11} color={colors.pending} variant="solid" />
              <Text style={styles.ratingText}>
                {farm.rating.toFixed(1)}
                <Text style={styles.ratingCount}> ({farm.ratingCount})</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.ratingTag}>
              <Text style={styles.ratingText}>New</Text>
            </View>
          )}
        </View>
      </View>

      {/* The farm's own photo over the strip's edge */}
      <View style={styles.avatarRing}>
        {farm.photoUrl ? (
          <Image source={{ uri: farm.photoUrl }} contentFit="cover" transition={150} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarInitials]}>
            <Text style={styles.avatarText}>{initials(farm.name)}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {farm.name}
          </Text>
          {farm.verified ? <Verified size={15} color={colors.success} variant="solid" /> : null}
        </View>
        <Text numberOfLines={1} style={styles.where}>
          {where}
          {farm.distanceKm !== null ? ` · ${farm.distanceKm < 10 ? farm.distanceKm.toFixed(1) : Math.round(farm.distanceKm)} km away` : ""}
        </Text>

        {farm.categories.length > 0 ? (
          <View style={styles.cats}>
            {farm.categories.map((c) => (
              <View key={c} style={styles.cat}>
                <Text style={styles.catText}>{c}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.foot}>
          <View style={styles.meta}>
            <Text style={styles.metaStrong}>
              {farm.productCount} {farm.productCount === 1 ? "product" : "products"}
            </Text>
            {farm.delivery ? (
              <View style={styles.metaItem}>
                <Truck size={13} color={colors.limeInk} />
                <Text style={styles.metaText}>Delivery</Text>
              </View>
            ) : null}
            {farm.pickup ? (
              <View style={styles.metaItem}>
                <Pin size={13} color={colors.limeInk} />
                <Text style={styles.metaText}>Pickup</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.visit}>
            <Text style={styles.visitText}>Visit</Text>
            <ArrowRight size={13} color={colors.lime} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  // Header
  header: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: "hidden", gap: spacing.md },
  backWrap: { alignSelf: "flex-start" },
  back: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  titleBlock: { gap: 3 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10.5, lineHeight: 14, letterSpacing: 0.9, textTransform: "uppercase", color: colors.lime },
  title: { fontFamily: fonts.displayHeavy, fontSize: 25, lineHeight: 31, letterSpacing: -0.8, color: colors.white },
  subtitle: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.onForest },
  search: { height: 46, borderRadius: 15, backgroundColor: colors.white, flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.md + 2 },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {}),
  },
  // Filters
  chips: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.xs, gap: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: borders.hairline,
    borderColor: "#E6EAE1",
  },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipPressed: { backgroundColor: colors.surfaceSoft },
  chipText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  chipTextOn: { color: colors.white },
  count: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm, paddingBottom: spacing.md, fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.inkMuted },
  // List
  list: { paddingHorizontal: spacing.screen, paddingTop: spacing.md, gap: spacing.md },
  item: { paddingHorizontal: spacing.screen },
  gap: { height: spacing.md },
  empty: { paddingHorizontal: spacing.screen, paddingTop: spacing.xxxl },
  // Card
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: borders.hairline, borderColor: "#ECEFE7", overflow: "hidden" },
  strip: { height: 118, backgroundColor: colors.tint },
  stripEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  stripRow: { flex: 1, flexDirection: "row", gap: 2 },
  stripMain: { flex: 2, backgroundColor: colors.tint },
  stripSide: { flex: 1, gap: 2 },
  stripSmall: { flex: 1, backgroundColor: colors.tint },
  stripTop: { position: "absolute", top: spacing.sm + 2, left: spacing.sm + 2, right: spacing.sm + 2, flexDirection: "row", justifyContent: "space-between" },
  areaTag: { flexDirection: "row", alignItems: "center", gap: 3, height: 24, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.lime },
  areaTagText: { fontFamily: fonts.bold, fontSize: 10.5, lineHeight: 13, color: colors.forestDeep },
  ratingTag: { flexDirection: "row", alignItems: "center", gap: 3, height: 24, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.94)" },
  ratingText: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14, color: colors.ink },
  ratingCount: { fontFamily: fonts.regular, color: colors.inkMuted },
  avatarRing: {
    position: "absolute",
    top: 118 - PHOTO / 2 - 3,
    left: spacing.lg - 3,
    width: PHOTO + 6,
    height: PHOTO + 6,
    borderRadius: (PHOTO + 6) / 2,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, backgroundColor: colors.forest },
  avatarInitials: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 22, color: colors.lime },
  body: { paddingHorizontal: spacing.lg, paddingTop: PHOTO / 2 + spacing.sm, paddingBottom: spacing.lg, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, letterSpacing: -0.3, color: colors.ink },
  where: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  cats: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: spacing.sm },
  cat: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.tint },
  catText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.forest },
  foot: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: borders.hairline, borderTopColor: "#F0F2EC" },
  meta: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
  metaStrong: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.ink },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.inkSoft },
  visit: { flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: colors.forest },
  visitText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.white },
});
