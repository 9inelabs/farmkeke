import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect } from "react";

/** The farmer's farm for farm settings screens; non-farmers go back to Account. */
export function useFarm() {
  const farm = useQuery(api.farms.mine);
  useEffect(() => {
    if (farm === null) router.replace("/account");
  }, [farm]);
  return farm ?? undefined;
}
