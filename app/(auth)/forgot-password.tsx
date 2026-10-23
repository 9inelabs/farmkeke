// M-53 Forgot password. It's a sheet over Sign in now (src/features/auth/ForgotPasswordSheet);
// this route stays for links that still point here.
import { Redirect, useLocalSearchParams } from "expo-router";

export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  return <Redirect href={{ pathname: "/sign-in", params: { reset: "1", email: params.email ?? "" } }} />;
}
