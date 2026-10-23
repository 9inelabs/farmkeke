import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { convexAuth } from "@convex-dev/auth/server";
import { MAX_FAILED_SIGN_INS_PER_HOUR } from "./accountsInternal";
import { FarmkekePassword } from "./lib/passwordProvider";
import { PhoneCode } from "./lib/phoneAuth";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email (or a farmer's phone) and password, with reset by email link
    FarmkekePassword,
    // Farmers: their phone and a code by text, no password (24 Oct 2026)
    PhoneCode,
    // Guests: each phone gets its own identity, so guest orders stay tied to
    // the device that placed them.
    Anonymous,
  ],
  signIn: { maxFailedAttempsPerHour: MAX_FAILED_SIGN_INS_PER_HOUR },
});
