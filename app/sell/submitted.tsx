// F-09 Application submitted (premium redesign, Nov 2026): deep green, a
// lime circle whose tick draws itself in with a small burst of lime
// confetti, then "What happens next" as a three-step timeline.
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Check } from "@/components/icons";
import { Stagger } from "@/components/motion/reveal";
import { Glass } from "@/components/premium";
import { Button, Text } from "@/components/ui";
import { SellShell, SellTitle } from "@/features/sell/SellShell";
import { successFeedback } from "@/lib/haptics";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const TICK_LENGTH = 40;

const NEXT = [
  { title: "We review your profile", body: "Usually within 2 working days" },
  { title: "We tell you the decision", body: "In the app, by notification and by email" },
  { title: "Start selling", body: "Set your collection hours and add your first listing" },
];

// Where each confetti piece flies to, from the centre of the tick
const CONFETTI = [
  { x: -86, y: -52, size: 8, round: false, color: colors.lime, turn: 30 },
  { x: 74, y: -78, size: 6, round: false, color: colors.white, turn: -20 },
  { x: 92, y: 22, size: 9, round: true, color: colors.lime, turn: 0 },
  { x: -70, y: 66, size: 6, round: true, color: colors.white, turn: 0 },
  { x: 10, y: -96, size: 7, round: true, color: colors.lime, turn: 0 },
  { x: -100, y: 8, size: 6, round: false, color: colors.onForest, turn: 45 },
  { x: 58, y: 80, size: 7, round: false, color: colors.lime, turn: -35 },
];

export default function ApplicationSubmitted() {
  const { reference } = useLocalSearchParams<{ reference?: string }>();
  const home = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace("/home");
  };
  useEffect(() => successFeedback(), []);

  return (
    <SellShell
      tone="dark"
      back="close"
      onBack={home}
      footer={
        <>
          <Button label="See application status" size="hero" fullWidth onPress={() => router.replace("/sell/status")} />
          <Button label="Back to shopping" variant="glass" size="hero" fullWidth onPress={home} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={[styles.ring, styles.ringOuter]} />
        <View style={[styles.ring, styles.ringInner]} />
        {CONFETTI.map((c, i) => (
          <Confetti key={i} {...c} delay={420 + i * 25} />
        ))}
        <Animated.View entering={ZoomIn.springify().damping(13).reduceMotion(ReduceMotion.System)} style={styles.circle}>
          <DrawnTick />
        </Animated.View>
      </View>
      <SellTitle tone="dark" center title="Application sent" note="Thank you. We'll be in touch soon." />
      {reference ? (
        <View style={styles.reference}>
          <Text style={styles.referenceText}>Reference {reference}</Text>
        </View>
      ) : null}
      <Glass style={styles.card}>
        <Text style={styles.cardTitle}>WHAT HAPPENS NEXT</Text>
        <Stagger delay={500}>
          {NEXT.map((step, i) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.rail}>
                {i === 0 ? (
                  <View style={styles.done}>
                    <Check size={13} color={colors.forest} strokeWidth={3} />
                  </View>
                ) : (
                  <View style={styles.num}>
                    <Text style={styles.numText}>{i + 1}</Text>
                  </View>
                )}
                {i < NEXT.length - 1 ? <View style={[styles.line, i === 0 && styles.lineOn]} /> : null}
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepBody}>{step.body}</Text>
              </View>
            </View>
          ))}
        </Stagger>
      </Glass>
    </SellShell>
  );
}

/** The tick, drawn stroke by stroke once the circle has popped in. */
function DrawnTick() {
  const offset = useSharedValue(TICK_LENGTH);
  useEffect(() => {
    offset.value = withDelay(260, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [offset]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));
  return (
    <Svg width={46} height={46} viewBox="0 0 24 24" fill="none" accessibilityLabel="Done">
      <AnimatedPath
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={colors.forest}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={TICK_LENGTH}
        animatedProps={props}
      />
    </Svg>
  );
}

function Confetti({ x, y, size, round, color, turn, delay }: { x: number; y: number; size: number; round: boolean; color: string; turn: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }));
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 0.95 - p.value * 0.25,
    transform: [{ translateX: x * p.value }, { translateY: y * p.value }, { rotate: `${turn * p.value}deg` }, { scale: 0.4 + p.value * 0.6 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.confetti, { width: size, height: round ? size : size * 1.6, borderRadius: round ? size / 2 : 2, backgroundColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  hero: { height: 210, alignItems: "center", justifyContent: "center", marginTop: 6 },
  ring: { position: "absolute", borderRadius: 999, borderWidth: 1 },
  ringOuter: { width: 200, height: 200, borderColor: "rgba(169,214,84,0.18)" },
  ringInner: { width: 148, height: 148, borderColor: "rgba(169,214,84,0.28)" },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0px 0px 0px 12px rgba(169, 214, 84, 0.15), 0px 20px 50px 0px rgba(169, 214, 84, 0.45)",
  },
  confetti: { position: "absolute" },
  reference: { alignSelf: "center", backgroundColor: "rgba(169,214,84,0.16)", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 5 },
  referenceText: { fontFamily: fonts.semibold, fontSize: 12.5, lineHeight: 16, color: colors.lime },
  card: { padding: 18, borderRadius: 22, marginTop: 6 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, color: colors.lime, marginBottom: 14 },
  step: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center" },
  done: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.lime, alignItems: "center", justifyContent: "center" },
  num: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  numText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 15, color: colors.white },
  line: { width: 2, flex: 1, minHeight: 14, marginVertical: 4, backgroundColor: "rgba(255,255,255,0.15)" },
  lineOn: { backgroundColor: "rgba(169,214,84,0.4)" },
  stepText: { flex: 1, paddingBottom: 14 },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.white },
  stepBody: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17, color: colors.onForest, marginTop: 2 },
});
