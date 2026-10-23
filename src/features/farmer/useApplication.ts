import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { router } from "expo-router";
import { createContext, useContext, useEffect } from "react";

export type Application = NonNullable<FunctionReturnType<typeof api.farmerApplications.mine>>;

/** The /dev/sell sample page supplies an application here instead of the backend's. */
export const SampleApplication = createContext<Application | null>(null);

/**
 * The application being edited by a step screen. Applications that can't be
 * edited (submitted, approved, rejected) or don't exist go to the status page.
 */
export function useEditableApplication() {
  const sample = useContext(SampleApplication);
  const live = useQuery(api.farmerApplications.mine, sample ? "skip" : {});
  const app = sample ?? live;
  const editable = app !== undefined && app !== null && (app.status === "draft" || app.status === "more_info");
  useEffect(() => {
    if (app === null) router.replace("/sell");
    else if (app !== undefined && !editable) router.replace("/sell/status");
  }, [app, editable]);
  return editable ? app : undefined;
}
