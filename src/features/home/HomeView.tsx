// M-10 Home, following the Figma "Home Dashboard" design: area chip, search,
// escrow promise, categories, Fresh Picks, Picked Today, the featured banner
// and Farmers Near You. The layout is fluid: blocks fill the screen's width,
// the rows scroll sideways, and text follows the phone's font size.
// This file only draws: the route (app/(shop)/home.tsx) supplies the data.
import { Image } from "expo-image";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Stagger } from "@/components/motion/reveal";
import { BellButton, CategoryTile, EscrowCard, LocationChip, PressableScale, ProductCard, SearchPill, Skeleton, Text } from "@/components/ui";
import { colors, radii, sizes, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useScreenWidth } from "@/theme/useScreenSize";

export type HomeCategory = { id: string; name: string; illustration: string };
export type HomeProduct = { id: string; name: string; priceKobo: number; unit: string; imageUrl: string | null };
export type HomeBanner = { tag: string; title: string; subtitle: string; buttonLabel: string; imageUrl: string | null };
export type HomeFarm = { id: string; name: string; area: string; photoUrl: string | null };

type Props = {
  /** "Good Morning, Franklyn" */
  greeting: string;
  areaLabel: string;
  unreadAlerts: number;
  onAlerts: () => void;
  // `undefined` means still loading: the block shows grey placeholders.
  categories: HomeCategory[] | undefined;
  freshPicks: HomeProduct[] | undefined;
  pickedToday: HomeProduct[] | undefined;
  banner: HomeBanner | null | undefined;
  farms: HomeFarm[] | undefined;
  // A part with no handler is drawn but doesn't respond to taps.
  onChangeArea: () => void;
  onSearch?: () => void;
  onCategory?: (category: HomeCategory) => void;
  onSeeAllFresh?: () => void;
  onSeeAllPicked?: () => void;
  onProduct?: (product: HomeProduct) => void;
  onAddToCart?: (product: HomeProduct) => void;
  onBanner?: () => void;
  onFarm?: (farm: HomeFarm) => void;
};

