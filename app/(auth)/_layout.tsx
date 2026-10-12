import { Stack } from "expo-router";
import { stackScreenOptions } from "@/theme/navigation";
import { colors } from "@/theme/tokens";

export default function AuthLayout() {
  return <Stack screenOptions={{ ...stackScreenOptions, contentStyle: { backgroundColor: colors.white } }} />;
}
