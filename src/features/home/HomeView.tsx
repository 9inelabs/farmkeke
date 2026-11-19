// M-10 Home, premium redesign (Nov 2026), after the owner's grocery-app
// reference: a white header (who you are, your area, cart, alerts and
// search), the featured banner on a photo under deep green, categories, a dark "Farmers near
// you" strip, then the product rows (Fresh Picks, Near You, Almost Gone, Best
// Sellers This Week, Top-Rated Farms, Buy Again or Great Value; see
// convex/lib/homeSections.ts). Small, tight type; blocks fill the screen's
// width and the rows scroll sideways.
// This file only draws: the route (app/(shop)/home.tsx) supplies the data.
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, Cart, ChevronDown, ChevronRight, Grid, Pin, Search, Sliders, User, type IconComponent } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { ForestBackdrop } from "@/components/premium";
import { CategoryTile, PressableScale, ProductCard, Skeleton, Text } from "@/components/ui";
import { initials } from "@/components/ui/Avatar";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useScreenWidth } from "@/theme/useScreenSize";
import { AlmostGoneRow } from "./AlmostGoneRow";

export type HomeCategory = { id: string; name: string; illustration: string };
export type HomeProduct = { id: string; name: string; priceKobo: number; unit: string; imageUrl: string | null };
export type HomeBanner = { tag: string; title: string; subtitle: string; buttonLabel: string; imageUrl: string | null };
export type HomeFarm = { id: string; name: string; area: string; photoUrl: string | null };
/** One product row, as storefront.home sends it. */
export type HomeSection = { key: string; title: string; seeAll: boolean; items: (HomeProduct & { left?: number })[] };

type Props = {
  /** "Good evening" */
  greeting: string;
  /** The shopper's full name; guests have none. */
  name?: string;
  areaLabel: string;
  unreadAlerts: number;
  onAlerts: () => void;
  cartCount?: number;
  onCart?: () => void;
  // `undefined` means still loading: the block shows grey placeholders.
  categories: HomeCategory[] | undefined;
  sections: HomeSection[] | undefined;
  banner: HomeBanner | null | undefined;
  farms: HomeFarm[] | undefined;
  // A part with no handler is drawn but doesn't respond to taps.
  onChangeArea: () => void;
  onSearch?: () => void;
  onCategory?: (category: HomeCategory) => void;
  onAllCategories?: () => void;
  /** Fresh Picks' "View all" (the only row with one) */
  onSeeAll?: () => void;
  onProduct?: (product: HomeProduct) => void;
  onAddToCart?: (product: HomeProduct) => void;
  onBanner?: () => void;
  onFarm?: (farm: HomeFarm) => void;
};

