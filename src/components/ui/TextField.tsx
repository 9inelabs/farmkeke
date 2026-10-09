import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { fonts } from "@/theme/typography";
import { borders, colors, radii, sizes, spacing } from "@/theme/tokens";
import { Text } from "./Text";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
  helper?: string;
  error?: string | null;
  /** Fixed text before the input, e.g. "+234". */
  prefix?: string;
  /** Adds the Show / Hide toggle used on every password field. */
  password?: boolean;
};

export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, helper, error, prefix, password = false, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const borderColor = error ? colors.error : focused ? colors.forest : colors.lime;

  return (
    <View style={styles.wrap}>
      {label !== undefined && <Text variant="label">{label}</Text>}
      <View style={[styles.field, { borderColor, borderWidth: focused || error ? 1 : borders.hairline }]}>
        {prefix !== undefined && (
          <View style={styles.prefix}>
            <Text variant="bodyMedium">{prefix}</Text>
          </View>
        )}
        <TextInput
          ref={ref}
          {...inputProps}
          secureTextEntry={password ? hidden : inputProps.secureTextEntry}
          placeholderTextColor={colors.inkMuted}
          selectionColor={colors.forest}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={styles.input}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Show password" : "Hide password"}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.toggle}
          >
            {hidden ? <Eye size={16} color={colors.forest} /> : <EyeOff size={16} color={colors.forest} />}
            <Text variant="label" color={colors.forest}>
              {hidden ? "Show" : "Hide"}
            </Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={styles.message} accessibilityLiveRegion="polite">
          <AlertCircle size={14} color={colors.error} />
          <Text variant="small" color={colors.error} style={styles.messageText}>
            {error}
          </Text>
        </View>
      ) : helper !== undefined ? (
        <Text variant="small">{helper}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  field: {
    minHeight: sizes.inputHeight,
    borderRadius: radii.control,
    backgroundColor: colors.white,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  prefix: {
    paddingRight: spacing.md,
    marginRight: spacing.md,
    borderRightWidth: borders.hairline,
    borderRightColor: colors.line,
  },
  input: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, paddingLeft: spacing.sm },
  message: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  messageText: { flexShrink: 1 },
});
