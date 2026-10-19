"use client";

// The signed-in staff member, for every portal page under the gate.
import { createContext, useContext, type ReactNode } from "react";
import type { StaffMe } from "@/convex/returns/admin";

const StaffContext = createContext<StaffMe | null>(null);

export function StaffProvider({ me, children }: { me: StaffMe; children: ReactNode }) {
  return <StaffContext.Provider value={me}>{children}</StaffContext.Provider>;
}

export function useStaff(): StaffMe & { can: (permission: string) => boolean } {
  const me = useContext(StaffContext);
  if (me === null) throw new Error("useStaff() is only available inside the admin portal gate");
  return { ...me, can: (p: string) => me.permissions.includes(p) };
}
