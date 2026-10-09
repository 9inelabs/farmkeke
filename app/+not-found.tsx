// M-S7 Link not found: a dead deep link or removed item.
import { router } from "expo-router";
import { SearchX } from "lucide-react-native";
import { Button, ScreenHeader, StatusScreen } from "@/components/ui";

export default function NotFound() {
  return (
    <StatusScreen
      header={<ScreenHeader title="Farmkeke" />}
      icon={SearchX}
      title="This page isn't available"
      message="The link may be old, or the item was removed by the farm."
      actions={<Button label="Go to Home" fullWidth onPress={() => router.replace("/home")} />}
    />
  );
}