const CARD_GAP = spacing.sm + 2;
const FARM_PHOTO = 54;
// A category tile sits this far inside its label's width; the row starts that much early so the first tile is on the margin.
const CATEGORY_INSET = 4;
// Large-text settings grow the type up to this much; past it the rows would stop fitting.
const MAX_TEXT = 1.3;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function HomeView(props: Props) {
  const insets = useSafeAreaInsets();
  const width = useScreenWidth();
  // Narrow phones get a slimmer margin.
  const side = width < 360 ? spacing.lg : spacing.screen;
  // Two cards and part of a third show at once, so the row reads as scrollable.
  const cardWidth = Math.round(clamp((width - side - 2 * CARD_GAP) / 2.4, 128, 176));
  // Rows scroll edge to edge, with their first item on the screen margin.
  const row = { style: { marginHorizontal: -side }, contentContainerStyle: { paddingHorizontal: side } };

  const section = (title: string, onSeeAll?: () => void, label = "View all") => (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_TEXT} style={[styles.sectionTitle, styles.shrink]}>
        {title}
      </Text>
      {onSeeAll !== undefined && (
        <Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${title}`} hitSlop={12} onPress={onSeeAll} style={styles.seeAll}>
          <Text maxFontSizeMultiplier={MAX_TEXT} style={styles.seeAllText}>
            {label}
          </Text>
          <ChevronRight size={13} color={colors.limeInk} />
        </Pressable>
      )}
    </View>
  );

  const productRow = (products: HomeProduct[] | undefined) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={row.style} contentContainerStyle={[row.contentContainerStyle, styles.cards]}>
      {products === undefined
        ? [0, 1, 2].map((i) => <Skeleton key={i} width={cardWidth} height={cardWidth + 74} radius={radii.lg} />)
        : products.map((p) => (
            <ProductCard
              key={p.id}
              name={p.name}
              priceKobo={p.priceKobo}
              unit={p.unit}
              imageUrl={p.imageUrl}
              width={cardWidth}
              onPress={props.onProduct && (() => props.onProduct?.(p))}
              onAdd={props.onAddToCart && (() => props.onAddToCart?.(p))}
            />
          ))}
    </ScrollView>
  );

  const banner =
    props.banner === undefined ? (
      <Skeleton height={150} radius={BANNER_RADIUS} />
    ) : props.banner === null ? null : (
      <PressableScale
        accessibilityRole={props.onBanner ? "button" : undefined}
        accessibilityLabel={`${props.banner.title}. ${props.banner.buttonLabel}`}
        disabled={props.onBanner === undefined}
        onPress={props.onBanner}
        pressedScale={0.985}
        style={styles.banner}
      >
        {props.banner.imageUrl ? (
          <Image source={{ uri: props.banner.imageUrl }} contentFit="cover" transition={200} style={styles.bannerPhoto} />
        ) : (
          <ForestBackdrop grid={false} />
        )}
        {/* Deep green behind the words on the left, the photo showing through on the right */}
        <LinearGradient
          colors={[colors.forestDeep, "rgba(11,26,7,0.86)", "rgba(11,26,7,0.15)"]}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bannerCopy}>
          <View style={styles.bannerTag}>
            <Text numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.bannerTagText}>
              {props.banner.tag}
            </Text>
          </View>
          <Text accessibilityRole="header" numberOfLines={2} maxFontSizeMultiplier={MAX_TEXT} style={styles.bannerTitle}>
            {props.banner.title}
          </Text>
          <Text numberOfLines={2} maxFontSizeMultiplier={MAX_TEXT} style={styles.bannerSub}>
            {props.banner.subtitle}
          </Text>
          <View style={styles.bannerButton}>
            <Text numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.bannerButtonText}>
              {props.banner.buttonLabel}
            </Text>
          </View>
        </View>
      </PressableScale>
    );

  const showFarms = props.farms === undefined || props.farms.length > 0;
  const farms = showFarms ? (
    <View style={styles.farmsCard}>
      <ForestBackdrop grid={false} glow="left" />
      <View style={styles.farmsHead}>
        <Text accessibilityRole="header" maxFontSizeMultiplier={MAX_TEXT} style={styles.farmsTitle}>
          Farmers near you
        </Text>
        <Text maxFontSizeMultiplier={MAX_TEXT} style={styles.farmsSub}>
          Order straight from their farm
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.farms}>
        {props.farms === undefined
          ? [0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.farm}>
                <View style={[styles.farmRing, styles.farmRingLoading]} />
              </View>
            ))
          : props.farms.map((farm) => (
              <PressableScale
                key={farm.id}
                accessibilityRole={props.onFarm ? "button" : undefined}
                accessibilityLabel={`${farm.name}, ${farm.area}`}
                disabled={props.onFarm === undefined}
                onPress={() => props.onFarm?.(farm)}
                style={styles.farm}
              >
                <View style={styles.farmRing}>
                  {farm.photoUrl ? (
                    <Image source={{ uri: farm.photoUrl }} contentFit="cover" transition={150} style={styles.farmPhoto} />
                  ) : (
                    <View style={[styles.farmPhoto, styles.farmInitials]}>
                      <Text style={styles.farmInitialsText}>{initials(farm.name)}</Text>
                    </View>
                  )}
                </View>
                <Text numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.farmName}>
                  {farm.name}
                </Text>
                <Text numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.farmArea}>
                  {farm.area}
                </Text>
              </PressableScale>
            ))}
      </ScrollView>
    </View>
  ) : null;

  const first = props.name?.trim().split(/\s+/)[0];

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {/* Header, as in the reference: who you are and your area, cart and alerts, then search */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, paddingHorizontal: side }]}>
        <View style={styles.inner}>
          <View style={styles.headRow}>
            <View style={styles.avatar}>
              {props.name ? <Text style={styles.avatarText}>{initials(props.name)}</Text> : <User size={18} color={colors.lime} variant="solid" />}
            </View>
            <View style={styles.who}>
              <Text accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.name}>
                {first ? `${props.greeting}, ${first}` : props.greeting}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delivery area: ${props.areaLabel}. Change area`} hitSlop={6} onPress={props.onChangeArea} style={styles.area}>
                <Pin size={13} color={colors.limeInk} variant="solid" />
                <Text numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.areaText}>
                  {props.areaLabel}
                </Text>
                <ChevronDown size={11} color={colors.inkMuted} />
              </Pressable>
            </View>
            {props.onCart ? <IconButton icon={Cart} label="Cart" count={props.cartCount} tone="lime" onPress={props.onCart} /> : null}
            <IconButton icon={Bell} label="Notifications" count={props.unreadAlerts} tone="red" onPress={props.onAlerts} />
          </View>

          <Pressable accessibilityRole={props.onSearch ? "search" : undefined} accessibilityLabel="Search produce" disabled={props.onSearch === undefined} onPress={props.onSearch} style={({ pressed }) => [styles.search, pressed && styles.searchPressed]}>
            <Search size={18} color={colors.inkMuted} />
            <Text numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.searchText}>
              Search tomatoes, yam, ugwu...
            </Text>
            <View style={styles.filter}>
              <Sliders size={17} color={colors.limeInk} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={[styles.content, { paddingHorizontal: side }]}>
        <Stagger>
          {banner}

          <View style={styles.section}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={row.style} contentContainerStyle={[styles.categories, { paddingHorizontal: side - CATEGORY_INSET }]}>
              {props.categories === undefined
                ? [0, 1, 2, 3, 4].map((i) => (
                    <View key={i} style={styles.categoryLoading}>
                      <Skeleton width={sizes.categoryTile} height={sizes.categoryTile} radius={radii.lg} />
                    </View>
                  ))
                : props.categories.map((c) => <CategoryTile key={c.id} name={c.name} illustration={c.illustration} onPress={() => props.onCategory?.(c)} />)}
            </ScrollView>
            {props.onAllCategories ? (
              <PressableScale accessibilityRole="button" onPress={props.onAllCategories} style={styles.moreCategories}>
                <Grid size={15} color={colors.limeInk} variant="solid" />
                <Text style={styles.moreCategoriesText}>View more categories</Text>
              </PressableScale>
            ) : null}
          </View>

          {farms}

          {props.sections === undefined ? (
            <View style={styles.section}>
              {section("Fresh Picks")}
              {productRow(undefined)}
            </View>
          ) : props.sections.length === 0 ? (
            <View style={styles.section}>
              {section("Fresh Picks")}
              <View style={styles.emptyRow}>
                <Text variant="label" color={colors.forest}>
                  Fresh produce is on its way
                </Text>
                <Text variant="small">Farms near you are setting up their stalls. Their produce will show up here.</Text>
              </View>
            </View>
          ) : null}

          {(props.sections ?? []).map((r) => (
            <View key={r.key} style={styles.section}>
              {r.key === "almost_gone" ? (
                <AlmostGoneRow
                  products={r.items.map((p) => ({ ...p, left: p.left ?? 1 }))}
                  onProduct={props.onProduct && ((p) => props.onProduct?.(p))}
                  onAdd={props.onAddToCart && ((p) => props.onAddToCart?.(p))}
                />
              ) : (
                <>
                  {section(r.title, r.seeAll ? props.onSeeAll : undefined)}
                  {productRow(r.items)}
                </>
              )}
            </View>
          ))}
        </Stagger>
      </View>
    </ScrollView>
  );
}

