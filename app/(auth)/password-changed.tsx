// M-56 Password changed. Convex Auth signs this phone in as part of the reset,
// so the action continues instead of returning to Sign in.
import { Key } from "@/components/icons";
import { Button, StatusScreen } from "@/components/ui";
import { closeAuth } from "@/features/auth/navigation";

export default function PasswordChanged() {
  return (
    <StatusScreen
      icon={Key}
      tone="success"
      title="Password changed"
      message="You're signed in with your new password. Other phones signed in to your account have been signed out."
      actions={<Button label="Continue" fullWidth onPress={closeAuth} />}
    />
  );
}