const CARD_GAP = spacing.sm + 2;
const FARM_PHOTO = 68;
// A category tile sits this far inside its label's width; the row starts that much early so the first tile is on the margin.
const CATEGORY_INSET = 4;
// Large-text settings grow the type up to this much; past it the rows would stop fitting.
const MAX_TEXT = 1.3;
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function HomeView(props: Props) {
  const width = useScreenWidth();
  // Narrow phones get a slimmer margin.
  const side = width < 360 ? spacing.lg : spacing.screen;
  // Two cards and over half of a third show at once, so the row reads as scrollable.
  const cardWidth = Math.round(clamp((width - side - 2 * CARD_GAP) / 2.6, 120, 168));
  const bannerPhoto = Math.round(clamp(width * 0.3, 88, 128));
  // Rows scroll edge to edge, with their first item on the screen margin.
  const row = { style: { marginHorizontal: -side }, contentContainerStyle: { paddingHorizontal: side } };

  const section = (title: string, onSeeAll?: () => void) => (
    <View style={styles.sectionHeader}>
      <Text variant="section" accessibilityRole="header" maxFontSizeMultiplier={MAX_TEXT} style={styles.shrink}>
        {title}
      </Text>
      {onSeeAll !== undefined && (
        <Pressable accessibilityRole="link" accessibilityLabel={`See all ${title}`} hitSlop={12} onPress={onSeeAll}>
          <Text variant="label" color={colors.lime} maxFontSizeMultiplier={MAX_TEXT}>
            See all
          </Text>
        </Pressable>
      )}
    </View>
  );

  const productRow = (products: HomeProduct[] | undefined, empty: ReactNode) => {
    if (products !== undefined && products.length === 0) return empty;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={row.style} contentContainerStyle={[row.contentContainerStyle, styles.cards]}>
        {products === undefined
          ? [0, 1, 2].map((i) => <Skeleton key={i} width={cardWidth} height={cardWidth + 64} radius={radii.lg} />)
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
  };

  const showPickedToday = props.pickedToday === undefined || props.pickedToday.length > 0;
  const showFarms = props.farms === undefined || props.farms.length > 0;

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingHorizontal: side }]}>
      <Stagger>
        <View style={styles.header}>
          <Text variant="section" accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.greeting}>
            {props.greeting}
          </Text>
          <View style={styles.headerRow}>
            <View style={styles.shrink}>
              <LocationChip label={props.areaLabel} onPress={props.onChangeArea} />
            </View>
            <BellButton unread={props.unreadAlerts} onPress={props.onAlerts} />
          </View>
        </View>

        <SearchPill mode="button" onPress={props.onSearch} />

        <EscrowCard />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={row.style} contentContainerStyle={[styles.categories, { paddingHorizontal: side - CATEGORY_INSET }]}>
          {props.categories === undefined
            ? [0, 1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.categoryLoading}>
                  <Skeleton width={sizes.categoryTile} height={sizes.categoryTile} radius={radii.lg} />
                </View>
              ))
            : props.categories.map((c) => (
                <CategoryTile key={c.id} name={c.name} illustration={c.illustration} onPress={() => props.onCategory?.(c)} />
              ))}
        </ScrollView>

        <View style={styles.section}>
          {section("Fresh Picks", props.onSeeAllFresh)}
          {productRow(
            props.freshPicks,
            <View style={styles.emptyRow}>
              <Text variant="label" color={colors.forest}>
                Fresh produce is on its way
              </Text>
              <Text variant="small">Farms near you are setting up their stalls. Their produce will show up here.</Text>
            </View>,
          )}
        </View>

        {/* Only when something was harvested today */}
        {showPickedToday && (
          <View style={styles.section}>
            {section("Picked Today", props.onSeeAllPicked)}
            {productRow(props.pickedToday, null)}
          </View>
        )}

        {props.banner === undefined ? (
          <Skeleton height={170} radius={BANNER_RADIUS} />
        ) : props.banner === null ? null : (
          <View style={styles.banner}>
            {/* Forest on the left fading towards tint off the right edge; stretches with the banner. */}
            <Svg style={styles.fill} width="100%" height="100%" viewBox="0 0 350 175" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="banner" gradientUnits="userSpaceOnUse" x1={131} y1={-36} x2={721} y2={128}>
                  <Stop offset={0} stopColor={colors.forest} />
                  <Stop offset={1} stopColor={colors.tint} />
                </LinearGradient>
              </Defs>
              <Rect width={350} height={175} fill="url(#banner)" />
            </Svg>
            <View style={styles.bannerCopy}>
              <View style={styles.bannerTag}>
                <Text variant="small" color={colors.ink} numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.medium}>
                  {props.banner.tag}
                </Text>
              </View>
              <Text variant="section" color={colors.white} accessibilityRole="header" numberOfLines={3} maxFontSizeMultiplier={MAX_TEXT}>
                {props.banner.title}
              </Text>
              <Text variant="small" color="rgba(255,255,255,0.8)" numberOfLines={3} maxFontSizeMultiplier={MAX_TEXT}>
                {props.banner.subtitle}
              </Text>
              <PressableScale
                accessibilityRole={props.onBanner ? "button" : undefined}
                disabled={props.onBanner === undefined}
                onPress={props.onBanner}
                style={styles.bannerButton}
              >
                <Text variant="button" color={colors.ink} numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT}>
                  {props.banner.buttonLabel}
                </Text>
              </PressableScale>
            </View>
            {props.banner.imageUrl ? (
              <Image
                source={{ uri: props.banner.imageUrl }}
                contentFit="cover"
                transition={150}
                style={[styles.photo, { width: bannerPhoto, height: bannerPhoto, borderRadius: bannerPhoto / 2 }]}
              />
            ) : (
              <View style={[styles.photo, { width: bannerPhoto, height: bannerPhoto, borderRadius: bannerPhoto / 2 }]} />
            )}
          </View>
        )}

        {showFarms && (
          <View style={styles.farmsSection}>
            <Text variant="section" accessibilityRole="header" maxFontSizeMultiplier={MAX_TEXT}>
              Farmers Near You
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={row.style} contentContainerStyle={[row.contentContainerStyle, styles.farms]}>
              {props.farms === undefined
                ? [0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.farmLoading}>
                      <Skeleton width={FARM_PHOTO} height={FARM_PHOTO} radius={FARM_PHOTO / 2} />
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
                      {farm.photoUrl ? (
                        <Image source={{ uri: farm.photoUrl }} contentFit="cover" transition={150} style={[styles.photo, styles.farmPhoto]} />
                      ) : (
                        <View style={[styles.photo, styles.farmPhoto]} />
                      )}
                      <View style={styles.farmCopy}>
                        <Text variant="small" color={colors.ink} align="center" numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.bold}>
                          {farm.name}
                        </Text>
                        <Text variant="small" color={colors.lime} align="center" numberOfLines={1} maxFontSizeMultiplier={MAX_TEXT} style={styles.farmArea}>
                          {farm.area}
                        </Text>
                      </View>
                    </PressableScale>
                  ))}
            </ScrollView>
          </View>
        )}
      </Stagger>
    </ScrollView>
  );
}

const BANNER_RADIUS = 22;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  // Tablets and wide windows keep the content in a readable column.
  content: { width: "100%", maxWidth: 640, alignSelf: "center", paddingTop: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  shrink: { flexShrink: 1 },
  header: { gap: spacing.sm },
  greeting: { fontFamily: fonts.bold, letterSpacing: -0.2 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  medium: { fontFamily: fonts.medium },
  bold: { fontFamily: fonts.bold },
  fill: { position: "absolute", left: 0, top: 0, right: 0, bottom: 0 },
  photo: { backgroundColor: colors.placeholder },
  categories: { gap: spacing.xxs },
  categoryLoading: { width: sizes.categoryTile + 8, height: sizes.categoryTile + 37, alignItems: "center" },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  cards: { gap: CARD_GAP },
  emptyRow: { backgroundColor: colors.tint, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.xxs },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: BANNER_RADIUS,
    overflow: "hidden",
    backgroundColor: colors.forest,
  },
  bannerCopy: { flex: 1, alignItems: "flex-start", gap: spacing.xs },
  bannerTag: { maxWidth: "100%", backgroundColor: colors.lime, borderRadius: 9, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xxs },
  bannerButton: {
    maxWidth: "100%",
    minHeight: 40,
    justifyContent: "center",
    backgroundColor: colors.lime,
    borderRadius: 13,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.xxs,
  },
  farmsSection: { gap: spacing.md },
  farms: { gap: spacing.md },
  farm: { width: 84, alignItems: "center", gap: spacing.xs },
  farmLoading: { width: 84, height: FARM_PHOTO + 36, alignItems: "center" },
  farmPhoto: { width: FARM_PHOTO, height: FARM_PHOTO, borderRadius: FARM_PHOTO / 2 },
  farmCopy: { alignSelf: "stretch" },
  farmArea: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14 },
});
