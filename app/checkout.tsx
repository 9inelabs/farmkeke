// Checkout (M-33 onwards) arrives with app batch B. Until then the cart's
// Checkout button lands here.
import { router } from "expo-router";
import { Cart } from "@/components/icons";
import { Button, ScreenHeader, StatusScreen } from "@/components/ui";

export default function Checkout() {
  return (
    <StatusScreen
      icon={Cart}
      header={<ScreenHeader title="Checkout" />}
      title="Checkout is on its way"
      message="Paying in the app comes in the next update. Your cart is saved on this phone until then."
      actions={<Button label="Back to my cart" variant="dark" size="large" pill fullWidth onPress={() => router.back()} />}
    />
  );
}
