// The signed-in Account tab (M-80) with a sample person, for the browser preview.
import { SignedInAccount } from "../(shop)/account";

export default function AccountSample() {
  return <SignedInAccount viewer={{ name: "Adaeze Nwankwo", email: "ada@example.com", phone: null }} addresses={2} onSignOut={() => undefined} />;
}
