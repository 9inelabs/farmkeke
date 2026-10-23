// M-17 Product detail: photos, price per unit, harvest date, stock, the farm,
// delivery and pickup, then "Add to cart" (M-19). M-18 opens a photo full
// screen. M-22 when the listing is sold out, paused or removed.
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Heart, PackageX } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Skeleton, StatusScreen, Text } from "@/components/ui";
import { SignInPromptSheet } from "@/features/auth/SignInPromptSheet";
import { ProductDetailView } from "@/features/product/ProductDetailView";
import { PhotoViewer } from "@/features/shop/PhotoViewer";
import { ProductRow } from "@/features/shop/ProductRow";
import { useShopContext } from "@/features/shop/useShopContext";
import { formatNaira } from "@/lib/money";
import { useShopUi } from "@/store/shopUi";
import { colors, radii, shadow, spacing } from "@/theme/tokens";

export default function ProductPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { today, serviceAreaId } = useShopContext();
  const product = useQuery(api.storefront.product, { id, today, ...(serviceAreaId ? { serviceAreaId } : {}) });
  const viewer = useQuery(api.users.viewer);
  const saved = useQuery(api.favorites.isSaved, { listingId: id });
  const toggleSave = useMutation(api.favorites.toggle);
  const openAdd = useShopUi((s) => s.openAdd);
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
        icon={PackageX}
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
  const canBuy = !onBreak && product.inStock;

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
          onSelectUnit={setUnitId}
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
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={styles.round}>
          <ChevronLeft size={22} color={colors.ink} strokeWidth={2.25} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Remove from saved items" : "Save for later"}
          accessibilityState={{ selected: saved === true }}
          onPress={() => void save()}
          style={styles.round}
        >
          <Heart size={20} color={saved ? colors.error : colors.ink} fill={saved ? colors.error : "transparent"} />
        </Pressable>
      </View>

      <View style={[styles.buyBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {onBreak ? (
          <Text variant="label" color={colors.pendingInk} style={styles.flex}>
            {product.farm.name} is taking a short break. Check back soon.
          </Text>
        ) : (
          <>
            <View style={styles.flex}>
              <Text variant="price">{unit ? formatNaira(unit.priceKobo) : ""}</Text>
              <Text variant="small">per {unit?.singular ?? "unit"}</Text>
            </View>
            <Button
              label={canBuy ? "Add to cart" : "Sold out"}
              disabled={!canBuy}
              onPress={() => openAdd(product.id)}
              style={styles.addButton}
            />
          </>
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
  topBar: { position: "absolute", left: spacing.screen, right: spacing.screen, flexDirection: "row", justifyContent: "space-between" },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...shadow.raised,
  },
  buyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 0.5,
    borderTopColor: colors.line,
  },
  flex: { flex: 1 },
  addButton: { minWidth: 160 },
});
