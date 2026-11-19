// M-04 Get started (premium redesign, Nov 2026): a market photo on deep
// green, then "How will you use Farmkeke?" with two choices.
// - I'm shopping: Create account, Sign in, or Continue as a guest.
// - I'm a farmer: Apply as a farmer, or Log in as a farmer (phone and PIN).
// Every way out marks the welcome as seen. Accounts and farmer sign-up open
// on top of the shop (or the area picker on a first visit), so finishing or
// closing them lands there rather than back on this screen.
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, { Easing, ReduceMotion, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Cart, Check, Leaf, Sprout, type IconComponent } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { Glass } from "@/components/premium";
import { Button, Text, Wordmark } from "@/components/ui";
import { tapFeedback } from "@/lib/haptics";
import { usePrefs } from "@/store/prefs";
import { borders, colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Role = "shop" | "farm";

export default function GetStarted() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const setOnboardingSeen = usePrefs((s) => s.setOnboardingSeen);
  const area = usePrefs((s) => s.area);
  const [role, setRole] = useState<Role>("shop");

  const base: Href = area ? "/home" : "/location";
  /** Leaves the welcome for the shop (or area picker), then opens `next` on top of it. */
  const leave = (next?: Href) => {
    setOnboardingSeen();
    router.replace(base);
    if (next) router.push(next);
  };

  const pick = (r: Role) => {
    if (r !== role) tapFeedback();
    setRole(r);
  };

  const photoHeight = Math.max(300, Math.min(420, height * 0.47));

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={{ height: photoHeight }}>
          <Image source={require("../../assets/photos/market-stall.jpg")} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} transition={250} />
          <LinearGradient
            colors={["rgba(11,26,7,0.6)", "rgba(11,26,7,0.15)", "rgba(11,26,7,0.92)"]}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Reveal index={0} style={[styles.brand, { top: insets.top + 14 }]}>
            <Wordmark width={128} tint={colors.white} />
          </Reveal>
          <View style={styles.headline}>
            <Reveal index={1}>
              <Glass style={styles.chip}>
                <Leaf size={14} color={colors.lime} strokeWidth={2} />
                <Text style={styles.chipText}>Fresh from Nigerian farms</Text>
              </Glass>
            </Reveal>
            <Reveal index={2}>
              <Text style={styles.title} accessibilityRole="header">
                How will you use Farmkeke?
              </Text>
            </Reveal>
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 18 }]}>
          <View style={styles.choices} accessibilityRole="radiogroup">
            <Reveal index={3}>
              <RoleCard icon={Cart} title="I'm shopping" body="Fresh food from farms near me" selected={role === "shop"} onPress={() => pick("shop")} />
            </Reveal>
            <Reveal index={4}>
              <RoleCard icon={Sprout} title="I'm a farmer" body="Sell my harvest to households" selected={role === "farm"} onPress={() => pick("farm")} />
            </Reveal>
          </View>

          <Reveal index={5} style={styles.actions}>
            {role === "shop" ? (
              <>
                <Button label="Create account" variant="dark" size="hero" fullWidth onPress={() => leave("/create-account")} />
                <Button label="Sign in" variant="outline" size="hero" fullWidth onPress={() => leave("/sign-in")} style={styles.outline} />
                <Text style={styles.link} accessibilityRole="button" onPress={() => leave()}>
                  Continue as a guest
                </Text>
              </>
            ) : (
              <>
                <Button label="Apply as a farmer" iconRight={ArrowRight} variant="dark" size="hero" fullWidth onPress={() => leave("/sell")} />
                <Button label="Log in as a farmer" variant="outline" size="hero" fullWidth onPress={() => leave("/sell/login")} style={styles.outline} />
                <Text style={styles.link} accessibilityRole="button" onPress={() => leave()}>
                  Just look around the shop
                </Text>
              </>
            )}
          </Reveal>
        </View>
      </ScrollView>
    </View>
  );
}

/** A choice card: the chosen one gets a forest outline, a soft tint and a tick. */
function RoleCard({ icon: Icon, title, body, selected, onPress }: { icon: IconComponent; title: string; body: string; selected: boolean; onPress: () => void }) {
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System });
  }, [selected, on]);
  const card = useAnimatedStyle(() => ({
    borderColor: interpolateColor(on.value, [0, 1], [colors.line, colors.forest]),
    backgroundColor: interpolateColor(on.value, [0, 1], [colors.white, "#F6FAEF"]),
    transform: [{ scale: interpolate(on.value, [0, 1], [0.985, 1]) }],
  }));
  const iconBox = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.value, [0, 1], [colors.tint, colors.forest]) }));
  const tick = useAnimatedStyle(() => ({ opacity: on.value, transform: [{ scale: interpolate(on.value, [0, 1], [0.4, 1]) }] }));

  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${title}. ${body}`} onPress={onPress}>
      <Animated.View style={[styles.card, selected && styles.cardShadow, card]}>
        <Animated.View style={[styles.iconBox, iconBox]}>
          <Icon size={24} color={selected ? colors.lime : colors.forest} strokeWidth={1.8} />
        </Animated.View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardBody}>{body}</Text>
        </View>
        <View style={styles.radio}>
          <Animated.View style={[styles.radioOn, tick]}>
            <Check size={13} color={colors.lime} strokeWidth={3} />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  scroll: { flexGrow: 1 },
  flex: { flex: 1 },
  brand: { position: "absolute", left: 24 },
  headline: { position: "absolute", left: 24, right: 24, bottom: 52, gap: 12, alignItems: "flex-start" },
  chip: { flexDirection: "row", alignItems: "center", gap: 7, height: 32, paddingHorizontal: 12, borderRadius: 99 },
  chipText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.white },
  title: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 36, letterSpacing: -1, color: colors.white, maxWidth: 320 },
  sheet: { flexGrow: 1, marginTop: -28, backgroundColor: colors.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 24 },
  choices: { gap: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 20, borderWidth: borders.strong },
  cardShadow: { boxShadow: "0px 12px 28px 0px rgba(30, 59, 22, 0.12)" },
  iconBox: { width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 21, color: colors.forest },
  cardBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.inkSoft, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: borders.strong, borderColor: "#CFD6C8", alignItems: "center", justifyContent: "center" },
  radioOn: { position: "absolute", left: -1.5, top: -1.5, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  actions: { gap: 10, marginTop: 22 },
  outline: { borderColor: colors.line },
  link: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.forest, textAlign: "center", paddingVertical: 8, marginTop: 4 },
});
