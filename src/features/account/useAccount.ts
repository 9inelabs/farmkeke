import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect } from "react";

/**
 * The signed-in account for settings screens. If the person isn't signed in
 * (or signs out while here), they go back to the Account tab.
 */
export function useAccount() {
  const viewer = useQuery(api.users.viewer);
  const missing = viewer === null || viewer?.isGuest === true;
  useEffect(() => {
    if (missing) router.replace("/account");
  }, [missing]);
  return missing ? undefined : viewer;
}