/** An outlined square button in the header, with a count bubble. */
function IconButton({ icon: Icon, label, count = 0, tone, onPress }: { icon: IconComponent; label: string; count?: number; tone: "lime" | "red"; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${label}, ${count}` : label}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [styles.glassButton, pressed && styles.glassPressed]}
    >
      <Icon size={19} color={colors.ink} />
      {count > 0 ? (
        <View pointerEvents="none" style={[styles.count, tone === "lime" ? styles.countLime : styles.countRed]}>
          <Text maxFontSizeMultiplier={1} style={[styles.countText, tone === "lime" && styles.countTextLime]}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const BANNER_RADIUS = 20;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  scroll: { paddingBottom: spacing.xxl },
  shrink: { flexShrink: 1 },
  // Header
  header: { backgroundColor: colors.white, paddingBottom: spacing.xs },
  inner: { width: "100%", maxWidth: 640, alignSelf: "center", gap: spacing.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.lime },
  who: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.ink },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  glassPressed: { backgroundColor: colors.surfaceSoft },
  count: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  countRed: { backgroundColor: colors.badge },
  countLime: { backgroundColor: colors.lime },
  countText: { fontFamily: fonts.bold, fontSize: 9.5, lineHeight: 11, color: colors.white },
  countTextLime: { color: colors.forestDeep },
  area: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", maxWidth: "100%" },
  areaText: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.inkSoft },
  search: {
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
  },
  searchPressed: { backgroundColor: colors.surfaceSoft },
  searchText: { flex: 1, fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 18, color: colors.inkMuted },
  filter: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderLeftWidth: 0 },
  // Body
  content: { width: "100%", maxWidth: 640, alignSelf: "center", paddingTop: spacing.md, gap: spacing.xl },
  section: { gap: spacing.sm + 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.ink },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.limeInk },
  cards: { gap: CARD_GAP },
  categories: { gap: spacing.xxs },
  categoryLoading: { width: sizes.categoryTile + 8, height: sizes.categoryTile + 37, alignItems: "center" },
  moreCategories: {
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: borders.hairline,
    borderColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  moreCategoriesText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  emptyRow: { backgroundColor: colors.tint, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xxs },
  // Banner
  banner: { height: 150, borderRadius: BANNER_RADIUS, overflow: "hidden", backgroundColor: colors.forestDeep, justifyContent: "center" },
  bannerPhoto: { position: "absolute", top: 0, bottom: 0, right: 0, width: "62%" },
  bannerCopy: { width: "64%", paddingHorizontal: spacing.lg, gap: 5, alignItems: "flex-start" },
  bannerTag: { backgroundColor: colors.lime, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, maxWidth: "100%" },
  bannerTagText: { fontFamily: fonts.bold, fontSize: 10, lineHeight: 13, letterSpacing: 0.3, color: colors.forestDeep },
  bannerTitle: { fontFamily: fonts.displayBold, fontSize: 17, lineHeight: 21, letterSpacing: -0.3, color: colors.white },
  bannerSub: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, color: colors.onForest },
  bannerButton: { marginTop: 3, height: 30, borderRadius: radii.pill, backgroundColor: colors.lime, paddingHorizontal: spacing.md + 2, justifyContent: "center" },
  bannerButtonText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.forestDeep },
  // Farmers near you
  farmsCard: { borderRadius: 20, overflow: "hidden", backgroundColor: colors.forestDeep, paddingVertical: spacing.md + 2, gap: spacing.md },
  farmsHead: { paddingHorizontal: spacing.lg, gap: 1 },
  farmsTitle: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2, color: colors.white },
  farmsSub: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.onForest },
  farms: { paddingHorizontal: spacing.lg, gap: spacing.md },
  farm: { width: 66, alignItems: "center", gap: 3 },
  farmRing: { width: FARM_PHOTO + 6, height: FARM_PHOTO + 6, borderRadius: (FARM_PHOTO + 6) / 2, borderWidth: borders.strong, borderColor: colors.lime, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  farmRingLoading: { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
  farmPhoto: { width: FARM_PHOTO, height: FARM_PHOTO, borderRadius: FARM_PHOTO / 2, backgroundColor: colors.forestMid },
  farmInitials: { alignItems: "center", justifyContent: "center" },
  farmInitialsText: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.lime },
  farmName: { alignSelf: "stretch", textAlign: "center", fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, color: colors.white },
  farmArea: { alignSelf: "stretch", textAlign: "center", fontFamily: fonts.medium, fontSize: 10, lineHeight: 13, color: colors.lime },
});
