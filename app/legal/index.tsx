// M-93 Legal: every Farmkeke policy, with the website's wording.
import { router } from "expo-router";
import { Document, Refresh, ShieldCheck, Truck, Ban, Leaf, Sliders } from "@/components/icons";
import { ScrollView, StyleSheet } from "react-native";
import { ListGroup, ListRow, Screen, ScreenHeader } from "@/components/ui";
import { LEGAL, type LegalDoc } from "@/content/legal";
import type { IconComponent } from "@/components/icons";
import { spacing } from "@/theme/tokens";

const ROWS: Array<{ doc: LegalDoc; icon: IconComponent }> = [
  { doc: "terms", icon: Document },
  { doc: "privacy", icon: ShieldCheck },
  { doc: "refunds", icon: Refresh },
  { doc: "delivery", icon: Truck },
  { doc: "acceptable-use", icon: Ban },
  { doc: "farmer-terms", icon: Leaf },
  { doc: "cookies", icon: Sliders },
];

export default function Legal() {
  return (
    <Screen header={<ScreenHeader title="Terms and policies" />}>
      <ScrollView contentContainerStyle={styles.body}>
        <ListGroup>
          {ROWS.map(({ doc, icon }) => (
            <ListRow key={doc} icon={icon} title={LEGAL[doc].title} subtitle={`Updated ${LEGAL[doc].updated}`} onPress={() => router.push(`/legal/${doc}`)} />
          ))}
        </ListGroup>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({ body: { paddingTop: spacing.sm } });
