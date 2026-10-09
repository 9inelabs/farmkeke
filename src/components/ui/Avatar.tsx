import { StyleSheet, View } from "react-native";
import { colors } from "@/theme/tokens";
import { fonts } from "@/theme/typography";
import { Text } from "./Text";

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "FK";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** Initials on forest, lime letters (Account and Edit profile). */
export function Avatar({ name, size = 48 }: { name: string | null | undefined; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.38, lineHeight: size * 0.46, color: colors.lime }}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
});
