// M-04 Get started (Figma: Start Shopping).
import { Image } from "expo-image";
import { router } from "expo-router";
import { Bike, Leaf, Lock, type LucideIcon } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { Button, Screen, Text, Wordmark } from "@/components/ui";
import { usePrefs } from "@/store/prefs";
import { colors, radii, spacing } from "@/theme/tokens";

const POINTS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Leaf, title: "Picked fresh, priced fairly", body: "Farmers sell to you directly, with no middlemen." },
  { icon: Bike, title: "Delivery or pickup", body: "Choose what suits you at checkout" },
  { icon: Lock, title: "Pay safely", body: "Your money is held until you confirm delivery" },
];

export default function GetStarted() {
  const setOnboardingSeen = usePrefs((s) => s.setOnboardingSeen);
  const area = usePrefs((s) => s.area);

  const startShopping = () => {
    setOnboardingSeen();
    router.replace(area ? "/home" : "/location");
  };

  return (
    <Screen
      scroll
      contentStyle={styles.content}
      footer={
        <View style={styles.footer}>
          <Button label="Start Shopping" onPress={startShopping} style={styles.cta} />
          <Text variant="small" align="center">
            No account needed •{" "}
            <Text
              variant="small"
              color={colors.forest}
              accessibilityRole="link"
              onPress={() => {
                setOnboardingSeen();
                router.push("/sign-in");
              }}
              style={styles.link}
            >
              Sign in to create an account
            </Text>
          </Text>
        </View>
      }
    >
      <View style={styles.mark}>
        <Wordmark width={117} />
      </View>
      <Image
        source={require("../../assets/illustrations/start-shopping.jpg")}
        style={styles.illustration}
        contentFit="contain"
        accessible={false}
      />
      <Text variant="section" align="center" accessibilityRole="header" style={styles.title}>
        Shop fresh produce straight from Nigerian farms
      </Text>
      <View style={styles.points}>
        {POINTS.map(({ icon: Icon, title, body }) => (
          <View key={title} style={styles.point}>
            <View style={styles.pointIcon}>
              <Icon size={12} color={colors.lime} strokeWidth={2.5} />
            </View>
            <View style={styles.pointCopy}>
              <Text variant="label" color={colors.forest}>
                {title}
              </Text>
              <Text variant="small">{body}</Text>
            </View>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "stretch", paddingHorizontal: 31 },
  mark: { alignItems: "center", marginTop: spacing.xxl },
  illustration: { width: "100%", aspectRatio: 338 / 306, marginTop: spacing.xxl },
  title: { marginTop: spacing.xxl, paddingHorizontal: spacing.lg },
  points: { gap: 5, marginTop: spacing.xl },
  point: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.tint,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.forest,
    alignItems: "center",
    justifyContent: "center",
  },
  pointCopy: { flex: 1, gap: 1 },
  footer: { alignItems: "center", gap: spacing.md },
  cta: { minWidth: 192 },
  link: { textDecorationLine: "underline" },
});
