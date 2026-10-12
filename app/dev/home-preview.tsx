// Dev-only: Home drawn with the sample content of the Figma "Home Dashboard"
// design, for checking the layout against it at different screen sizes.
// Not reachable in release builds.
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeView, type HomeProduct } from "@/features/home/HomeView";
import { TabBar } from "@/features/shell/TabBar";
import { colors } from "@/theme/tokens";

const PRODUCTS: HomeProduct[] = [
  { id: "1", name: "Fresh tomatoes", priceKobo: 4_500_00, unit: "basket", imageUrl: null },
  { id: "2", name: "Yam tubers", priceKobo: 5_500_00, unit: "tuber", imageUrl: null },
  { id: "3", name: "Oshombo Pepper", priceKobo: 6_000_00, unit: "basket", imageUrl: null },
];

const CATEGORIES = [
  { id: "1", name: "Vegetables", illustration: "vegetables" },
  { id: "2", name: "Fruits", illustration: "fruits" },
  { id: "3", name: "Grains & Tubers", illustration: "grains-tubers" },
  { id: "4", name: "Poultry & Eggs", illustration: "poultry-eggs" },
  { id: "5", name: "Meat & Fish", illustration: "meat-fish" },
];

const FARMS = [
  { id: "1", name: "Okafor Farms", area: "New Owerri", photoUrl: null },
  { id: "2", name: "Adigun F.", area: "Orji", photoUrl: null },
  { id: "3", name: "Bello Harvest", area: "Mbaise", photoUrl: null },
  { id: "4", name: "Ada Greens", area: "Mbano", photoUrl: null },
];

const ROUTES = ["home", "categories", "cart", "orders", "account"].map((name) => ({ key: name, name }));

export default function HomePreview() {
  if (!__DEV__) return <Redirect href="/" />;

  return (
    // Laid out like the real tabs: the scrolling content with the tab bar under it.
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.white }}>
      <HomeView
        areaLabel="New Owerri, Imo"
        categories={CATEGORIES}
        freshPicks={PRODUCTS}
        pickedToday={PRODUCTS}
        banner={{
          tag: "Harvest of the week",
          title: "New-Season yam from Okigwe",
          subtitle: "From ₦3,200 per tuber • Bello Harvest",
          buttonLabel: "Shop Yam",
          imageUrl: null,
        }}
        farms={FARMS}
        onChangeArea={() => {}}
        onSeeAllFresh={() => {}}
        onSeeAllPicked={() => {}}
      />
      <TabBar state={{ index: 0, routes: ROUTES }} navigation={{ emit: () => ({ defaultPrevented: true }), navigate: () => {} }} badges={{ cart: 3 }} />
    </SafeAreaView>
  );
}
