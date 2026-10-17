"use client";

// Who is using the site: signed-in consumer, guest (anonymous identity on this
// browser), or nobody yet. Sign in/up/out via useAuthActions() from
// "@convex-dev/auth/react" with the "password" provider:
//   signIn("password", { flow: "signIn", identifier, password })
//   signIn("password", { flow: "signUp", email, password, name })
//   signIn("password", { flow: "reset", email })
//   signIn("password", { flow: "reset-verification", email, code, newPassword })
//   signIn("anonymous")  // guest checkout identity
// Errors arrive as ConvexError data { code: "INVALID_CREDENTIALS" | "TOO_MANY_ATTEMPTS"
// | "EMAIL_TAKEN" | "INVALID_EMAIL" | "WEAK_PASSWORD" | "NAME_REQUIRED" | "INVALID_CODE"
// | "BLOCKED", attemptsLeft? } (see convex/lib/passwordProvider.ts).
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useCallback } from "react";
import { api } from "@/convex/api";

export type Viewer = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  isAnonymous?: boolean;
} | null;

/**
 * status: "loading" while the session is restored, "signed-out" with no identity,
 * "guest" for an anonymous checkout identity, "signed-in" for a real account.
 */
export function useViewer() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip") as Viewer | undefined;
  const status: "loading" | "signed-out" | "guest" | "signed-in" =
    isLoading || (isAuthenticated && viewer === undefined)
      ? "loading"
      : !isAuthenticated || !viewer
        ? "signed-out"
        : viewer.isAnonymous
          ? "guest"
          : "signed-in";
  return { status, viewer: viewer ?? null };
}

/** Makes sure there is an identity (guest if needed) before guest checkout. */
export function useEnsureIdentity() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  return useCallback(async () => {
    if (!isAuthenticated) await signIn("anonymous");
  }, [isAuthenticated, signIn]);
}

/** Reads the error code thrown by the auth provider and other functions. */
export function errorCode(error: unknown): string | undefined {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === "object" && "code" in data) return String((data as { code: unknown }).code);
  return undefined;
}

export function errorData<T = Record<string, unknown>>(error: unknown): T | undefined {
  const data = (error as { data?: unknown } | null)?.data;
  return data && typeof data === "object" ? (data as T) : undefined;
}
