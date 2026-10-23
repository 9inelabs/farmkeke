// M-96 Account deleted.
import { router } from "expo-router";
import { CheckCircle } from "@/components/icons";
import { Button, StatusScreen } from "@/components/ui";

export default function AccountDeleted() {
  return (
    <StatusScreen
      icon={CheckCircle}
      title="Your account is deleted"
      message="Thank you for shopping with Farmkeke. You can still buy as a guest any time."
      actions={<Button label="Continue as a guest" fullWidth onPress={() => router.replace("/home")} />}
    />
  );
}
