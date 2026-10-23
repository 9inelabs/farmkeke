import { Briefcase, Home, Pin } from "@/components/icons";

export const ADDRESS_LABELS = { home: "Home", work: "Work", other: "Other" } as const;
export const ADDRESS_ICONS = { home: Home, work: Briefcase, other: Pin } as const;
export type AddressLabel = keyof typeof ADDRESS_LABELS;
