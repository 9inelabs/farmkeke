// Dev-only: Home drawn with the sample content of the Figma "Home Dashboard"
// design, for checking the layout against it at different screen sizes.
// Not reachable in release builds.
import { Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeView } from "@/features/home/HomeView";
import { SAMPLE_SECTIONS } from "@/features/home/samples";
import { TabBar } from "@/features/shell/TabBar";
import { colors } from "@/theme/tokens";


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
        greeting="Good Morning, Franklyn"
        unreadAlerts={1}
        onAlerts={() => {}}
        areaLabel="New Owerri, Imo"
        categories={CATEGORIES}
          sections={SAMPLE_SECTIONS}
        banner={{
          tag: "Harvest of the week",
          title: "New-Season yam from Okigwe",
          subtitle: "From ₦3,200 per tuber • Bello Harvest",
          buttonLabel: "Shop Yam",
          imageUrl: null,
        }}
        farms={FARMS}
        onChangeArea={() => {}}
          onSeeAll={() => {}}
      />
      <TabBar state={{ index: 0, routes: ROUTES }} navigation={{ emit: () => ({ defaultPrevented: true }), navigate: () => {} }} badges={{ cart: 3 }} />
    </SafeAreaView>
  );
}
