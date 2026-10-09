import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect } from "react";

/**
 * The application being edited by a step screen. Applications that can't be
 * edited (submitted, approved, rejected) or don't exist go to the status page.
 */
export function useEditableApplication() {
  const app = useQuery(api.farmerApplications.mine);
  const editable = app !== undefined && app !== null && (app.status === "draft" || app.status === "more_info");
  useEffect(() => {
    if (app === null) router.replace("/sell");
    else if (app !== undefined && !editable) router.replace("/sell/status");
  }, [app, editable]);
  return editable ? app : undefined;
}

export type Application = NonNullable<ReturnType<typeof useEditableApplication>>;
