// M-03 Welcome slides for first-time shoppers (premium redesign, Nov 2026).
// Three slides that follow your finger: photos move slower than the text,
// the floating cards drift on their own layer, and the page dots stretch
// into a bar as you swipe. Slide 1 is a farmer photo on deep green, slide 2
// a light produce collage (delivery or pickup), slide 3 deep green with the
// "pay once the farm accepts" order card. Skip or Get started goes to
// Get started. Photo credits are on the About screen.
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowRight, Bike, Check, ChevronLeft, Leaf, ShieldCheck, Shop, Verified } from "@/components/icons";
import { Reveal } from "@/components/motion/reveal";
import { ForestBackdrop, Glass } from "@/components/premium";
import { Button, Text, Wordmark } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
// The photos, with their blurhash placeholders; they're decoded at launch (src/lib/preloadImages.ts)
import { photoProps } from "@/lib/preloadImages";

const SLIDES = 3;

export default function Welcome() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });
  useAnimatedReaction(
    () => Math.round(scrollX.value / Math.max(width, 1)),
    (now, before) => {
      if (now !== before) runOnJS(setIndex)(now);
    },
  );

  const goTo = (i: number) => scroller.current?.scrollTo({ x: i * width, animated: true });
  const finish = () => router.replace("/get-started");
  const slide = { width, height, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 22 };

  return (
    <View style={styles.screen}>
      <StatusBar style={index === 1 ? "dark" : "light"} />
      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* 1. Fresh from Nigerian farms */}
        <View style={[styles.slide, styles.dark, slide]}>
          <Parallax scrollX={scrollX} index={0} width={width} factor={0.45} style={[styles.heroPhoto, { height: height * 0.68 }]}>
            <Image {...photoProps("farmerGreens")} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: "30%", top: "20%" }} accessible={false} />
          </Parallax>
          <LinearGradient
            colors={["rgba(11,26,7,0.6)", "rgba(11,26,7,0)", "rgba(11,26,7,0)", "rgba(11,26,7,0.9)", colors.forestDeep]}
            locations={[0, 0.16, 0.38, 0.6, 0.72]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <TopBar tone="dark" onSkip={finish} />
          <View style={styles.flex} />
          <Parallax scrollX={scrollX} index={0} width={width} factor={-0.15} style={styles.floatRow}>
            <Reveal index={2} delay={250}>
              <Bob>
                <Glass style={styles.farmCard}>
                  <Image {...photoProps("farmerField")} style={styles.farmThumb} contentFit="cover" accessible={false} />
                  <View>
                    <View style={styles.inline}>
                      <Text style={styles.farmName}>Mama Ada Farms</Text>
                      <Verified size={14} color={colors.lime} />
                    </View>
                    <Text style={styles.farmMeta}>Verified farm</Text>
                  </View>
                </Glass>
              </Bob>
            </Reveal>
            <Reveal index={3} delay={250} style={styles.harvested}>
              <Bob delay={700}>
                <Glass style={styles.pill}>
                  <View style={styles.tick}>
                    <Leaf size={13} color={colors.forest} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.pillText}>Harvested today</Text>
                </Glass>
              </Bob>
            </Reveal>
          </Parallax>
          <SlideText scrollX={scrollX} index={0} width={width}>
            <PageDots scrollX={scrollX} width={width} tone="dark" />
            <Text style={[styles.title, styles.onDark]} accessibilityRole="header">
              Fresh food,{"\n"}straight from <Text style={[styles.title, styles.lime]}>Nigerian farms</Text>
            </Text>
            <Text style={[styles.body, styles.bodyDark]}>Buy from verified farmers near you. No middlemen, fair prices, picked the day you order.</Text>
          </SlideText>
          <View style={styles.bottomRow}>
            <Text style={styles.count}>1 of 3</Text>
            <Button label="Next" iconRight={ArrowRight} size="hero" onPress={() => goTo(1)} style={styles.next} />
          </View>
        </View>

        {/* 2. Delivered, or ready for pickup */}
        <View style={[styles.slide, slide]}>
          <LinearGradient colors={[colors.tint, colors.white]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
          <TopBar tone="light" onSkip={finish} />
          <View style={styles.collageWrap}>
            <View style={styles.blob} />
            <Parallax scrollX={scrollX} index={1} width={width} factor={0.3} style={styles.collage}>
              <View style={styles.col}>
                <Image {...photoProps("tomatoes")} style={[styles.tile, styles.tileArch, { flex: 1.6 }]} contentFit="cover" accessible={false} />
                <Image {...photoProps("carrots")} style={[styles.tile, styles.tileFootLeft, { flex: 1 }]} contentFit="cover" accessible={false} />
              </View>
              <View style={[styles.col, { flex: 0.65 }]}>
                <Image {...photoProps("fruits")} style={[styles.tile, styles.tileTopRight, { flex: 1 }]} contentFit="cover" accessible={false} />
                <Image {...photoProps("peppers")} style={[styles.tile, styles.tileFootRight, { flex: 1.7 }]} contentFit="cover" contentPosition="bottom" accessible={false} />
              </View>
            </Parallax>
            <Parallax scrollX={scrollX} index={1} width={width} factor={-0.25} style={styles.riderSlot}>
              <Bob>
                <View style={[styles.card, styles.riderCard]}>
                  <View style={styles.riderIcon}>
                    <Bike size={19} color={colors.lime} strokeWidth={1.8} />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>Rider on the way</Text>
                    <Text style={styles.cardMeta}>Arriving in about 25 min</Text>
                  </View>
                </View>
              </Bob>
            </Parallax>
            <Parallax scrollX={scrollX} index={1} width={width} factor={-0.4} style={styles.pickupSlot}>
              <Bob delay={600}>
                <View style={[styles.card, styles.pickupCard]}>
                  <View style={styles.pickupIcon}>
                    <Shop size={15} color={colors.forest} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.pickupText}>Or pick up at the farm</Text>
                </View>
              </Bob>
            </Parallax>
          </View>
          <SlideText scrollX={scrollX} index={1} width={width}>
            <PageDots scrollX={scrollX} width={width} tone="light" />
            <Text style={[styles.title, styles.titleLight]} accessibilityRole="header">
              Delivered to your door, or ready for pickup
            </Text>
            <Text style={[styles.body, styles.bodyLight]}>Choose what suits you at checkout. We'll tell you when it's on the way.</Text>
          </SlideText>
          <View style={styles.bottomRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => goTo(0)} style={({ pressed }) => [styles.backSquare, pressed && styles.pressed]}>
              <ChevronLeft size={20} color={colors.forest} strokeWidth={2} />
            </Pressable>
            <Button label="Next" iconRight={ArrowRight} variant="dark" size="hero" onPress={() => goTo(2)} style={styles.next} />
          </View>
        </View>

        {/* 3. Pay only once the farm accepts */}
        <View style={[styles.slide, styles.dark, slide]}>
          <ForestBackdrop />
          <View style={[styles.ring, { width: 380, height: 380, right: -90, top: insets.top + 60 }]} />
          <View style={[styles.ring, styles.ringInner, { width: 260, height: 260, right: -30, top: insets.top + 120 }]} />
          <TopBar tone="dark" onSkip={finish} />
          <View style={styles.orderArea}>
            <Parallax scrollX={scrollX} index={2} width={width} factor={0.2}>
              <View style={styles.stackBack} />
              <View style={styles.stackMid} />
              <View style={[styles.card, styles.orderCard]}>
                <View style={styles.inline}>
                  <Image {...photoProps("farmerField")} style={styles.orderThumb} contentFit="cover" accessible={false} />
                  <View style={styles.flex}>
                    <Text style={styles.orderFarm} numberOfLines={1}>
                      Mama Ada Farms
                    </Text>
                    <Text style={styles.cardMeta}>Order FK-2041 · 4 items</Text>
                  </View>
                  <View style={styles.accepted}>
                    <Check size={13} color="#2F7D3B" strokeWidth={3} />
                    <Text style={styles.acceptedText}>Accepted</Text>
                  </View>
                </View>
                <View style={styles.rule} />
                <OrderStep done label="You placed your order" note="Nothing paid" />
                <OrderStep done label="The farm accepted it" note="2 min ago" />
                <OrderStep label="Now you pay" />
                <View style={styles.payButton}>
                  <Text style={styles.payText}>Pay ₦12,450</Text>
                  <ArrowRight size={18} color={colors.white} strokeWidth={2} />
                </View>
              </View>
            </Parallax>
            <Parallax scrollX={scrollX} index={2} width={width} factor={-0.3} style={styles.badgeSlot}>
              <View style={styles.badge}>
                <ShieldCheck size={15} color={colors.forest} strokeWidth={2} />
                <Text style={styles.badgeText}>Buyer protection on every order</Text>
              </View>
            </Parallax>
          </View>
          <SlideText scrollX={scrollX} index={2} width={width}>
            <PageDots scrollX={scrollX} width={width} tone="dark" />
            <Text style={[styles.title, styles.onDark]} accessibilityRole="header">
              Pay only once the farm <Text style={[styles.title, styles.lime]}>accepts</Text>
            </Text>
            <Text style={[styles.body, styles.bodyDark]}>If anything arrives wrong, report it within a day and we'll make it right.</Text>
          </SlideText>
          <View style={styles.bottomRow}>
            <Button label="Get started" iconRight={ArrowRight} size="hero" fullWidth onPress={finish} style={styles.flex} />
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

