// Digit boxes for the texted code (6) and the PIN (4), over one hidden input
// so the phone's keypad, paste and SMS autofill all work.
import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/components/ui";
import { colors, radii, spacing } from "@/theme/tokens";
import { fonts } from "@/theme/typography";

type Props = {
  length: number;
  value: string;
  onChange: (value: string) => void;
  /** Called once every box is filled */
  onFilled?: (value: string) => void;
  /** Dots instead of digits (PIN) */
  secure?: boolean;
  error?: boolean;
  autoFocus?: boolean;
  label: string;
};

export type CodeBoxesHandle = { focus: () => void };

export const CodeBoxes = forwardRef<CodeBoxesHandle, Props>(function CodeBoxes({ length, value, onChange, onFilled, secure, error, autoFocus, label }, ref) {
  const input = useRef<TextInput>(null);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }));
  const size = length > 4 ? 48 : 60;
  return (
    <Pressable onPress={() => input.current?.focus()} style={styles.row} accessibilityLabel={label} accessibilityHint="Opens the keypad">
      {Array.from({ length }, (_, i) => {
        const filled = value[i] !== undefined;
        const active = i === Math.min(value.length, length - 1) && value.length < length;
        return (
          <View key={i} style={[styles.box, { width: size, height: size + 6 }, filled && styles.filled, active && styles.active, error && styles.error]}>
            {filled ? secure ? <View style={styles.dot} /> : <Text style={styles.digit}>{value[i]}</Text> : null}
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        autoFocus={autoFocus}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, "").slice(0, length);
          onChange(v);
          if (v.length === length) onFilled?.(v);
        }}
        keyboardType="number-pad"
        maxLength={length}
        autoComplete={secure ? "off" : "sms-otp"}
        textContentType={secure ? "none" : "oneTimeCode"}
        secureTextEntry={secure}
        caretHidden
        style={styles.hidden}
        accessibilityLabel={label}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  box: { borderRadius: radii.md + 2, borderWidth: 1.5, borderColor: colors.line, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center" },
  filled: { borderColor: colors.inkMuted, backgroundColor: colors.white },
  active: { borderColor: colors.lime, backgroundColor: colors.white },
  error: { borderColor: colors.error },
  digit: { fontFamily: fonts.displayBold, fontSize: 19, lineHeight: 24, color: colors.ink },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.ink },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});
