// M-04 Get started, built to the Figma frame "Start Shopping" (node 12:53).
// Every position, size and font below is measured from that frame;
// useFigmaFrame scales it to the phone, and the content reveals in turn.
import { Image } from "expo-image";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import FarmIcon from "../../assets/icons/feature-farm.svg";
import DeliveryIcon from "../../assets/icons/feature-delivery.svg";
import PayIcon from "../../assets/icons/feature-pay.svg";
import { Wordmark } from "@/components/ui";
import { Reveal } from "@/components/motion/reveal";
import { usePrefs } from "@/store/prefs";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { useFigmaFrame } from "@/theme/useFigmaFrame";

const INTER_12_LINE = 14.53; // Inter's natural line height at 12pt
const INTER_14_LINE = 16.94; // … at 14pt

// Feature rows: frame y of each row, the row's text x (row 2 sits 1pt left in
// the frame), and where its 20pt circle and icon sit.
const ROWS = [
  {
    y: 541,
    textX: 66,
    title: "Picked fresh, priced fairly",
    body: "Farmers sell to you directly, with no middlemen.",
    circle: { x: 41, y: 558, size: 20 },
    Icon: FarmIcon,
    icon: { x: 45, y: 563, w: 12, h: 9 },
  },
  {
    y: 600,
    textX: 65,
    title: "Delivery or pickup",
    body: "Choose what suits you at checkout",
    circle: { x: 41, y: 617.5, size: 19 },
    Icon: DeliveryIcon,
    icon: { x: 45, y: 621.5, w: 11, h: 9 },
  },
  {
    y: 659,
    textX: 66,
    title: "Pay safely",
    body: "Your money is held until you confirm delivery",
    circle: { x: 41, y: 676, size: 20 },
    Icon: PayIcon,
    icon: { x: 44, y: 681, w: 13, h: 9 },
  },
];

export default function GetStarted() {
  const f = useFigmaFrame();
  const setOnboardingSeen = usePrefs((s) => s.setOnboardingSeen);
  const area = usePrefs((s) => s.area);

  const startShopping = () => {
    setOnboardingSeen();
    router.replace(area ? "/home" : "/location");
  };
  const signIn = () => {
    setOnboardingSeen();
    router.push("/sign-in");
  };

  const at = (x: number, y: number, w?: number, h?: number) => ({
    position: "absolute" as const,
    left: f.x(x),
    top: f.y(y),
    ...(w !== undefined && { width: f.size(w) }),
    ...(h !== undefined && { height: f.size(h) }),
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ height: f.y(844) }} bounces={false} showsVerticalScrollIndicator={false}>
      <StatusBar style="dark" />

      <Reveal index={0} style={at(138.9, 92.04)}>
        <Wordmark width={f.size(110.6)} />
      </Reveal>

      {/* Illustration, clipped to the frame's 338 x 306 box */}
      <Reveal index={1} style={[at(21, 147, 338, 306), styles.clip]}>
        <Image
          source={require("../../assets/illustrations/start-shopping.jpg")}
          accessible={false}
          contentFit="fill"
          style={{ position: "absolute", left: f.size(-66.73), top: f.size(-109.78), width: f.size(471.46), height: f.size(470.24) }}
        />
      </Reveal>

      <Reveal index={2} style={at(31, 472.87, 328)}>
        <Text
          accessibilityRole="header"
          allowFontScaling={false}
          style={[styles.noPadding, { fontFamily: fonts.displaySemibold, fontSize: f.size(20), lineHeight: f.size(26), color: colors.ink, textAlign: "center" }]}
        >
          Shop fresh produce straight from Nigerian farms
        </Text>
      </Reveal>

      {ROWS.map(({ y, textX, title, body, circle, Icon, icon }, i) => (
        <Reveal key={title} index={3 + i} style={[at(31, y, 328, 54), styles.row, { borderRadius: f.size(12) }]}>
          <View
            style={{
              position: "absolute",
              left: f.size(circle.x - 31),
              top: f.size(circle.y - y),
              width: f.size(circle.size),
              height: f.size(circle.size),
              borderRadius: f.size(circle.size / 2),
              backgroundColor: colors.forest,
            }}
          />
          <Icon
            width={f.size(icon.w)}
            height={f.size(icon.h)}
            style={{ position: "absolute", left: f.size(icon.x - 31), top: f.size(icon.y - y) }}
          />
          <Text
            allowFontScaling={false}
            style={[
              styles.noPadding,
              { position: "absolute", left: f.size(textX - 31), top: f.size(10.4), fontFamily: fonts.semibold, fontSize: f.size(14), lineHeight: f.size(INTER_14_LINE), color: colors.forest },
            ]}
          >
            {title}
          </Text>
          <Text
            allowFontScaling={false}
            style={[
              styles.noPadding,
              { position: "absolute", left: f.size(textX - 31), top: f.size(29.4), fontFamily: fonts.regular, fontSize: f.size(12), lineHeight: f.size(INTER_12_LINE), color: colors.inkSoft },
            ]}
          >
            {body}
          </Text>
        </Reveal>
      ))}

      <Reveal index={6} style={at(99, 744, 192, 47)}>
        <Pressable
          accessibilityRole="button"
          onPress={startShopping}
          style={({ pressed }) => [styles.button, { borderRadius: f.size(17) }, pressed && styles.pressed]}
        >
          <Text allowFontScaling={false} style={[styles.noPadding, { fontFamily: fonts.semibold, fontSize: f.size(14), lineHeight: f.size(INTER_14_LINE), color: colors.forest }]}>
            Start Shopping
          </Text>
        </Pressable>
      </Reveal>

      <Reveal index={7} style={[at(0, 801.4), { width: "100%" }]}>
        <Text allowFontScaling={false} style={[styles.noPadding, { fontFamily: fonts.regular, fontSize: f.size(12), lineHeight: f.size(INTER_12_LINE), color: colors.inkMuted, textAlign: "center" }]}>
          No account needed •{" "}
          <Text accessibilityRole="link" accessibilityHint="Opens sign in" onPress={signIn} suppressHighlighting={false}>
            Sign in to create an account
          </Text>
        </Text>
      </Reveal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  clip: { overflow: "hidden" },
  row: { backgroundColor: colors.tint, overflow: "hidden" },
  button: { flex: 1, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  noPadding: Platform.select({ android: { includeFontPadding: false }, default: {} }),
});