function TopBar({ tone, onSkip }: { tone: "dark" | "light"; onSkip: () => void }) {
  const dark = tone === "dark";
  return (
    <View style={styles.topBar}>
      <Wordmark width={112} tint={dark ? colors.white : undefined} />
      <Pressable accessibilityRole="button" accessibilityLabel="Skip the introduction" hitSlop={10} onPress={onSkip}>
        {dark ? (
          <Glass style={styles.skip}>
            <Text style={[styles.skipText, styles.onDark]}>Skip</Text>
          </Glass>
        ) : (
          <View style={[styles.skip, styles.skipLight]}>
            <Text style={[styles.skipText, { color: colors.forest }]}>Skip</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/** Moves its content sideways at `factor` of the swipe, so layers slide at different speeds. */
function Parallax({
  scrollX,
  index,
  width,
  factor,
  style,
  children,
}: {
  scrollX: SharedValue<number>;
  index: number;
  width: number;
  factor: number;
  style?: object;
  children: ReactNode;
}) {
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: (scrollX.value - index * width) * factor }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** The headline block: slides a little faster than the page and fades at the edges. */
function SlideText({ scrollX, index, width, children }: { scrollX: SharedValue<number>; index: number; width: number; children: ReactNode }) {
  const animated = useAnimatedStyle(() => {
    const range = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(scrollX.value, range, [width * 0.25, 0, -width * 0.25], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[styles.text, animated]}>
      <Reveal index={0}>{children}</Reveal>
    </Animated.View>
  );
}

/** Three dots; the one for the page in view stretches into a bar as you swipe. */
function PageDots({ scrollX, width, tone }: { scrollX: SharedValue<number>; width: number; tone: "dark" | "light" }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel="Page indicator">
      {Array.from({ length: SLIDES }, (_, i) => (
        <Dot key={i} i={i} scrollX={scrollX} width={width} tone={tone} />
      ))}
    </View>
  );
}

function Dot({ i, scrollX, width, tone }: { i: number; scrollX: SharedValue<number>; width: number; tone: "dark" | "light" }) {
  const on = tone === "dark" ? colors.lime : colors.forest;
  const off = tone === "dark" ? "rgba(255,255,255,0.3)" : "rgba(30,59,22,0.18)";
  const animated = useAnimatedStyle(() => {
    const p = interpolate(scrollX.value, [(i - 1) * width, i * width, (i + 1) * width], [0, 1, 0], Extrapolation.CLAMP);
    return { width: 7 + p * 19, opacity: 0.55 + p * 0.45 };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: off }, animated]}>{<DotFill i={i} scrollX={scrollX} width={width} color={on} />}</Animated.View>;
}

function DotFill({ i, scrollX, width, color }: { i: number; scrollX: SharedValue<number>; width: number; color: string }) {
  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, [(i - 0.6) * width, i * width, (i + 0.6) * width], [0, 1, 0], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius: 4 }, animated]} />;
}

