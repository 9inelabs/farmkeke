// M-10 Home. The layout is HomeView; this route gives it live data and opens
// search, categories, products, farms and the add-to-cart sheet.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeView } from "@/features/home/HomeView";
import { useShopContext } from "@/features/shop/useShopContext";
import { greeting } from "@/lib/greeting";
import { formatNaira } from "@/lib/money";
import { useShopUi } from "@/store/shopUi";
import { colors } from "@/theme/tokens";

export default function Home() {
  const { today, area } = useShopContext();
  const openAdd = useShopUi((s) => s.openAdd);
  const categories = useQuery(api.catalog.listCategories);
  const viewer = useQuery(api.users.viewer);
  const unread = useQuery(api.notifications.unreadCount, { side: "shop" }) ?? 0;
  const firstName = viewer && !viewer.isGuest ? viewer.name?.trim().split(/\s+/)[0] : undefined;
  const home = useQuery(api.storefront.home, { today, state: area?.state, lga: area?.lga });
  // Fresh Picks' "See all": the Categories tab, showing every product
  const openAllProducts = () => router.navigate({ pathname: "/categories", params: { c: "all", at: String(Date.now()) } });
  const categorySlug = new Map<string, { slug: string; name: string }>(categories?.map((c) => [c._id, { slug: c.slug, name: c.name }]));

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <HomeView
        greeting={firstName ? `${greeting()}, ${firstName}` : greeting()}
        unreadAlerts={unread}
        onAlerts={() => router.push("/notifications")}
        areaLabel={area ? `${area.name}, ${area.state}` : "Choose your area"}
        categories={categories?.map((c) => ({ id: c._id, name: c.name, illustration: c.illustration }))}
        // An older backend sends only Fresh Picks
        sections={home === undefined ? undefined : (home.sections ?? [{ key: "fresh", title: "Fresh Picks", seeAll: true, items: home.freshPicks }])}
        banner={
          home === undefined
            ? undefined
            : home.banner && {
                tag: home.banner.tag,
                title: home.banner.title,
                subtitle: `From ${formatNaira(home.banner.listing.priceKobo)} per ${home.banner.listing.unit} • ${home.banner.farmName}`,
                buttonLabel: home.banner.buttonLabel,
                imageUrl: home.banner.listing.imageUrl,
              }
        }
        farms={home?.farms}
        onChangeArea={() => router.push({ pathname: "/choose-area", params: { from: "home" } })}
        onSearch={() => router.push("/search")}
        onCategory={(c) => {
          const cat = categorySlug.get(c.id);
          if (cat) router.push({ pathname: "/category/[slug]", params: cat });
        }}
        onSeeAll={openAllProducts}
        onProduct={(p) => router.push(`/product/${p.id}`)}
        onAddToCart={(p) => openAdd(p.id)}
        onBanner={home?.banner ? () => router.push(`/product/${home.banner!.listing.id}`) : undefined}
        onFarm={(f) => router.push(`/farm/${f.id}`)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
