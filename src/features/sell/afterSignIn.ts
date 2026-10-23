import { api } from "@convex/_generated/api";
import { useConvex, useMutation } from "convex/react";
import { router } from "expo-router";
import { useCallback } from "react";
import { nextStepPath } from "@/features/farmer/constants";
import { useSwitchMode } from "@/features/farmer/useSwitchMode";

/**
 * Once a farmer is signed in by phone: an approved farm opens farmer mode; a
 * submitted or decided application shows its status; otherwise the
 * application starts (or continues) at its first unfinished step.
 */
export function useAfterFarmerSignIn() {
  const convex = useConvex();
  const start = useMutation(api.farmerApplications.start);
  const switchMode = useSwitchMode();
  return useCallback(async () => {
    const farm = await convex.query(api.farms.mine, {});
    if (farm) return switchMode("farm");
    const app = await convex.query(api.farmerApplications.mine, {});
    if (app && app.status !== "draft" && app.status !== "more_info" && app.status !== "rejected") {
      if (router.canDismiss()) router.dismissAll();
      return router.replace("/sell/status");
    }
    await start({});
    const fresh = await convex.query(api.farmerApplications.mine, {});
    if (router.canDismiss()) router.dismissAll();
    router.replace(fresh ? nextStepPath(fresh.problems) : "/sell/apply/profile");
  }, [convex, start, switchMode]);
}
