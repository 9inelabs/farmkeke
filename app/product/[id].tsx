// M-17 Product detail, from the "Product detail" design: photos with the
// quantity stepper, price per unit, other units, the farm, delivery and
// pickup, then "Add To Cart", which adds the chosen unit and quantity
// straight away. M-18 opens a photo full screen. M-22 when the listing is
// sold out, paused or removed.
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { BoxRemove, Cart, ChevronLeft } from "@/components/icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Skeleton, StatusScreen, Text } from "@/components/ui";
import { SignInPromptSheet } from "@/features/auth/SignInPromptSheet";
import { ProductDetailView } from "@/features/product/ProductDetailView";
import { PhotoViewer } from "@/features/shop/PhotoViewer";
import { ProductRow } from "@/features/shop/ProductRow";
import { useShopContext } from "@/features/shop/useShopContext";
import { useCart, useCartSummary } from "@/store/cart";
import { showToast } from "@/store/toast";
import { colors, radii, shadow, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

export default function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { today, serviceAreaId } = useShopContext();
  const product = useQuery(api.storefront.product, { id, today, ...(serviceAreaId ? { serviceAreaId } : {}) });
  const viewer = useQuery(api.users.viewer);
  const saved = useQuery(api.favorites.isSaved, { listingId: id });
  const toggleSave = useMutation(api.favorites.toggle);
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const { count } = useCartSummary();
  const [qty, setQty] = useState<number | null>(null);
  const insets = useSafeAreaInsets();
  const [unitId, setUnitId] = useState<string>();
  const [photo, setPhoto] = useState<number | null>(null);
  const [askSignIn, setAskSignIn] = useState(false);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  if (product === undefined) {
    return (
      <SafeAreaView style={styles.screen}>
        <Skeleton height={320} radius={0} />
        <View style={styles.loading}>
          <Skeleton height={28} width={220} />
          <Skeleton height={22} width={140} />
          <Skeleton height={72} radius={radii.control} />
        </View>
      </SafeAreaView>
    );
  }

  // M-22: removed, paused, sold out or the farm is away
  if (product === null || !("id" in product) || (product.available === false && product.reason !== "farm_on_break")) {
    const name = product?.name ?? null;
    const reason = product && "reason" in product ? product.reason : "removed";
    return (
      <StatusScreen
        icon={BoxRemove}
        tone="brand"
        title={name ? `${name} isn't available` : "This product isn't available"}
        message={
          reason === "farm_unavailable"
            ? "The farm isn't selling on Farmkeke right now."
            : reason === "removed"
              ? "The farm has removed this product."
              : "The farm has paused this product for now. Here are similar ones you can buy."
        }
        actions={<Button label="Keep shopping" onPress={() => router.replace("/home")} />}
      >
        {product?.similar && product.similar.length > 0 ? (
          <View style={styles.similarInStatus}>
            <ProductRow title="Similar items" items={product.similar} />
          </View>
        ) : null}
      </StatusScreen>
    );
  }

  const onBreak = product.available === false;
  const unit = product.units.find((u) => u.unitId === unitId) ?? product.units.find((u) => u.stock > 0) ?? product.units[0];
  const canBuy = !onBreak && product.inStock && unit !== undefined && unit.stock > 0;
  // The stepper runs from the minimum order up to what's left after what's already in the cart.
  const min = Math.max(1, unit?.minOrder ?? 1);
  const already = lines.find((l) => l.listingId === product.id && l.unitId === unit?.unitId)?.quantity ?? 0;
  const room = Math.max(0, (unit?.stock ?? 0) - already);
  const quantity = Math.min(Math.max(qty ?? min, min), Math.max(room, min));
  const full = room < min;

  const addToCart = () => {
    if (!unit || full) return;
    add({
      listingId: product.id,
      unitId: unit.unitId,
      quantity,
      priceKobo: unit.priceKobo,
      name: product.name,
      unitSingular: unit.singular,
      unitPlural: unit.plural,
      farmId: product.farm.id,
      farmName: product.farm.name,
      imageUrl: product.photos[0] ?? null,
      minOrder: unit.minOrder,
      stock: unit.stock,
    });
    setQty(null);
    showToast({ message: `${product.name} added to your cart`, action: { label: "View cart", href: "/cart" } });
  };

  const save = async () => {
    if (!viewer || viewer.isGuest) return setAskSignIn(true);
    await toggleSave({ listingId: product.id });
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        <ProductDetailView
          name={product.name}
          photos={product.photos}
          units={product.units}
          description={product.description ?? undefined}
          harvestedOn={product.harvestedOn ?? undefined}
          delivery={product.delivery}
          pickup={product.pickup}
          farm={product.farm}
          selectedUnitId={unit?.unitId}
          onSelectUnit={(next) => {
            setUnitId(next);
            setQty(null);
          }}
          quantity={canBuy && !full ? { value: quantity, min, max: Math.max(room, min), onChange: setQty } : undefined}
          saved={{ value: saved === true, onToggle: () => void save() }}
          onPhotoPress={product.photos.length > 0 ? setPhoto : undefined}
          onFarmPress={() => router.push(`/farm/${product.farm.id}`)}
          deliveryNote={`${product.deliveryArea ? `To ${product.deliveryArea.name}. ` : ""}Priced after the farm accepts, then you pay one bill`}
          pickupNote={`Collect from the farm in ${product.farm.lga}. No fee`}
        />
        <View style={styles.rows}>
          <ProductRow title={`More from ${product.farm.name}`} items={product.moreFromFarm} />
          <ProductRow title="Similar items" items={product.similar} />
        </View>
      </ScrollView>

      <View style={[styles.topBar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={styles.back}>
          <ChevronLeft size={20} color={colors.ink} strokeWidth={2} />
          <Text variant="bodyMedium">Back</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={count > 0 ? `Cart, ${count} items` : "Cart"}
          onPress={() => router.navigate("/cart")}
          style={styles.round}
        >
          <Cart size={24} color={colors.ink} />
          {count > 0 && (
            <View style={styles.badge}>
              <Text variant="small" color={colors.white} maxFontSizeMultiplier={1} style={styles.badgeText}>
                {count > 9 ? "9+" : count}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={[styles.buyBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {onBreak ? (
          <Text variant="label" color={colors.pendingInk} align="center">
            {product.farm.name} is taking a short break. Check back soon.
          </Text>
        ) : (
          <Button
            label={!canBuy ? "Sold out" : full ? "All in your cart" : "Add To Cart"}
            icon={canBuy && !full ? Cart : undefined}
            size="large"
            pill
            fullWidth
            disabled={!canBuy || full}
            onPress={addToCart}
          />
        )}
      </View>

      <PhotoViewer photos={product.photos} start={photo} name={product.name} onClose={() => setPhoto(null)} />
      <SignInPromptSheet
        visible={askSignIn}
        onClose={() => setAskSignIn(false)}
        title="Sign in to save items"
        message="Keep a list of produce you love, and we'll tell you when sold-out items are back."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  loading: { padding: spacing.screen, gap: spacing.md },
  rows: { gap: spacing.xxl, paddingTop: spacing.xxl },
  similarInStatus: { marginHorizontal: -spacing.screen, alignSelf: "stretch" },
  topBar: {
    position: "absolute",
    left: spacing.screen,
    right: spacing.screen,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 40,
    paddingLeft: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.pending,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 10, lineHeight: 12, fontFamily: fonts.semibold },
  buyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
});