/** A gentle, endless float for the cards that sit on the photos. */
function Bob({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    const t = { duration: 2200, easing: Easing.inOut(Easing.sin), reduceMotion: ReduceMotion.System };
    y.value = withDelay(delay, withRepeat(withSequence(withTiming(-5, t), withTiming(0, t)), -1, false));
  }, [delay, y]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}

function OrderStep({ done = false, label, note }: { done?: boolean; label: string; note?: string }) {
  return (
    <View style={[styles.inline, styles.orderStep]}>
      {done ? (
        <View style={styles.stepTick}>
          <Check size={12} color={colors.forest} strokeWidth={3} />
        </View>
      ) : (
        <View style={styles.stepNow}>
          <View style={styles.stepNowDot} />
        </View>
      )}
      <Text style={[styles.stepLabel, !done && styles.stepLabelNow]}>{label}</Text>
      {note ? <Text style={styles.stepNote}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.forestDeep },
  flex: { flex: 1 },
  slide: { overflow: "hidden", backgroundColor: colors.white },
  dark: { backgroundColor: colors.forestDeep },
  heroPhoto: { position: "absolute", top: 0, left: -40, right: -40 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 10, height: 56 },
  skip: { height: 32, paddingHorizontal: 13, borderRadius: 99, justifyContent: "center" },
  skipLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  skipText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16 },
  onDark: { color: colors.white },
  lime: { color: colors.lime },
  floatRow: { height: 130, marginHorizontal: 20, marginBottom: 6 },
  farmCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 12, alignSelf: "flex-start" },
  farmThumb: { width: 36, height: 36, borderRadius: 11 },
  farmName: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.white },
  farmMeta: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.onForest },
  inline: { flexDirection: "row", alignItems: "center", gap: 5 },
  harvested: { position: "absolute", right: 0, top: 66 },
  pill: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 14 },
  pillText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.white },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  text: { paddingHorizontal: 24 },
  dots: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 20 },
  dot: { height: 7, borderRadius: 4, overflow: "hidden" },
  title: { fontFamily: fonts.displayHeavy, fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  titleLight: { color: colors.forest, fontSize: 28, lineHeight: 34 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, marginTop: 11, maxWidth: 330 },
  bodyDark: { color: colors.onForest },
  bodyLight: { color: colors.inkSoft },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginTop: 28, gap: 12 },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.onForest },
  next: { minWidth: 150 },
  backSquare: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  collageWrap: { flex: 1, marginHorizontal: 20, marginTop: 8, marginBottom: 26, maxHeight: 440 },
  blob: { position: "absolute", left: -40, top: "12%", width: 300, height: 300, borderRadius: 150, backgroundColor: "rgba(169,214,84,0.28)" },
  collage: { flex: 1, flexDirection: "row", gap: 12 },
  col: { flex: 1, gap: 12 },
  tile: { width: "100%" },
  tileArch: { borderTopLeftRadius: 120, borderTopRightRadius: 120, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  tileFootLeft: { borderRadius: 28, borderBottomLeftRadius: 90 },
  tileTopRight: { borderRadius: 28, borderTopRightRadius: 80 },
  tileFootRight: { borderRadius: 28, borderBottomRightRadius: 90 },
  card: { backgroundColor: colors.white, boxShadow: "0px 10px 30px 0px rgba(16, 35, 11, 0.12)" },
  riderSlot: { position: "absolute", left: 10, top: "47%" },
  riderCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, paddingLeft: 11, paddingRight: 14, borderRadius: 16 },
  riderIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 17, color: colors.ink },
  cardMeta: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 15, color: colors.inkSoft },
  pickupSlot: { position: "absolute", right: 6, bottom: "10%" },
  pickupCard: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14 },
  pickupIcon: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.tint, alignItems: "center", justifyContent: "center" },
  pickupText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.ink },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1, borderColor: "rgba(169,214,84,0.16)" },
  ringInner: { borderColor: "rgba(169,214,84,0.12)" },
  orderArea: { flex: 1, justifyContent: "center", paddingHorizontal: 34 },
  stackBack: { height: 40, marginHorizontal: 26, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  stackMid: { height: 40, marginHorizontal: 13, marginTop: -28, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  orderCard: { marginTop: -26, padding: 16, borderRadius: 22 },
  orderThumb: { width: 46, height: 46, borderRadius: 14, marginRight: 7 },
  orderFarm: { fontFamily: fonts.semibold, fontSize: 14.5, lineHeight: 19, color: colors.ink },
  accepted: { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 99, backgroundColor: "#E6F4E9" },
  acceptedText: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, color: "#2F7D3B" },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 14 },
  orderStep: { gap: 10, marginBottom: 10 },
  stepTick: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  stepNow: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.forest, alignItems: "center", justifyContent: "center" },
  stepNowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.forest },
  stepLabel: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 18, color: colors.ink, flex: 1 },
  stepLabelNow: { fontFamily: fonts.semibold },
  stepNote: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 15, color: colors.inkMuted },
  payButton: { marginTop: 6, height: 48, borderRadius: 14, backgroundColor: colors.forest, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  payText: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 19, color: colors.white },
  badgeSlot: { alignItems: "center", marginTop: 18 },
  badge: { flexDirection: "row", alignItems: "center", gap: 7, height: 32, paddingHorizontal: 12, borderRadius: 99, backgroundColor: colors.lime, boxShadow: "0px 10px 24px 0px rgba(169, 214, 84, 0.35)" },
  badgeText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.forest },
});
