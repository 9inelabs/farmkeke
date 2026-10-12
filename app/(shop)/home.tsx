// M-10 Home. The layout is HomeView; this route gives it live data.
// Search, product pages, farm pages and the cart aren't built yet, so those
// parts are drawn but don't open anything until their screens exist.
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeView } from "@/features/home/HomeView";
import { formatNaira } from "@/lib/money";
import { usePrefs } from "@/store/prefs";
import { colors } from "@/theme/tokens";

// The phone's own date, "YYYY-MM-DD": what "Picked Today" means for this shopper.
const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function Home() {
  const area = usePrefs((s) => s.area);
  const [today] = useState(localDay);
  const categories = useQuery(api.catalog.listCategories);
  const home = useQuery(api.storefront.home, { today, state: area?.state, lga: area?.lga });
  const openCategories = () => router.push("/categories");

  return (
    <SafeAreaView edges={["top"]} style={styles.screen}>
      <HomeView
        areaLabel={area ? `${area.name}, ${area.state}` : "Choose your area"}
        categories={categories?.map((c) => ({ id: c._id, name: c.name, illustration: c.illustration }))}
        freshPicks={home?.freshPicks}
        pickedToday={home?.pickedToday}
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
        onCategory={openCategories}
        onSeeAllFresh={openCategories}
        onSeeAllPicked={openCategories}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
});
