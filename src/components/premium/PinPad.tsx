// Farmkeke's own PIN keypad, used instead of the phone's keyboard: four dots
// that light up lime as you type, round keys with a light tap on iPhone, and
// a shake with a buzz when the PIN is wrong. On the web, typing digits and
// Backspace on a keyboard works too.
import { useEffect, useRef } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Text } from "@/components/ui";
import { errorFeedback, keyFeedback } from "@/lib/haptics";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Called once every digit is in. */
  onFilled?: (value: string) => void;
  length?: number;
  /** Shakes the dots each time this turns true. */
  error?: boolean;
  disabled?: boolean;
  label: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

export function PinPad({ value, onChange, onFilled, length = 4, error = false, disabled = false, label }: Props) {
  const reduceMotion = useReducedMotion();
  const shake = useSharedValue(0);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!error) return;
    errorFeedback();
    if (reduceMotion) return;
    const t = { duration: 55, easing: Easing.linear, reduceMotion: ReduceMotion.System };
    shake.value = withSequence(withTiming(-12, t), withTiming(12, t), withTiming(-9, t), withTiming(9, t), withTiming(-4, t), withTiming(0, t));
  }, [error, reduceMotion, shake]);

  const press = (key: (typeof KEYS)[number]) => {
    if (disabled || key === "") return;
    const current = latest.current;
    if (key === "del") {
      if (current.length === 0) return;
      keyFeedback();
      onChange(current.slice(0, -1));
      return;
    }
    if (current.length >= length) return;
    keyFeedback();
    const next = current + key;
    onChange(next);
    if (next.length === length) onFilled?.(next);
  };

  // A computer keyboard on the web
  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) pressRef.current(e.key as (typeof KEYS)[number]);
      else if (e.key === "Backspace") pressRef.current("del");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[styles.dots, shakeStyle]}
        accessible
        accessibilityLabel={`${label}: ${value.length} of ${length} digits entered`}
        accessibilityLiveRegion="polite"
      >
        {Array.from({ length }, (_, i) => (
          <Dot key={i} on={i < value.length} error={error} />
        ))}
      </Animated.View>
      <View style={styles.pad}>
        {KEYS.map((key, i) =>
          key === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <Key key={i} label={key} disabled={disabled} onPress={() => press(key)} />
          ),
        )}
      </View>
    </View>
  );
}

function Dot({ on, error }: { on: boolean; error: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (on) scale.value = withSequence(withTiming(1.35, { duration: 90, reduceMotion: ReduceMotion.System }), withSpring(1, { damping: 12, reduceMotion: ReduceMotion.System }));
  }, [on, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={[styles.dot, on ? styles.dotOn : styles.dotOff, error && styles.dotError, style]} />;
}

function Key({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  const del = label === "del";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={del ? "Delete" : label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.key, !del && styles.keyFace, pressed && (del ? styles.delPressed : styles.keyPressed)]}
    >
      {del ? (
        <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
          <Path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM12 9l6 6M18 9l-6 6" stroke={colors.white} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <Text style={styles.digit}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 36 },
  dots: { flexDirection: "row", gap: 18, height: 22, alignItems: "center" },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotOff: { borderWidth: 2, borderColor: "rgba(255,255,255,0.35)" },
  dotOn: { backgroundColor: colors.lime, boxShadow: "0px 0px 14px 0px rgba(169,214,84,0.6)" },
  dotError: { backgroundColor: colors.error, borderColor: colors.error, boxShadow: "none" },
  pad: { flexDirection: "row", flexWrap: "wrap", width: 300, justifyContent: "space-between", rowGap: 14 },
  key: { width: 84, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  keyFace: { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  keyPressed: { backgroundColor: "rgba(169,214,84,0.28)", borderColor: colors.lime, transform: [{ scale: 0.95 }] },
  delPressed: { opacity: 0.6 },
  digit: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: colors.white },
});
